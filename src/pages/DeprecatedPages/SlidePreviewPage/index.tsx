import React, { useState, useMemo, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  Row,
  Col,
  Typography,
  Pagination,
  Empty,
  Tooltip,
  InputNumber,
  Divider,
  List,
  Image,
} from 'antd';
import {
  EditOutlined,
  LeftOutlined,
  RightOutlined,
  FileImageOutlined,
} from '@ant-design/icons';
import {
  VideoPreviewPlayer,
  DEFAULT_PREVIEW_FPS,
  getTotalFrames,
  getSceneStartFrame,
} from '../../../components/VideoPreviewPlayer';
import { VideoConfig } from '../../../types';
import { getActiveVideoCanvasSize, getAspectRatioLabel } from '../../../rendering/videoCanvas';

const { Text, Title } = Typography;

interface SlidePreviewPageProps {
  videoConfig: VideoConfig;
  onBackToEditor: () => void;
}

export const SlidePreviewPage: React.FC<SlidePreviewPageProps> = ({
  videoConfig,
  onBackToEditor,
}) => {
  const [currentSceneIdx, setCurrentSceneIdx] = useState(0);
  const [frameOffset, setFrameOffset] = useState(15);
  const [viewMode, setViewMode] = useState<'gallery' | 'detail'>('gallery');
  const [galleryPage, setGalleryPage] = useState(1);
  const [galleryPageSize, setGalleryPageSize] = useState(12);
  const FILMSTRIP_WINDOW = 3;
  const fps = DEFAULT_PREVIEW_FPS;
  const activeCanvas = getActiveVideoCanvasSize(videoConfig);
  const activeAspectRatioLabel = getAspectRatioLabel(activeCanvas.width, activeCanvas.height);

  const scenes = videoConfig.scenes;
  const hasScenes = scenes && scenes.length > 0;
  const currentScene = hasScenes ? scenes[currentSceneIdx] : null;

  // 计算特定场景在总视频中的起始帧位置
  const getSeekFrame = (idx: number) => {
    if (!hasScenes) return 0;
    return getSceneStartFrame(videoConfig, idx, fps) + frameOffset;
  };

  const seekFrame = useMemo(() => getSeekFrame(currentSceneIdx), [currentSceneIdx, scenes, hasScenes, frameOffset]);

  const totalFrames = getTotalFrames(videoConfig, fps);

  const isPortrait = activeCanvas.height > activeCanvas.width;

  const galleryStartIndex = (galleryPage - 1) * galleryPageSize;
  // ...
  const visibleGalleryScenes = useMemo(
    () =>
      scenes
        .slice(galleryStartIndex, galleryStartIndex + galleryPageSize)
        .map((scene, offset) => ({
          scene,
          sceneIdx: galleryStartIndex + offset,
        })),
    [scenes, galleryStartIndex, galleryPageSize]
  );
  // ... (下方的 Col 逻辑)

  const visibleFilmstripScenes = useMemo(() => {
    if (!hasScenes) return [];
    const start = Math.max(0, currentSceneIdx - FILMSTRIP_WINDOW);
    const end = Math.min(scenes.length - 1, currentSceneIdx + FILMSTRIP_WINDOW);
    const items: { sceneIdx: number; scene: typeof scenes[number] }[] = [];
    for (let i = start; i <= end; i += 1) {
      items.push({ sceneIdx: i, scene: scenes[i] });
    }
    return items;
  }, [hasScenes, scenes, currentSceneIdx]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(scenes.length / galleryPageSize));
    if (galleryPage > maxPage) {
      setGalleryPage(maxPage);
    }
  }, [scenes.length, galleryPage, galleryPageSize]);

  const nextScene = () => {
    if (currentSceneIdx < scenes.length - 1) {
      setCurrentSceneIdx(currentSceneIdx + 1);
    }
  };

  const prevScene = () => {
    if (currentSceneIdx > 0) {
      setCurrentSceneIdx(currentSceneIdx - 1);
    }
  };

  // 渲染单张画面的播放器组件（复用）
  const FramePlayer = ({ idx, isThumbnail = false }: { idx: number, isThumbnail?: boolean }) => (
    <div style={{
      background: 'var(--brand-dark)',
      borderRadius: isThumbnail ? 8 : 12,
      overflow: 'hidden',
      boxShadow: isThumbnail ? '0 2px 8px rgba(0,0,0,0.2)' : '0 10px 30px rgba(0,0,0,0.3)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      cursor: isThumbnail ? 'pointer' : 'default',
      border: isThumbnail && currentSceneIdx === idx ? '3px solid var(--slide-thumbnail-border)' : 'none'
    }}
      onClick={() => {
        if (isThumbnail) {
          setCurrentSceneIdx(idx);
          setViewMode('detail');
        }
      }}>
      <VideoPreviewPlayer
        videoConfig={videoConfig}
        durationInFrames={totalFrames}
        fps={fps}
        initialFrame={getSeekFrame(idx)}
        key={`scene-frame-${idx}-${frameOffset}`}
        style={{
          width: '100%',
          aspectRatio: `${activeCanvas.width} / ${activeCanvas.height}`,
        }}
        controls={false}
        autoPlay={false}
      />
    </div>
  );

  return (
    <div className="static-frame-page">
      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card
            title={
              <Space>
                <FileImageOutlined />
                <span>画面预览 ({viewMode === 'gallery' ? '图库模式' : '幻灯片模式'} · {activeAspectRatioLabel})</span>
              </Space>
            }
            className="panel-card"
            bordered={false}
            extra={
              <Space size="middle">
                {viewMode === 'detail' && (
                  <Button onClick={() => setViewMode('gallery')}>返回图库</Button>
                )}
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
                <Button onClick={onBackToEditor} icon={<EditOutlined />}>
                  返回修改
                </Button>
              </Space>
            }
          >
            {viewMode === 'gallery' ? (
              /* 图库模式：整齐的图片网格 */
              <div style={{ padding: '20px 0' }}>
                <Row gutter={[16, 16]}>
                  {visibleGalleryScenes.map(({ scene, sceneIdx }) => (
                    <Col
                      xs={24}
                      sm={isPortrait ? 12 : 12}
                      md={isPortrait ? 12 : 8}
                      lg={isPortrait ? 8 : 6}
                      xl={isPortrait ? 6 : 4}
                      xxl={isPortrait ? 4 : 3}
                      key={scene.id}
                    >
                      <div className="gallery-item-wrap">
                        <FramePlayer idx={sceneIdx} isThumbnail />
                        <div style={{ marginTop: 8, textAlign: 'center' }}>
                          <Text strong ellipsis style={{ width: '100%', display: 'block', fontSize: '12px' }}>
                            {sceneIdx + 1}. {scene.title || '未命名画面'}
                          </Text>
                        </div>
                      </div>
                    </Col>
                  ))}
                  {scenes.length === 0 && <Empty description="暂无画面格" />}
                </Row>
                {scenes.length > galleryPageSize && (
                  <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
                    <Pagination
                      current={galleryPage}
                      pageSize={galleryPageSize}
                      total={scenes.length}
                      onChange={(page, size) => {
                        setGalleryPage(page);
                        setGalleryPageSize(size || 12);
                      }}
                      showSizeChanger
                      pageSizeOptions={['12', '24', '36']}
                    />
                  </div>
                )}
              </div>
            ) : (
              /* 详情模式：大图 + 底部胶片栏 */
              <div className="detail-view-wrap">
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Title level={4} style={{ margin: 0 }}>
                      {currentScene ? `画面格 ${currentSceneIdx + 1}: ${currentScene.title}` : '暂无数据'}
                    </Title>
                    <Text type="secondary">
                      {currentScene ? `${currentScene.type === 'post' ? '原贴正文' : '评论内容'} • 时长 ${currentScene.duration}s` : ''}
                    </Text>
                  </div>

                  <Space>
                    <Tooltip title="快捷键: ←">
                      <Button
                        icon={<LeftOutlined />}
                        disabled={currentSceneIdx === 0}
                        onClick={prevScene}
                      >
                        上一个
                      </Button>
                    </Tooltip>
                    <span style={{ fontWeight: 'bold', minWidth: 60, textAlign: 'center' }}>{currentSceneIdx + 1} / {scenes.length}</span>
                    <Tooltip title="快捷键: →">
                      <Button
                        icon={<RightOutlined />}
                        disabled={currentSceneIdx === scenes.length - 1}
                        onClick={nextScene}
                      >
                        下一个
                      </Button>
                    </Tooltip>
                  </Space>
                </div>

                {hasScenes ? (
                  <FramePlayer idx={currentSceneIdx} />
                ) : (
                  <Empty description="无可预览的画面格" />
                )}

                {/* 底部胶片栏 (Filmstrip) */}
                <Divider orientation="left" plain style={{ marginTop: 40 }}>
                  <Text type="secondary">所有画面 (点击快速跳转)</Text>
                </Divider>
                <div style={{
                  display: 'flex',
                  overflowX: 'auto',
                  gap: 12,
                  padding: '10px 5px',
                  backgroundColor: 'var(--slide-filmstrip-bg)',
                  borderRadius: 12,
                  marginBottom: 20
                }}>
                  {visibleFilmstripScenes.map(({ scene, sceneIdx: idx }) => (
                    <div
                      key={`filmstrip-${scene.id}`}
                      style={{
                        flex: '0 0 160px',
                        opacity: currentSceneIdx === idx ? 1 : 0.6,
                        transition: 'all 0.3s'
                      }}
                    >
                      <FramePlayer idx={idx} isThumbnail />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};
