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
  Tag,
} from 'antd';
import { toast } from '@components/Toast';
import {
  FileImageOutlined,
} from '@ant-design/icons';
import {
  DEFAULT_PREVIEW_FPS,
  getTotalFrames,
} from '../../components/VideoPreviewPlayer';
import { getActiveVideoCanvasSize, getAspectRatioLabel } from '../../rendering/videoCanvas';
import { VideoSettingsSidebar } from 'VideoSettingsSidebarComponent_panel_compont';
import { useSidebarResize } from '@hooks/useSidebarResize';
import { useVideoSettings } from '@hooks/useVideoSettings';
import { useSceneDeletion } from '@hooks/useSceneDeletion';
import { useDslTranslate } from '@hooks/useDslTranslate';
import { dialogs } from '@components/Dialogs';
import { StudioFramePlayer } from '../../components/StudioFramePlayer';
import { useRedditStore, useSettingsStore, useVideoStore } from '@/store';
import { AUTHOR_PROFILES_STORAGE_KEY } from '@/constants/storage';

const { Text } = Typography;
type PreviewLayoutMode = 'auto' | 'fixed';

const interpolateColor = (start: [number, number, number], end: [number, number, number], ratio: number) => {
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  const [r, g, b] = start.map((channel, index) =>
    Math.round(channel + (end[index] - channel) * clampedRatio)
  );
  return `rgb(${r}, ${g}, ${b})`;
};

const formatDurationLabel = (duration: number) => {
  const normalizedDuration = Number.isFinite(duration) ? duration : 0;
  return Number.isInteger(normalizedDuration)
    ? `[${normalizedDuration}s]`
    : `[${normalizedDuration.toFixed(1)}s]`;
};

export const StudioPage: React.FC<{ onViewScene?: (idx: number) => void }> = ({ onViewScene }) => {
  const {
    videoConfig,
    setVideoConfig,
  } = useVideoStore();

  const {
    commentSortMode, setCommentSortMode, replyOrderMode, setReplyOrderMode,
    imageLayoutMode, setImageLayoutMode, sceneLayout, setSceneLayout,
    titleAlignment, setTitleAlignment, titleFontSize, setTitleFontSize,
    contentFontSize, setContentFontSize, quoteFontSize, setQuoteFontSize,
    titleFontColor, setTitleFontColor, contentFontColor, setContentFontColor,
    quoteFontColor, setQuoteFontColor, titleFontBold, setTitleFontBold,
    contentFontBold, setContentFontBold,
    maxQuoteDepth, setMaxQuoteDepth, defaultQuoteMaxLimit, setDefaultQuoteMaxLimit,
    sceneBackgroundColor, setSceneBackgroundColor, 
    sceneBackgroundColorEnd, setSceneBackgroundColorEnd,
    sceneBackgroundGradientMode, setSceneBackgroundGradientMode,
    itemBackgroundColor, setItemBackgroundColor,
    itemBackgroundColorEnd, setItemBackgroundColorEnd,
    itemBackgroundGradientMode, setItemBackgroundGradientMode,
    quoteBackgroundColor, setQuoteBackgroundColor, quoteBorderColor, setQuoteBorderColor,
    avatarSize, setAvatarSize, avatarShape, setAvatarShape, avatarOffset, setAvatarOffset,
    colorArrangement, setColorArrangement,
    sceneDisplayMode,
    editorUiSettings,
    setStudioUiSettings,
  } = useSettingsStore();

  const {
    rawResult,
    result,
    setResult,
    allAuthors,
    authorProfiles,
    setAuthorProfiles,
  } = useRedditStore();

  // 使用自定义 Hook 处理视频设置逻辑
  const videoSettingsHandlers = useVideoSettings({
    videoConfig, setVideoConfig,
    commentSortMode, setCommentSortMode, replyOrderMode, setReplyOrderMode,
    rawResult, setResult, colorArrangement, setColorArrangement,
    allAuthors, authorProfiles, setAuthorProfiles, 
    persistAuthorProfiles: (p) => {
      setAuthorProfiles(p);
      localStorage.setItem(AUTHOR_PROFILES_STORAGE_KEY, JSON.stringify(p));
    },
    setImageLayoutMode, setSceneLayout, setTitleAlignment, setTitleFontSize,
    setContentFontSize, setQuoteFontSize, 
    setTitleFontColor, setContentFontColor, setQuoteFontColor,
    setTitleFontBold, setContentFontBold,
    setMaxQuoteDepth, setDefaultQuoteMaxLimit,
    setSceneBackgroundColor, setSceneBackgroundColorEnd, setSceneBackgroundGradientMode,
    setItemBackgroundColor, setItemBackgroundColorEnd, setItemBackgroundGradientMode,
    setQuoteBackgroundColor, setQuoteBorderColor,
    setAvatarSize, setAvatarShape, setAvatarOffset,
    titleAlignment, titleFontSize, contentFontSize, quoteFontSize,
    titleFontColor, contentFontColor, quoteFontColor,
    avatarSize, avatarShape, avatarOffset,
    titleFontBold, contentFontBold,
    maxQuoteDepth, defaultQuoteMaxLimit, 
    sceneBackgroundColor, sceneBackgroundColorEnd, sceneBackgroundGradientMode,
    itemBackgroundColor, itemBackgroundColorEnd, itemBackgroundGradientMode,
    quoteBackgroundColor, quoteBorderColor
  });

  const {
    extractChunks,
    applyTranslations
  } = useDslTranslate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          if (useVideoStore.getState().canRedo()) {
            useVideoStore.getState().redo();
            toast.info('已重做 (Redo)');
          }
        } else {
          if (useVideoStore.getState().canUndo()) {
            useVideoStore.getState().undo();
            toast.info('已撤销 (Undo)');
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        if (useVideoStore.getState().canRedo()) {
          useVideoStore.getState().redo();
          toast.info('已重做 (Redo)');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenTranslationModal = () => {
    const selectedScenes = videoConfig.scenes.filter(s => selectedSceneIds.includes(s.id));
    const { chunks, initialValue } = extractChunks(selectedScenes);
    
    dialogs.showTranslateHelper({
      chunks,
      initialValue,
      onOk: (value) => handleApplyTranslate(chunks, value)
    });
  };

  const handleApplyTranslate = (chunks: any[], value: string) => {
    const result = applyTranslations(videoConfig.scenes, value, chunks);
    if (result.ok && result.nextScenes) {
      setVideoConfig({ ...videoConfig, scenes: result.nextScenes });
      toast.success(`已完成全局翻译应用：替换了 ${result.totalReplacements} 处文本，涉及 ${result.affectedScenes} 个场景。`);
    } else if (result.error) {
      toast.error(result.error);
    }
  };

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
  const {
    galleryPage,
    galleryPageSize,
    previewLayoutMode,
    previewMinWidth,
    frameOffset,
  } = editorUiSettings.studio;
  const setGalleryPage = (page: number) => setStudioUiSettings({ galleryPage: page });
  const setGalleryPageSize = (size: number) => setStudioUiSettings({ galleryPageSize: size });
  const setPreviewLayoutMode = (mode: PreviewLayoutMode) => setStudioUiSettings({ previewLayoutMode: mode });
  const setPreviewMinWidth = (width: number) => setStudioUiSettings({ previewMinWidth: width });
  const setFrameOffset = (offset: number) => setStudioUiSettings({ frameOffset: offset });
  
  // Multi-select Logic
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedSceneIds, setSelectedSceneIds] = useState<string[]>([]);
  
  const { removeSelectedScenes } = useSceneDeletion({
    selectedSceneIds,
    setSelectedSceneIds,
  });
  
  const fps = DEFAULT_PREVIEW_FPS;
  const activeCanvas = getActiveVideoCanvasSize(videoConfig);
  const activeAspectRatioLabel = getAspectRatioLabel(activeCanvas.width, activeCanvas.height);
  const scenes = videoConfig.scenes;
  const hasScenes = scenes && scenes.length > 0;
  const totalFrames = getTotalFrames(videoConfig, fps);

  const isCompact = sceneDisplayMode === 'compact';
  const sceneDurationRange = useMemo(() => {
    const durations = scenes.map((scene) => scene.duration).filter(Number.isFinite);
    return {
      min: durations.length ? Math.min(...durations) : 0,
      max: durations.length ? Math.max(...durations) : 0,
    };
  }, [scenes]);

  const getDurationColor = (duration: number) => {
    const { min, max } = sceneDurationRange;
    const ratio = max > min ? (duration - min) / (max - min) : 0;
    return interpolateColor([126, 203, 255], [168, 7, 26], ratio);
  };

  const renderSceneCaption = (scene: typeof scenes[number], sceneIdx: number) => {
    const isSelected = selectedSceneIds.includes(scene.id);

    return (
      <div style={{ marginTop: 8, textAlign: 'center' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            minWidth: 0,
          }}
        >
          <Text strong ellipsis style={{
            minWidth: 0,
            fontSize: '12px',
            color: isSelected ? 'var(--ant-primary-color)' : 'inherit'
          }}>
            {sceneIdx + 1}. {scene.title || '未命名画面'}
          </Text>
          <span
            style={{
              flex: '0 0 auto',
              fontSize: '12px',
              fontWeight: 700,
              color: getDurationColor(scene.duration),
            }}
          >
            {formatDurationLabel(scene.duration)}
          </span>
        </div>
      </div>
    );
  };

  useEffect(() => {
    const maxGalleryPage = Math.max(1, Math.ceil(scenes.length / galleryPageSize));
    const nextGalleryPage = Math.min(Math.max(galleryPage, 1), maxGalleryPage);

    if (nextGalleryPage !== galleryPage) {
      setStudioUiSettings({ galleryPage: nextGalleryPage });
    }
  }, [galleryPage, galleryPageSize, scenes.length, setStudioUiSettings]);

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
  const autoGridMinWidth = isCompact ? 160 : Math.max(180, Math.min(520, previewMinWidth));

  // 当 videoConfig.scenes 发生变化时，清理掉已经不存在的选中 ID
  useEffect(() => {
    setSelectedSceneIds(prev => prev.filter(id => videoConfig.scenes.some(s => s.id === id)));
  }, [videoConfig.scenes]);

  // 当关闭多选模式时，清空选中项
  useEffect(() => {
    if (!isMultiSelectMode) {
      setSelectedSceneIds([]);
    }
  }, [isMultiSelectMode]);

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
                  {isMultiSelectMode && <Tag color="blue">多选模式已开启</Tag>}
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
                          <StudioFramePlayer 
                            idx={sceneIdx} 
                            isSelected={selectedSceneIds.includes(scene.id)} 
                            selectionIndex={selectedSceneIds.indexOf(scene.id) + 1}
                            isCompact={isCompact}
                            videoConfig={videoConfig}
                            totalFrames={totalFrames}
                            fps={fps}
                            frameOffset={frameOffset}
                            activeCanvas={activeCanvas}
                            isMultiSelectMode={isMultiSelectMode}
                            onViewScene={onViewScene}
                            setSelectedSceneIds={setSelectedSceneIds}
                            scenes={scenes}
                          />
                          {!isCompact && renderSceneCaption(scene, sceneIdx)}
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
                          <StudioFramePlayer 
                            idx={sceneIdx} 
                            isSelected={selectedSceneIds.includes(scene.id)} 
                            selectionIndex={selectedSceneIds.indexOf(scene.id) + 1}
                            isCompact={isCompact}
                            videoConfig={videoConfig}
                            totalFrames={totalFrames}
                            fps={fps}
                            frameOffset={frameOffset}
                            activeCanvas={activeCanvas}
                            isMultiSelectMode={isMultiSelectMode}
                            onViewScene={onViewScene}
                            setSelectedSceneIds={setSelectedSceneIds}
                            scenes={scenes}
                          />
                          {renderSceneCaption(scene, sceneIdx)}
                        </div>
                      </Col>
                    ))}
                    {!hasScenes && <Empty description="暂无画面格" />}
                  </Row>
                )}
                
                {hasScenes && (
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
                      pageSizeOptions={['12', '24', '48','96']}
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
        setDraftConfig={setVideoConfig}
        commentSortMode={commentSortMode}
        replyOrderMode={replyOrderMode}
        imageLayoutMode={imageLayoutMode}
        sceneLayout={sceneLayout}
        titleAlignment={titleAlignment}
        titleFontSize={titleFontSize}
        contentFontSize={contentFontSize}
        quoteFontSize={quoteFontSize}
        titleFontColor={titleFontColor}
        contentFontColor={contentFontColor}
        quoteFontColor={quoteFontColor}
        titleFontBold={titleFontBold}
        contentFontBold={contentFontBold}
        maxQuoteDepth={maxQuoteDepth}
        defaultQuoteMaxLimit={defaultQuoteMaxLimit}
        sceneBackgroundColor={sceneBackgroundColor}
        sceneBackgroundColorEnd={sceneBackgroundColorEnd}
        sceneBackgroundGradientMode={sceneBackgroundGradientMode}
        itemBackgroundColor={itemBackgroundColor}
        itemBackgroundColorEnd={itemBackgroundColorEnd}
        itemBackgroundGradientMode={itemBackgroundGradientMode}
        quoteBackgroundColor={quoteBackgroundColor}
        quoteBorderColor={quoteBorderColor}
        avatarSize={avatarSize}
        avatarShape={avatarShape}
        avatarOffset={avatarOffset}
        onApplyCommentSort={videoSettingsHandlers.handleApplyCommentSort}
        onRefreshStyles={videoSettingsHandlers.handleRefreshStyles}
        onRearrangeScenes={videoSettingsHandlers.handleRearrangeScenes}
        onResetAndRebuild={videoSettingsHandlers.handleResetAndRebuild}
        onImageLayoutModeChange={videoSettingsHandlers.handleImageLayoutModeChange}
        onSceneLayoutChange={videoSettingsHandlers.handleSceneLayoutChange}
        onTitleAlignmentChange={videoSettingsHandlers.handleTitleAlignmentChange}
        onTitleFontSizeChange={videoSettingsHandlers.handleTitleFontSizeChange}
        onContentFontSizeChange={videoSettingsHandlers.handleContentFontSizeChange}
        onQuoteFontSizeChange={videoSettingsHandlers.handleQuoteFontSizeChange}
        onTitleFontColorChange={videoSettingsHandlers.handleTitleFontColorChange}
        onContentFontColorChange={videoSettingsHandlers.handleContentFontColorChange}
        onQuoteFontColorChange={videoSettingsHandlers.handleQuoteFontColorChange}
        onTitleFontBoldChange={videoSettingsHandlers.handleTitleFontBoldChange}
        onContentFontBoldChange={videoSettingsHandlers.handleContentFontBoldChange}
        onMaxQuoteDepthChange={videoSettingsHandlers.handleMaxQuoteDepthChange}
        onDefaultQuoteMaxLimitChange={videoSettingsHandlers.handleDefaultQuoteMaxLimitChange}
        onSceneBackgroundColorChange={setSceneBackgroundColor}
        onSceneBackgroundColorEndChange={setSceneBackgroundColorEnd}
        onSceneBackgroundGradientModeChange={setSceneBackgroundGradientMode}
        onItemBackgroundColorChange={setItemBackgroundColor}
        onItemBackgroundColorEndChange={setItemBackgroundColorEnd}
        onItemBackgroundGradientModeChange={setItemBackgroundGradientMode}
        onQuoteBackgroundColorChange={videoSettingsHandlers.handleQuoteBackgroundColorChange}
        onQuoteBorderColorChange={videoSettingsHandlers.handleQuoteBorderColorChange}
        onAvatarSizeChange={videoSettingsHandlers.handleAvatarSizeChange}
        onAvatarShapeChange={videoSettingsHandlers.handleAvatarShapeChange}
        onAvatarOffsetChange={videoSettingsHandlers.handleAvatarOffsetChange}
        onRefreshAvatars={videoSettingsHandlers.handleRefreshAvatars}
        onRefreshColors={videoSettingsHandlers.handleRefreshColors}
        onAddScene={videoSettingsHandlers.addScene}
        canApplyCommentSort={!!rawResult}
        galleryPage={galleryPage}
        galleryPageSize={galleryPageSize}
        setGalleryPageSize={setGalleryPageSize}
        previewLayoutMode={previewLayoutMode}
        setPreviewLayoutMode={setPreviewLayoutMode}
        previewMinWidth={previewMinWidth}
        setPreviewMinWidth={setPreviewMinWidth}
        isMultiSelectMode={isMultiSelectMode}
        setIsMultiSelectMode={setIsMultiSelectMode}
        selectedSceneIds={selectedSceneIds}
        setSelectedSceneIds={setSelectedSceneIds}
        onRemoveSelectedScenes={removeSelectedScenes}
        onOpenTranslationModal={handleOpenTranslationModal}
      />
      
    </div>
  );
};

export default StudioPage;
