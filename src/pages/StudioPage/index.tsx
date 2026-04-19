import React, { useState, useMemo, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Pagination,
  Empty,
  Space,
  InputNumber,
  Divider,
  Button,
  Modal,
  message,
} from 'antd';
import {
  FileImageOutlined,
} from '@ant-design/icons';
import {
  VideoPreviewPlayer,
  DEFAULT_PREVIEW_FPS,
  getTotalFrames,
  getSceneStartFrame,
} from '../../components/VideoPreviewPlayer';
import { VideoConfig, ImageLayoutMode, SceneLayoutType, TitleAlignmentType } from '../../types';
import { getActiveVideoCanvasSize, getAspectRatioLabel } from '../../rendering/videoCanvas';
import { Sidebar } from './components/Sidebar';
import { AuthorProfile, CommentSortMode, ReplyOrderMode } from '../../utils/redditTransformer';

const { Text } = Typography;
type PreviewLayoutMode = 'auto' | 'fixed';

type ColorArrangementMode = 'uniform' | 'randomized';
interface ColorArrangementSettings {
  mode: ColorArrangementMode;
  hueOffset: number;
  hueStep: number;
  saturation: number;
  lightness: number;
  seed: number;
}

interface StudioPageProps {
  videoConfig: VideoConfig;
  setVideoConfig: (config: VideoConfig) => void;
  onViewScene?: (idx: number) => void;
  
  // From App.tsx (shared with EditorPage)
  commentSortMode: CommentSortMode;
  replyOrderMode: ReplyOrderMode;
  onApplyCommentSort: (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => void;
  onRandomizeAliasesAndApply: (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => void;
  onClearAliasesAndApply: (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => void;
  colorArrangement: ColorArrangementSettings;
  onRearrangeColorsAndApply: (
    sortMode: CommentSortMode,
    replyOrder: ReplyOrderMode,
    settings: ColorArrangementSettings,
  ) => void;
  canApplyCommentSort: boolean;
  allAuthors: string[];
  authorProfiles: Record<string, AuthorProfile>;
  onUpdateAuthorProfile: (author: string, updates: Partial<AuthorProfile>) => void;
  imageLayoutMode: ImageLayoutMode;
  setImageLayoutMode: (mode: ImageLayoutMode) => void;
  sceneLayout: SceneLayoutType;
  setSceneLayout: (layout: SceneLayoutType) => void;
  titleAlignment: TitleAlignmentType;
  setTitleAlignment: (alignment: TitleAlignmentType) => void;
  setAllSceneLayouts: (layout: 'top' | 'center') => void;
  addScene: () => void;
}

export const StudioPage: React.FC<StudioPageProps> = ({
  videoConfig,
  setVideoConfig,
  onViewScene,
  commentSortMode,
  replyOrderMode,
  onApplyCommentSort,
  onRandomizeAliasesAndApply,
  onClearAliasesAndApply,
  colorArrangement,
  onRearrangeColorsAndApply,
  canApplyCommentSort,
  allAuthors,
  authorProfiles,
  onUpdateAuthorProfile,
  imageLayoutMode,
  setImageLayoutMode,
  sceneLayout,
  setSceneLayout,
  titleAlignment,
  setTitleAlignment,
  setAllSceneLayouts,
  addScene,
}) => {
  // Resizable Sidebar Logic (Mimicking EditorPage)
  const DEFAULT_SIDEBAR_WIDTH = 420;
  const SIDEBAR_MIN_WIDTH = 300;
  const SIDEBAR_MAX_WIDTH = 760;
  const FIXED_SIDEBAR_TOP_OFFSET = 64;
  const clampSidebarWidth = (nextWidth: number): number => {
    const viewportMax =
      typeof window === 'undefined' ? SIDEBAR_MAX_WIDTH : Math.floor(window.innerWidth * 0.72);
    const maxAllowed = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, viewportMax));
    return Math.min(maxAllowed, Math.max(SIDEBAR_MIN_WIDTH, Math.round(nextWidth)));
  };

  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isSidebarResizing, setIsSidebarResizing] = useState(false);
  const sidebarResizeRef = React.useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    if (!isSidebarResizing) return;

    const handleMouseMove = (event: MouseEvent) => {
      const resizeSnapshot = sidebarResizeRef.current;
      if (!resizeSnapshot) return;
      const deltaX = resizeSnapshot.startX - event.clientX;
      const nextWidth = clampSidebarWidth(resizeSnapshot.startWidth + deltaX);
      setSidebarWidth(nextWidth);
    };

    const handleMouseUp = () => {
      setIsSidebarResizing(false);
      sidebarResizeRef.current = null;
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isSidebarResizing]);

  const startSidebarResize = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    sidebarResizeRef.current = {
      startX: event.clientX,
      startWidth: sidebarWidth,
    };
    setIsSidebarResizing(true);
  };

  const updateSidebarWidthByInput = (value: number | null) => {
    if (value == null || Number.isNaN(value)) return;
    setSidebarWidth(clampSidebarWidth(value));
  };

  const resetSidebarWidthToDefault = () => {
    Modal.confirm({
      title: '还原右侧面板宽度',
      content: `确认将右侧面板宽度还原为默认值 ${DEFAULT_SIDEBAR_WIDTH}px 吗？`,
      okText: '确认还原',
      cancelText: '取消',
      onOk: () => {
        setSidebarWidth(clampSidebarWidth(DEFAULT_SIDEBAR_WIDTH));
        message.success('右侧面板宽度已还原为默认值');
      },
    });
  };

  // Gallery Logic
  const [galleryPage, setGalleryPage] = useState(1);
  const [galleryPageSize, setGalleryPageSize] = useState(12);
  const [previewLayoutMode, setPreviewLayoutMode] = useState<PreviewLayoutMode>('auto');
  const [previewMinWidth, setPreviewMinWidth] = useState(280);
  const [frameOffset, setFrameOffset] = useState(15);
  
  const fps = DEFAULT_PREVIEW_FPS;
  const activeCanvas = getActiveVideoCanvasSize(videoConfig);
  const activeAspectRatioLabel = getAspectRatioLabel(activeCanvas.width, activeCanvas.height);
  const scenes = videoConfig.scenes;
  const hasScenes = scenes && scenes.length > 0;
  const totalFrames = getTotalFrames(videoConfig, fps);

  const galleryStartIndex = (galleryPage - 1) * galleryPageSize;
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

  const isPortrait = activeCanvas.height > activeCanvas.width;
  const autoGridMinWidth = Math.max(180, Math.min(520, previewMinWidth));

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(scenes.length / galleryPageSize));
    if (galleryPage > maxPage) {
      setGalleryPage(maxPage);
    }
  }, [scenes.length, galleryPage, galleryPageSize]);

  // 渲染单张画面的播放器组件
  const FramePlayer = ({ idx }: { idx: number }) => (
    <div 
      style={{ 
        background: 'var(--brand-dark)', 
        borderRadius: 8, 
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: onViewScene ? 'pointer' : 'default',
      }}
      onClick={() => onViewScene?.(idx)}
    >
      <VideoPreviewPlayer
        videoConfig={videoConfig}
        durationInFrames={totalFrames}
        fps={fps}
        initialFrame={getSceneStartFrame(videoConfig, idx, fps) + frameOffset}
        key={`studio-scene-${idx}-${frameOffset}`}
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
    <div id="studio-page-root" className="editor-page-container" style={{ position: 'relative' }}>
      <div id="studio-page-main-content" style={{ paddingRight: sidebarWidth + 24, paddingBottom: 40 }}>
        <Row gutter={[24, 24]}>
          <Col span={24}>
            <Card
              title={
                <Space>
                  <FileImageOutlined />
                  <span>图库预览 ({activeAspectRatioLabel})</span>
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
                </Space>
              }
            >
              <div style={{ padding: '20px 0' }}>
                {previewLayoutMode === 'auto' ? (
                  <>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(auto-fill, minmax(${autoGridMinWidth}px, 1fr))`,
                        gap: '16px 24px',
                        alignItems: 'start',
                      }}
                    >
                      {visibleGalleryScenes.map(({ scene, sceneIdx }) => (
                        <div key={scene.id} className="gallery-item-wrap">
                          <FramePlayer idx={sceneIdx} />
                          <div style={{ marginTop: 8, textAlign: 'center' }}>
                            <Text strong ellipsis style={{ width: '100%', display: 'block', fontSize: '12px' }}>
                              {sceneIdx + 1}. {scene.title || '未命名画面'}
                            </Text>
                          </div>
                        </div>
                      ))}
                    </div>
                    {!hasScenes && <Empty description="暂无画面格" />}
                  </>
                ) : (
                  <Row gutter={[16, 24]}>
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
                          <FramePlayer idx={sceneIdx} />
                          <div style={{ marginTop: 8, textAlign: 'center' }}>
                            <Text strong ellipsis style={{ width: '100%', display: 'block', fontSize: '12px' }}>
                              {sceneIdx + 1}. {scene.title || '未命名画面'}
                            </Text>
                          </div>
                        </div>
                      </Col>
                    ))}
                    {!hasScenes && <Empty description="暂无画面格" />}
                  </Row>
                )}
                
                {scenes.length > galleryPageSize && (
                  <div style={{ marginTop: 30, display: 'flex', justifyContent: 'center' }}>
                    <Pagination
                      current={galleryPage}
                      pageSize={galleryPageSize}
                      total={scenes.length}
                      onChange={(page, size) => {
                        setGalleryPage(page);
                        setGalleryPageSize(size || 12);
                      }}
                      showSizeChanger
                      pageSizeOptions={['12', '24', '36', '48']}
                    />
                  </div>
                )}
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      <Sidebar
        sidebarWidth={sidebarWidth}
        FIXED_SIDEBAR_TOP_OFFSET={FIXED_SIDEBAR_TOP_OFFSET}
        startSidebarResize={startSidebarResize}
        isSidebarResizing={isSidebarResizing}
        SIDEBAR_MIN_WIDTH={SIDEBAR_MIN_WIDTH}
        SIDEBAR_MAX_WIDTH={SIDEBAR_MAX_WIDTH}
        updateSidebarWidthByInput={updateSidebarWidthByInput}
        resetSidebarWidthToDefault={resetSidebarWidthToDefault}
        videoConfig={videoConfig}
        setVideoConfig={setVideoConfig}
        commentSortMode={commentSortMode}
        replyOrderMode={replyOrderMode}
        imageLayoutMode={imageLayoutMode}
        setImageLayoutMode={setImageLayoutMode}
        sceneLayout={sceneLayout}
        setSceneLayout={setSceneLayout}
        titleAlignment={titleAlignment}
        setTitleAlignment={setTitleAlignment}
        canApplyCommentSort={canApplyCommentSort}
        onApplyCommentSort={onApplyCommentSort}
        allAuthors={allAuthors}
        onRandomizeAliasesAndApply={onRandomizeAliasesAndApply}
        onClearAliasesAndApply={onClearAliasesAndApply}
        colorArrangement={colorArrangement}
        onRearrangeColorsAndApply={onRearrangeColorsAndApply}
        authorProfiles={authorProfiles}
        onUpdateAuthorProfile={onUpdateAuthorProfile}
        setAllSceneLayouts={setAllSceneLayouts}
        addScene={addScene}
        galleryPageSize={galleryPageSize}
        setGalleryPageSize={setGalleryPageSize}
        previewLayoutMode={previewLayoutMode}
        setPreviewLayoutMode={setPreviewLayoutMode}
        previewMinWidth={previewMinWidth}
        setPreviewMinWidth={setPreviewMinWidth}
      />
    </div>
  );
};

export default StudioPage;
