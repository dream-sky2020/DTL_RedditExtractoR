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
  Tag,
} from 'antd';
import {
  FileImageOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';
import {
  VideoPreviewPlayer,
  DEFAULT_PREVIEW_FPS,
  getTotalFrames,
  getSceneStartFrame,
} from '../../components/VideoPreviewPlayer';
import { getActiveVideoCanvasSize, getAspectRatioLabel } from '../../rendering/videoCanvas';
import { VideoSettingsSidebar } from 'VideoSettingsSidebarComponent_panel_compont';
import { useSidebarResize } from '@hooks/useSidebarResize';
import { useVideoSettings } from '@hooks/useVideoSettings';
import { useSceneDeletion } from '@hooks/useSceneDeletion';
import { useDslTranslate } from '@hooks/useDslTranslate';
import { TranslationModal } from '@components/TranslationModal';
import { useRedditStore, useSettingsStore, useVideoStore } from '@/store';
import { AUTHOR_PROFILES_STORAGE_KEY } from '@/constants/storage';

const { Text } = Typography;
type PreviewLayoutMode = 'auto' | 'fixed';


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
    maxQuoteDepth, setMaxQuoteDepth, defaultQuoteMaxLimit, setDefaultQuoteMaxLimit,
    sceneBackgroundColor, setSceneBackgroundColor, itemBackgroundColor, setItemBackgroundColor,
    quoteBackgroundColor, setQuoteBackgroundColor, quoteBorderColor, setQuoteBorderColor,
    colorArrangement, setColorArrangement,
    sceneDisplayMode,
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
    setContentFontSize, setQuoteFontSize, setMaxQuoteDepth, setDefaultQuoteMaxLimit,
    setSceneBackgroundColor, setItemBackgroundColor, setQuoteBackgroundColor, setQuoteBorderColor,
    titleAlignment, titleFontSize, contentFontSize, quoteFontSize,
    maxQuoteDepth, defaultQuoteMaxLimit, sceneBackgroundColor, itemBackgroundColor,
    quoteBackgroundColor, quoteBorderColor
  });

  const {
    isModalOpen: isTranslateModalOpen,
    setIsModalOpen: setIsTranslateModalOpen,
    chunks: translateChunks,
    initialValue: translateInitialValue,
    extractChunks,
    applyTranslations
  } = useDslTranslate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          if (useVideoStore.getState().canRedo()) {
            useVideoStore.getState().redo();
            message.info('已重做 (Redo)');
          }
        } else {
          if (useVideoStore.getState().canUndo()) {
            useVideoStore.getState().undo();
            message.info('已撤销 (Undo)');
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        if (useVideoStore.getState().canRedo()) {
          useVideoStore.getState().redo();
          message.info('已重做 (Redo)');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleApplyTranslate = (value: string) => {
    // 关键改动：传入所有场景进行翻译应用，确保跨场景的相同文本都能被替换
    const result = applyTranslations(videoConfig.scenes, value);
    if (result.ok && result.nextScenes) {
      setVideoConfig({ ...videoConfig, scenes: result.nextScenes });
      setIsTranslateModalOpen(false);
      message.success(`已完成全局翻译应用：替换了 ${result.totalReplacements} 处文本，涉及 ${result.affectedScenes} 个场景。`);
    } else if (result.error) {
      message.error(result.error);
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
  const [galleryPage, setGalleryPage] = useState(1);
  const [galleryPageSize, setGalleryPageSize] = useState(12);
  const [previewLayoutMode, setPreviewLayoutMode] = useState<PreviewLayoutMode>('auto');
  const [previewMinWidth, setPreviewMinWidth] = useState(280);
  const [frameOffset, setFrameOffset] = useState(15);
  
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

  // 渲染单张画面的播放器组件
  const FramePlayer = ({ idx, isSelected }: { idx: number; isSelected: boolean }) => (
    <div 
      style={{ 
        position: 'relative',
        background: isCompact ? 'var(--brand-bg-subtle)' : 'var(--brand-dark)', 
        borderRadius: 8, 
        overflow: 'hidden',
        boxShadow: isCompact ? 'none' : '0 2px 8px rgba(0,0,0,0.2)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: (onViewScene || isMultiSelectMode) ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        border: isSelected ? '2px solid var(--ant-primary-color)' : '1px solid var(--brand-border)',
        height: isCompact ? 60 : 'auto',
      }}
      onClick={() => {
        const scene = scenes[idx];
        if (isMultiSelectMode) {
          setSelectedSceneIds(prev => 
            prev.includes(scene.id) ? prev.filter(sid => sid !== scene.id) : [...prev, scene.id]
          );
        } else {
          onViewScene?.(idx);
        }
      }}
    >
      {!isCompact ? (
        <VideoPreviewPlayer
          videoConfig={videoConfig}
          durationInFrames={totalFrames}
          fps={fps}
          initialFrame={getSceneStartFrame(videoConfig, idx, fps) + frameOffset}
          key={`studio-scene-${idx}-${frameOffset}`}
          style={{
            width: '100%',
            aspectRatio: `${activeCanvas.width} / ${activeCanvas.height}`,
            opacity: isMultiSelectMode && !isSelected ? 0.7 : 1,
            pointerEvents: isMultiSelectMode ? 'none' : 'auto',
          }}
          controls={false}
          autoPlay={false}
        />
      ) : (
        <div style={{ padding: '0 12px', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong style={{ fontSize: 13 }}>#{idx + 1}</Text>
          <Tag color="blue" style={{ margin: 0 }}>{scenes[idx].duration}s</Tag>
        </div>
      )}
      {isSelected && !isCompact && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10,
          background: 'rgba(255, 255, 255, 0.8)',
          borderRadius: '50%',
          width: 64,
          height: 64,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          pointerEvents: 'none',
        }}>
          <CheckCircleFilled style={{ fontSize: 48, color: 'var(--ant-primary-color)' }} />
        </div>
      )}
      {isSelected && (
        <div style={{
          position: 'absolute',
          inset: 0,
          border: '2px solid var(--ant-primary-color)',
          borderRadius: 8,
          pointerEvents: 'none',
          zIndex: 5
        }} />
      )}
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
                  {isMultiSelectMode && <Tag color="blue">多选模式已开启</Tag>}
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
                          <FramePlayer idx={sceneIdx} isSelected={selectedSceneIds.includes(scene.id)} />
                          {!isCompact && (
                            <div style={{ marginTop: 8, textAlign: 'center' }}>
                              <Text strong ellipsis style={{ 
                                width: '100%', 
                                display: 'block', 
                                fontSize: '12px',
                                color: selectedSceneIds.includes(scene.id) ? 'var(--ant-primary-color)' : 'inherit'
                              }}>
                                {sceneIdx + 1}. {scene.title || '未命名画面'}
                              </Text>
                            </div>
                          )}
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
                          <FramePlayer idx={sceneIdx} isSelected={selectedSceneIds.includes(scene.id)} />
                          <div style={{ marginTop: 8, textAlign: 'center' }}>
                            <Text strong ellipsis style={{ 
                              width: '100%', 
                              display: 'block', 
                              fontSize: '12px',
                              color: selectedSceneIds.includes(scene.id) ? 'var(--ant-primary-color)' : 'inherit'
                            }}>
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
        setDraftConfig={setVideoConfig}
        commentSortMode={commentSortMode}
        replyOrderMode={replyOrderMode}
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
        isMultiSelectMode={isMultiSelectMode}
        setIsMultiSelectMode={setIsMultiSelectMode}
        selectedSceneIds={selectedSceneIds}
        setSelectedSceneIds={setSelectedSceneIds}
        onRemoveSelectedScenes={removeSelectedScenes}
        onOpenTranslationModal={() => {
          const selectedScenes = videoConfig.scenes.filter(s => selectedSceneIds.includes(s.id));
          extractChunks(selectedScenes);
        }}
      />
      
      <TranslationModal
        open={isTranslateModalOpen}
        onCancel={() => setIsTranslateModalOpen(false)}
        onOk={handleApplyTranslate}
        chunks={translateChunks}
        initialValue={translateInitialValue}
      />
    </div>
  );
};

export default StudioPage;
