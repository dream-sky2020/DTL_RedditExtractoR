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
  Tag,
  Modal,
  Input,
} from 'antd';
import { toast } from '@components/Toast';
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
import { SceneRenderer } from '../../remotion/SceneRenderer';
import { dialogs } from '../../components/Dialogs';
import { useDslGlobalReplace } from '@hooks/useDslGlobalReplace';
import { useVideoStore } from '@/store';

// Components
import { Filmstrip } from './components/Filmstrip';
import { SceneHeader } from './components/SceneHeader';
import { MainPreview } from './components/MainPreview';
import { DslEditor } from '@components/DslEditor';

const { Text } = Typography;

export const StudioScenePage: React.FC<{
  initialSceneIdx?: number;
  onBack: () => void;
  onSceneChange?: (sceneIdx: number) => void;
}> = ({
  initialSceneIdx = 0,
  onBack,
  onSceneChange,
}) => {
  const {
    videoConfig,
    setVideoConfig,
  } = useVideoStore();
  const PREVIEW_MIN_HEIGHT = 280;
  const PREVIEW_MAX_HEIGHT_MARGIN = 180;
  const PREVIEW_DEFAULT_HEIGHT = 480;
  const PREVIEW_HEIGHT_STORAGE_KEY = 'redditextractor.studio-scene.preview-height.v1';

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
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [replaceFindText, setReplaceFindText] = useState('');
  const [replaceTargetText, setReplaceTargetText] = useState('');
  const [previewHeight, setPreviewHeight] = useState(() => {
    try {
      const cached = window.localStorage.getItem(PREVIEW_HEIGHT_STORAGE_KEY);
      if (!cached) return clampPreviewHeight(PREVIEW_DEFAULT_HEIGHT);
      const parsed = Number(cached);
      if (!Number.isFinite(parsed)) return clampPreviewHeight(PREVIEW_DEFAULT_HEIGHT);
      return clampPreviewHeight(parsed);
    } catch (err) {
      console.warn('读取主预览高度缓存失败:', err);
      return clampPreviewHeight(PREVIEW_DEFAULT_HEIGHT);
    }
  });

  useEffect(() => {
    setCurrentSceneIdx(initialSceneIdx);
  }, [initialSceneIdx]);
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
  const { getReplaceStats, applyGlobalReplace } = useDslGlobalReplace();
  const replaceStats = useMemo(
    () => getReplaceStats(scenes, replaceFindText),
    [scenes, replaceFindText, getReplaceStats],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 只有在没在输入框（除了 DSL 编辑器，或者根据焦点判断）时，或者使用了 Ctrl+Z
      // 注意：这里为了不破坏 DSL 编辑器自带的撤销，我们只在非编辑器焦点时或特定逻辑下处理全局撤销
      // 但对于“全局替换”这种 store 级别的操作，用户可能期望全局 Ctrl+Z 能生效

      const isEditing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          if (useVideoStore.getState().canRedo()) {
            useVideoStore.getState().redo();
            toast.info('已重做 (Redo)');
            return;
          }
        } else {
          // 如果正在编辑 DSL 且编辑器有自己的撤销栈，我们优先让 handleUndo 处理（如果已绑定快捷键）
          // 但目前 handleUndo 没绑定快捷键，所以我们这里可以逻辑分层
          if (useVideoStore.getState().canUndo()) {
            useVideoStore.getState().undo();
            toast.info('已撤销 (Undo)');
            return;
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        if (useVideoStore.getState().canRedo()) {
          useVideoStore.getState().redo();
          toast.info('已重做 (Redo)');
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSave = () => {
    const parsed = parseSceneDsl(dslText, currentScene || undefined);
    if (!parsed.ok) {
      toast.error(`解析失败: ${parsed.error}`);
      return false;
    }

    if (parsed.warnings.length > 0) {
      // 如果有警告，也可以保存，但给个提示
      toast.warning(`保存成功，但存在 ${parsed.warnings.length} 个建议。`);
    } else {
      toast.success('场景已保存');
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
    toast.info('已回退到最后一次保存的状态');
  };

  const handleResetDsl = () => {
    if (!currentScene) return;
    const originDsl = sceneToDsl(currentScene);
    setDslText(originDsl);
    setUndoStack([]);
    setRedoStack([]);
    toast.info('已重置为当前场景默认 DSL');
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

  const handleOpenGlobalReplace = (selectedText: string) => {
    if (hasUnsavedChanges) {
      toast.warning('请先保存或回退当前场景的修改，再执行全局替换。');
      return;
    }

    setReplaceFindText(selectedText || '');
    setReplaceTargetText('');
    setIsReplaceModalOpen(true);
  };

  const handleApplyGlobalReplace = () => {
    if (!replaceFindText) {
      toast.warning('请先输入要查找的文本。');
      return;
    }

    const result = applyGlobalReplace(scenes, replaceFindText, replaceTargetText);
    if (!result.ok || !result.nextScenes) {
      toast.error(result.error || '批量替换失败。');
      return;
    }

    setVideoConfig({ ...videoConfig, scenes: result.nextScenes });
    setIsReplaceModalOpen(false);
    setReplaceTargetText('');

    if (result.totalMatches === 0) {
      toast.info('未命中任何可替换文本。');
      return;
    }

    if (result.warningCount > 0) {
      toast.warning(`已替换 ${result.totalMatches} 处，影响 ${result.affectedSceneCount} 个场景（含 ${result.warningCount} 条解析建议）。`);
      return;
    }

    toast.success(`已替换 ${result.totalMatches} 处，影响 ${result.affectedSceneCount} 个场景。`);
  };

  const handlePreviewLayout = () => {
    try {
      const parseResult = parseSceneDsl(dslText, currentScene || undefined);
      if (!parseResult.ok) {
        toast.error(`解析失败: ${parseResult.error}`);
        return;
      }

      const previewScale = 0.6; // 预览缩放比例

      dialogs.info({
        title: '场景实时预览 (1:1 原始渲染)',
        width: 1000,
        content: (
          <div style={{
            marginTop: 16,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12
          }}>
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary">基于当前 DSL 实时渲染的画面（预览缩放 {previewScale * 100}%）：</Text>
            </div>

            <div style={{
              width: activeCanvas.width * previewScale,
              height: activeCanvas.height * previewScale,
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              border: '1px solid #d9d9d9',
              backgroundColor: '#000'
            }}>
              <div style={{
                width: activeCanvas.width,
                height: activeCanvas.height,
                transform: `scale(${previewScale})`,
                transformOrigin: 'top left',
                position: 'absolute',
                top: 0,
                left: 0
              }}>
                <SceneRenderer
                  scene={parseResult.scene}
                  frame={frameOffset}
                  fps={fps}
                  config={videoConfig}
                />
              </div>
            </div>

            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                提示：此预览使用与最终视频完全一致的渲染引擎。如果发现布局问题，请调整 DSL 中的 layout 或 style 标签。
              </Text>
            </div>
          </div>
        )
      });
    } catch (err) {
      console.error('预览布局失败:', err);
      toast.error('预览布局失败，请检查 DSL 语法是否正确。');
    }
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

  useEffect(() => {
    try {
      window.localStorage.setItem(PREVIEW_HEIGHT_STORAGE_KEY, String(previewHeight));
    } catch (err) {
      console.warn('保存主预览高度缓存失败:', err);
    }
  }, [previewHeight]);

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
    checkUnsavedAndContinue(() => {
      setCurrentSceneIdx(idx);
      onSceneChange?.(idx);
    });
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
            variant="borderless"
            extra={
              <Space size="middle">
                <Space>
                  <Text type="secondary">预览帧偏移</Text>
                  <Space.Compact>
                    <InputNumber
                      size="small"
                      min={0}
                      max={300}
                      value={frameOffset}
                      onChange={(val) => setFrameOffset(val || 0)}
                      style={{ width: 60 }}
                    />
                    <span style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      padding: '0 8px', 
                      background: '#f5f5f5', 
                      border: '1px solid #d9d9d9',
                      borderLeft: 0,
                      borderRadius: '0 4px 4px 0',
                      fontSize: '12px',
                      color: 'rgba(0,0,0,0.45)'
                    }}>帧</span>
                  </Space.Compact>
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
                  onOpenGlobalReplace={handleOpenGlobalReplace}
                  onPreviewLayout={handlePreviewLayout}
                />
              </div>
            </div>
          </Card>
        </Col>
      </Row>
      <Modal
        title="全局统一替换"
        open={isReplaceModalOpen}
        onCancel={() => setIsReplaceModalOpen(false)}
        onOk={handleApplyGlobalReplace}
        okText="应用替换"
        cancelText="取消"
        okButtonProps={{ disabled: !replaceFindText || replaceStats.totalMatches === 0 }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <div>
            <Text type="secondary">查找文本</Text>
            <Input.TextArea
              value={replaceFindText}
              onChange={(e) => setReplaceFindText(e.target.value)}
              autoSize={{ minRows: 2, maxRows: 6 }}
              placeholder="输入要全局替换的原文"
              style={{ marginTop: 6 }}
            />
          </div>
          <div>
            <Text type="secondary">替换为</Text>
            <Input.TextArea
              value={replaceTargetText}
              onChange={(e) => setReplaceTargetText(e.target.value)}
              autoSize={{ minRows: 2, maxRows: 6 }}
              placeholder="输入替换后的文本"
              style={{ marginTop: 6 }}
            />
          </div>
          <Text type="secondary">
            命中统计：共 {replaceStats.totalMatches} 处，涉及 {replaceStats.affectedSceneCount} 个场景。
          </Text>
        </Space>
      </Modal>
    </div>
  );
};

export default StudioScenePage;
