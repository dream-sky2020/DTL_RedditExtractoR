import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Card,
  Space,
  Row,
  Col,
  Typography,
  Divider,
  InputNumber,
  Button,
  message,
  Tag,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import {
  DEFAULT_PREVIEW_FPS,
  getTotalFrames,
  getSceneStartFrame,
} from '../../components/VideoPreviewPlayer';
import { VideoConfig, VideoScene } from '../../types';
import { getActiveVideoCanvasSize, getAspectRatioLabel } from '../../rendering/videoCanvas';
import { sceneToDsl, parseSceneDsl } from '../../rendering/sceneDsl';
import { dialogs } from '../../components/Dialogs';

// Components
import { Filmstrip } from './components/Filmstrip';
import { SceneHeader } from './components/SceneHeader';
import { MainPreview } from './components/MainPreview';
import { DslEditor } from '../../components/DslEditor';

const { Text } = Typography;

interface StudioScenePageProps {
  videoConfig: VideoConfig;
  setVideoConfig: (config: VideoConfig) => void;
  initialSceneIdx?: number;
  onBack: () => void;
}

export const StudioScenePage: React.FC<StudioScenePageProps> = ({
  videoConfig,
  setVideoConfig,
  initialSceneIdx = 0,
  onBack,
}) => {
  const PREVIEW_MIN_HEIGHT = 280;
  const PREVIEW_MAX_HEIGHT_MARGIN = 180;
  const PREVIEW_DEFAULT_HEIGHT = 480;

  const getPreviewMaxHeight = () => Math.max(PREVIEW_MIN_HEIGHT + 40, window.innerHeight - PREVIEW_MAX_HEIGHT_MARGIN);
  const clampPreviewHeight = (height: number) => {
    const maxHeight = getPreviewMaxHeight();
    return Math.max(PREVIEW_MIN_HEIGHT, Math.min(maxHeight, Math.round(height)));
  };

  const [currentSceneIdx, setCurrentSceneIdx] = useState(initialSceneIdx);
  const [frameOffset, setFrameOffset] = useState(15);
  const [dslText, setDslText] = useState('');
  const [lastSavedDsl, setLastSavedDsl] = useState('');
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [previewHeight, setPreviewHeight] = useState(() => clampPreviewHeight(PREVIEW_DEFAULT_HEIGHT));
  const [isPreviewResizing, setIsPreviewResizing] = useState(false);
  const previewResizeRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const FILMSTRIP_WINDOW = 10;
  const fps = DEFAULT_PREVIEW_FPS;
  const activeCanvas = getActiveVideoCanvasSize(videoConfig);
  const activeAspectRatioLabel = getAspectRatioLabel(activeCanvas.width, activeCanvas.height);

  const scenes = videoConfig.scenes;
  const hasScenes = scenes && scenes.length > 0;
  const currentScene = hasScenes ? scenes[currentSceneIdx] : null;

  // 当场景切换时，更新 DSL 文本
  useEffect(() => {
    if (currentScene) {
      const dsl = sceneToDsl(currentScene);
      setDslText(dsl);
      setLastSavedDsl(dsl);
      setUndoStack([]);
      setRedoStack([]);
    }
  }, [currentSceneIdx, videoConfig]);

  const hasUnsavedChanges = dslText !== lastSavedDsl;
  const previewMaxHeight = getPreviewMaxHeight();

  const handleSave = () => {
    const parsed = parseSceneDsl(dslText, currentScene || undefined);
    if (!parsed.ok) {
      message.error(`解析失败: ${parsed.error}`);
      return false;
    }

    if (parsed.warnings.length > 0) {
      // 如果有警告，也可以保存，但给个提示
      message.warning(`保存成功，但存在 ${parsed.warnings.length} 个建议。`);
    } else {
      message.success('场景已保存');
    }

    const nextScenes = [...scenes];
    nextScenes[currentSceneIdx] = parsed.scene;
    setVideoConfig({ ...videoConfig, scenes: nextScenes });
    setLastSavedDsl(dslText);
    return true;
  };

  const handleRollback = () => {
    setDslText(lastSavedDsl);
    setUndoStack([]);
    setRedoStack([]);
    message.info('已回退到最后一次保存的状态');
  };

  const handleResetDsl = () => {
    if (!currentScene) return;
    const originDsl = sceneToDsl(currentScene);
    setDslText(originDsl);
    setUndoStack([]);
    setRedoStack([]);
    message.info('已重置为当前场景默认 DSL');
  };

  const handleDslChange = (nextText: string) => {
    setDslText((prevText) => {
      if (prevText === nextText) return prevText;
      setUndoStack((prevUndo) => [...prevUndo, prevText].slice(-100));
      setRedoStack([]);
      return nextText;
    });
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const nextText = undoStack[undoStack.length - 1];
    setUndoStack((prevUndo) => prevUndo.slice(0, -1));
    setRedoStack((prevRedo) => [dslText, ...prevRedo].slice(0, 100));
    setDslText(nextText);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const nextText = redoStack[0];
    setRedoStack((prevRedo) => prevRedo.slice(1));
    setUndoStack((prevUndo) => [...prevUndo, dslText].slice(-100));
    setDslText(nextText);
  };

  const updatePreviewHeightByInput = (value: number | null) => {
    if (value == null) return;
    setPreviewHeight(clampPreviewHeight(value));
  };

  const resetPreviewHeight = () => {
    setPreviewHeight(clampPreviewHeight(PREVIEW_DEFAULT_HEIGHT));
  };

  const startPreviewResize = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    previewResizeRef.current = {
      startY: event.clientY,
      startHeight: previewHeight,
    };
    setIsPreviewResizing(true);
  };

  useEffect(() => {
    if (!isPreviewResizing) return;

    const handleMouseMove = (event: MouseEvent) => {
      const resizeState = previewResizeRef.current;
      if (!resizeState) return;
      const deltaY = event.clientY - resizeState.startY;
      setPreviewHeight(clampPreviewHeight(resizeState.startHeight + deltaY));
    };

    const handleMouseUp = () => {
      setIsPreviewResizing(false);
      previewResizeRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPreviewResizing]);

  useEffect(() => {
    const handleWindowResize = () => {
      setPreviewHeight((prev) => clampPreviewHeight(prev));
    };
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  const checkUnsavedAndContinue = (action: () => void) => {
    if (hasUnsavedChanges) {
      dialogs.confirm({
        title: '是否保存修改？',
        content: '当前场景的 DSL 脚本已有修改，是否在离开前保存？',
        okText: '保存并继续',
        cancelText: '放弃修改',
        onOk: () => {
          if (handleSave()) {
            action();
          }
        },
        onCancel: () => {
          action();
        }
      });
    } else {
      action();
    }
  };

  const handleBack = () => {
    checkUnsavedAndContinue(onBack);
  };

  const handleSceneSelect = (idx: number) => {
    if (idx === currentSceneIdx) return;
    checkUnsavedAndContinue(() => setCurrentSceneIdx(idx));
  };

  const getSeekFrame = (idx: number) => {
    if (!hasScenes) return 0;
    return getSceneStartFrame(videoConfig, idx, fps) + frameOffset;
  };

  const totalFrames = getTotalFrames(videoConfig, fps);

  const visibleFilmstripScenes = useMemo(() => {
    if (!hasScenes) return [];
    const start = Math.max(0, currentSceneIdx - FILMSTRIP_WINDOW);
    const end = Math.min(scenes.length - 1, currentSceneIdx + FILMSTRIP_WINDOW);
    const items: { sceneIdx: number; scene: VideoScene }[] = [];
    for (let i = start; i <= end; i += 1) {
      items.push({ sceneIdx: i, scene: scenes[i] });
    }
    return items;
  }, [hasScenes, scenes, currentSceneIdx]);

  const nextScene = () => {
    if (currentSceneIdx < scenes.length - 1) {
      handleSceneSelect(currentSceneIdx + 1);
    }
  };

  const prevScene = () => {
    if (currentSceneIdx > 0) {
      handleSceneSelect(currentSceneIdx - 1);
    }
  };

  return (
    <div className="studio-scene-page">
      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card
            title={
              <Space>
                <ArrowLeftOutlined onClick={handleBack} style={{ cursor: 'pointer', marginRight: 8 }} />
                <span>场景切片浏览 · {activeAspectRatioLabel}</span>
              </Space>
            }
            className="panel-card"
            bordered={false}
            extra={
              <Space size="middle">
                <Space>
                  <Text type="secondary">预览帧偏移</Text>
                  <InputNumber
                    size="small"
                    min={0}
                    max={300}
                    value={frameOffset}
                    onChange={(val) => setFrameOffset(val || 0)}
                    addonAfter="帧"
                    style={{ width: 100 }}
                  />
                </Space>
                <Divider type="vertical" />
                <Space>
                  <Button
                    size="small"
                    icon={<RollbackOutlined />}
                    disabled={!hasUnsavedChanges}
                    onClick={handleRollback}
                  >
                    回退
                  </Button>
                  <Button
                    size="small"
                    type="primary"
                    icon={<SaveOutlined />}
                    disabled={!hasUnsavedChanges}
                    onClick={handleSave}
                  >
                    保存
                  </Button>
                </Space>
              </Space>
            }
          >
            <div className="detail-view-wrap">
              {/* 顶部胶片栏 (Filmstrip) */}
              <Filmstrip
                videoConfig={videoConfig}
                scenes={scenes}
                currentSceneIdx={currentSceneIdx}
                visibleScenes={visibleFilmstripScenes}
                totalFrames={totalFrames}
                fps={fps}
                canvasWidth={activeCanvas.width}
                canvasHeight={activeCanvas.height}
                getSeekFrame={getSeekFrame}
                onSceneSelect={handleSceneSelect}
              />

              {/* 场景头部 (标题与导航) */}
              <SceneHeader
                currentScene={currentScene}
                currentSceneIdx={currentSceneIdx}
                totalScenes={scenes.length}
                onPrev={prevScene}
                onNext={nextScene}
              />

              {/* 主预览区 */}
              <MainPreview
                hasScenes={hasScenes}
                videoConfig={videoConfig}
                totalFrames={totalFrames}
                fps={fps}
                seekFrame={getSeekFrame(currentSceneIdx)}
                canvasWidth={activeCanvas.width}
                canvasHeight={activeCanvas.height}
                currentSceneIdx={currentSceneIdx}
                previewHeight={previewHeight}
                previewMinHeight={PREVIEW_MIN_HEIGHT}
                previewMaxHeight={previewMaxHeight}
                isPreviewResizing={isPreviewResizing}
                onPreviewHeightInputChange={updatePreviewHeightByInput}
                onPreviewHeightReset={resetPreviewHeight}
                onPreviewResizeStart={startPreviewResize}
              />

              {/* DSL 编辑器区域 */}
              <div style={{ marginTop: 32 }}>
                <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space>
                    <Text strong>场景 DSL 编辑器</Text>
                    {hasUnsavedChanges && <Tag color="orange">已修改未保存</Tag>}
                  </Space>
                  <Space>
                    <Button size="small" onClick={handleUndo} disabled={undoStack.length === 0}>
                      撤销
                    </Button>
                    <Button size="small" onClick={handleRedo} disabled={redoStack.length === 0}>
                      重做
                    </Button>
                    <Button size="small" onClick={handleResetDsl} disabled={!hasScenes}>
                      重置
                    </Button>
                    <Button size="small" onClick={handleRollback} disabled={!hasUnsavedChanges}>
                      回退
                    </Button>
                    <Button size="small" type="primary" onClick={handleSave} disabled={!hasUnsavedChanges}>
                      保存
                    </Button>
                  </Space>
                </div>
                <DslEditor
                  value={dslText}
                  onChange={handleDslChange}
                  rows={12}
                  placeholder="编辑当前场景的 DSL 脚本..."
                />
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default StudioScenePage;
