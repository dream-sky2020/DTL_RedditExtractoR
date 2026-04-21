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
import { VideoConfig, VideoScene, ImageLayoutMode, SceneLayoutType, TitleAlignmentType } from '../../types';
import { getActiveVideoCanvasSize, getAspectRatioLabel } from '../../rendering/videoCanvas';
import { VideoSettingsSidebar } from 'VideoSettingsSidebarComponent_panel_compont';
import { AuthorProfile, CommentSortMode, ReplyOrderMode, ColorArrangementSettings } from '../../types';
import { useSidebarResize } from '@hooks/useSidebarResize';
import { useVideoSettings } from '@hooks/useVideoSettings';

const { Text } = Typography;
type PreviewLayoutMode = 'auto' | 'fixed';

interface StudioPageProps {
  videoConfig: VideoConfig;
  setVideoConfig: (config: VideoConfig) => void;
  draftConfig: VideoConfig;
  setDraftConfig: (config: VideoConfig) => void;
  persistVideoConfig: (config: VideoConfig) => void;
  onViewScene?: (idx: number) => void;
  
  commentSortMode: CommentSortMode;
  setCommentSortMode: React.Dispatch<React.SetStateAction<CommentSortMode>>;
  replyOrderMode: ReplyOrderMode;
  setReplyOrderMode: React.Dispatch<React.SetStateAction<ReplyOrderMode>>;
  
  rawResult: any;
  result: any;
  setResult: React.Dispatch<React.SetStateAction<any>>;
  
  colorArrangement: ColorArrangementSettings;
  setColorArrangement: React.Dispatch<React.SetStateAction<ColorArrangementSettings>>;
  
  allAuthors: string[];
  authorProfiles: Record<string, AuthorProfile>;
  setAuthorProfiles: React.Dispatch<React.SetStateAction<Record<string, AuthorProfile>>>;
  persistAuthorProfiles: (profiles: Record<string, AuthorProfile>) => void;
  
  imageLayoutMode: ImageLayoutMode;
  setImageLayoutMode: (mode: ImageLayoutMode) => void;
  sceneLayout: SceneLayoutType;
  setSceneLayout: (layout: SceneLayoutType) => void;
  titleAlignment: TitleAlignmentType;
  setTitleAlignment: (alignment: TitleAlignmentType) => void;
  titleFontSize: number;
  setTitleFontSize: (size: number) => void;
  contentFontSize: number;
  setContentFontSize: (size: number) => void;
  quoteFontSize: number;
  setQuoteFontSize: (size: number) => void;
  maxQuoteDepth: number;
  setMaxQuoteDepth: (depth: number) => void;
  defaultQuoteMaxLimit: number;
  setDefaultQuoteMaxLimit: (limit: number) => void;
  sceneBackgroundColor: string;
  setSceneBackgroundColor: (color: string) => void;
  itemBackgroundColor: string;
  setItemBackgroundColor: (color: string) => void;
  quoteBackgroundColor: string;
  setQuoteBackgroundColor: (color: string) => void;
  quoteBorderColor: string;
  setQuoteBorderColor: (color: string) => void;
}

export const StudioPage: React.FC<StudioPageProps> = (props) => {
  const {
    videoConfig,
    onViewScene,
    commentSortMode,
    rawResult,
    colorArrangement,
    setColorArrangement,
    allAuthors,
    authorProfiles,
    imageLayoutMode,
    sceneLayout,
    titleAlignment,
    titleFontSize,
    contentFontSize,
    quoteFontSize,
    maxQuoteDepth,
    defaultQuoteMaxLimit,
    sceneBackgroundColor,
    itemBackgroundColor,
    quoteBackgroundColor,
    quoteBorderColor,
  } = props;

  // 使用自定义 Hook 处理视频设置逻辑
  const videoSettingsHandlers = useVideoSettings({
    ...props,
    setCommentSortMode: props.setCommentSortMode,
    setReplyOrderMode: props.setReplyOrderMode,
  });

  // ---------------------------------------------------------
  // 原有的组件逻辑
  // ---------------------------------------------------------
  const FIXED_SIDEBAR_TOP_OFFSET = 64;
  const {
    sidebarWidth,
    isSidebarResizing,
    startSidebarResize,
    updateSidebarWidthByInput,
    resetSidebarWidthToDefault,
    constants: { SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH }
  } = useSidebarResize({ defaultWidth: 420, minWidth: 300, maxWidth: 760 });

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

      <VideoSettingsSidebar
        mode="studio"
        sidebarWidth={sidebarWidth}
        SIDEBAR_MIN_WIDTH={SIDEBAR_MIN_WIDTH}
        SIDEBAR_MAX_WIDTH={SIDEBAR_MAX_WIDTH}
        FIXED_SIDEBAR_TOP_OFFSET={FIXED_SIDEBAR_TOP_OFFSET}
        isSidebarResizing={isSidebarResizing}
        startSidebarResize={startSidebarResize}
        updateSidebarWidthByInput={updateSidebarWidthByInput}
        resetSidebarWidthToDefault={resetSidebarWidthToDefault}
        toolTitle="Studio 操作面板"
        draftConfig={videoConfig}
        setDraftConfig={props.setVideoConfig}
        commentSortMode={props.commentSortMode}
        replyOrderMode={props.replyOrderMode}
        imageLayoutMode={imageLayoutMode}
        sceneLayout={sceneLayout}
        titleAlignment={titleAlignment}
        titleFontSize={titleFontSize}
        contentFontSize={contentFontSize}
        quoteFontSize={quoteFontSize}
        maxQuoteDepth={maxQuoteDepth}
        defaultQuoteMaxLimit={defaultQuoteMaxLimit}
        sceneBackgroundColor={sceneBackgroundColor}
        itemBackgroundColor={itemBackgroundColor}
        quoteBackgroundColor={quoteBackgroundColor}
        quoteBorderColor={quoteBorderColor}
        onApplyCommentSort={videoSettingsHandlers.handleApplyCommentSort}
        onRandomizeAliasesAndApply={videoSettingsHandlers.handleRandomizeAliasesAndApply}
        onClearAliasesAndApply={videoSettingsHandlers.handleClearAliasesAndApply}
        onRearrangeColorsAndApply={videoSettingsHandlers.handleRearrangeColorsAndApply}
        onUpdateAuthorProfile={videoSettingsHandlers.updateAuthorProfile}
        onImageLayoutModeChange={videoSettingsHandlers.handleImageLayoutModeChange}
        onSceneLayoutChange={videoSettingsHandlers.handleSceneLayoutChange}
        onTitleAlignmentChange={videoSettingsHandlers.handleTitleAlignmentChange}
        onTitleFontSizeChange={videoSettingsHandlers.handleTitleFontSizeChange}
        onContentFontSizeChange={videoSettingsHandlers.handleContentFontSizeChange}
        onQuoteFontSizeChange={videoSettingsHandlers.handleQuoteFontSizeChange}
        onMaxQuoteDepthChange={videoSettingsHandlers.handleMaxQuoteDepthChange}
        onDefaultQuoteMaxLimitChange={videoSettingsHandlers.handleDefaultQuoteMaxLimitChange}
        onSceneBackgroundColorChange={videoSettingsHandlers.handleSceneBackgroundColorChange}
        onItemBackgroundColorChange={videoSettingsHandlers.handleItemBackgroundColorChange}
        onQuoteBackgroundColorChange={videoSettingsHandlers.handleQuoteBackgroundColorChange}
        onQuoteBorderColorChange={videoSettingsHandlers.handleQuoteBorderColorChange}
        onSetAllSceneLayouts={videoSettingsHandlers.setAllSceneLayouts}
        onAddScene={videoSettingsHandlers.addScene}
        canApplyCommentSort={!!rawResult}
        allAuthors={allAuthors}
        authorProfiles={authorProfiles}
        colorArrangement={colorArrangement}
        setColorArrangement={setColorArrangement}
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
