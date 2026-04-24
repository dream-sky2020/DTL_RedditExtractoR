import React, { useState } from 'react';
import {
  Space,
  Button,
  Divider,
  Modal,
  message,
} from 'antd';
import {
  VideoCameraOutlined,
} from '@ant-design/icons';
import { 
  VideoConfig, 
  VideoScene, 
} from '../../types';
import { mergeSelectedScenes } from '../../utils/sceneMergeEngine';
import { VideoPreviewPlayer, DEFAULT_PREVIEW_FPS } from '../../components/VideoPreviewPlayer';
import { DropResult } from '@hello-pangea/dnd';
import { SceneFlow } from './components/SceneFlow';
import { VideoSettingsSidebar } from 'VideoSettingsSidebarComponent_panel_compont';
import { useSidebarResize } from '@hooks/useSidebarResize';
import { useVideoSettings } from '@hooks/useVideoSettings';
import { useDslTranslate } from '@hooks/useDslTranslate';
import { TranslationModal } from '@components/TranslationModal';
import { getActiveVideoCanvasSize, getAspectRatioLabel } from '../../rendering/videoCanvas';
import { useRedditStore, useSettingsStore, useVideoStore } from '@/store';
import { AUTHOR_PROFILES_STORAGE_KEY } from '@/constants/storage';


export const EditorPage: React.FC<{ onApply: () => void; onBack: () => void; toolDesc: string }> = ({ onApply, onBack, toolDesc }) => {
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

  React.useEffect(() => {
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

  const [expandedSceneIds, setExpandedSceneIds] = useState<Record<string, boolean>>({});
  const [previewSceneId, setPreviewSceneId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedSceneIds, setSelectedSceneIds] = useState<string[]>([]);
  
  const activeCanvas = getActiveVideoCanvasSize(videoConfig);
  const activeAspectRatioLabel = getAspectRatioLabel(activeCanvas.width, activeCanvas.height);
  const previewModalWidth = activeCanvas.width >= activeCanvas.height ? 800 : 560;

  // 当 videoConfig.scenes 发生变化时，清理掉已经不存在的选中 ID
  React.useEffect(() => {
    setSelectedSceneIds(prev => prev.filter(id => videoConfig.scenes.some(s => s.id === id)));
  }, [videoConfig.scenes]);

  // 计算当前分页的数据
  const pagedScenes = videoConfig.scenes.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSceneExpand = (id: string) => {
    setExpandedSceneIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const updateScene = (sceneId: string, updates: Partial<VideoScene>) => {
    const newScenes = videoConfig.scenes.map(s => 
      s.id === sceneId ? { ...s, ...updates } : s
    );
    setVideoConfig({ ...videoConfig, scenes: newScenes });
  };

  const replaceScene = (sceneId: string, nextScene: VideoScene): { ok: boolean; message?: string } => {
    const duplicatedId = videoConfig.scenes.some((s) => s.id === nextScene.id && s.id !== sceneId);
    if (duplicatedId) {
      return { ok: false, message: `scene.id "${nextScene.id}" 已存在，请改成唯一值` };
    }
    const newScenes = videoConfig.scenes.map((s) => (s.id === sceneId ? nextScene : s));
    setVideoConfig({ ...videoConfig, scenes: newScenes });
    return { ok: true, message: '场景 JSON 已应用到画面格' };
  };

  const removeScene = (id: string) => {
    const newScenes = videoConfig.scenes.filter(s => s.id !== id);
    setVideoConfig({ ...videoConfig, scenes: newScenes });
  };

  const removeSelectedScenes = () => {
    if (selectedSceneIds.length === 0) return;
    Modal.confirm({
      title: '确认批量删除',
      content: `确认删除选中的 ${selectedSceneIds.length} 个画面格吗？`,
      okText: '确认删除',
      cancelText: '取消',
      onOk: () => {
        const newScenes = videoConfig.scenes.filter(s => !selectedSceneIds.includes(s.id));
        setVideoConfig({ ...videoConfig, scenes: newScenes });
        setSelectedSceneIds([]);
        message.success(`已删除 ${selectedSceneIds.length} 个画面格`);
      },
    });
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination, combine, type } = result;

    if (combine && type === 'scene') {
      const sourceIndex = source.index;
      const destinationSceneId = combine.draggableId;
      const sourceScene = videoConfig.scenes[sourceIndex];
      
      // 使用统一的合并引擎
      const mergeResult = mergeSelectedScenes({
        scenes: videoConfig.scenes,
        selectedSceneIds: [destinationSceneId, sourceScene.id],
        primarySceneId: destinationSceneId,
        strategy: 'auto', // 优先尝试智能合并（如引用吸收）
      });

      if (mergeResult.ok) {
        setVideoConfig({ ...videoConfig, scenes: mergeResult.scenes });
        message.success(mergeResult.message || '已完成智能合并');
      } else {
        // 如果智能合并未命中，则执行强制追加合并（即原有的 combine 行为）
        const forceResult = mergeSelectedScenes({
          scenes: videoConfig.scenes,
          selectedSceneIds: [destinationSceneId, sourceScene.id],
          primarySceneId: destinationSceneId,
          strategy: 'force-append-merge',
        });
        
        if (forceResult.ok) {
          setVideoConfig({ ...videoConfig, scenes: forceResult.scenes });
          message.success('已合并两个画面格');
        } else {
          message.error(forceResult.message || '合并失败');
        }
      }
      return;
    }

    if (!destination) return;

    if (type === 'scene') {
      const newScenes = [...videoConfig.scenes];
      const [moved] = newScenes.splice(source.index, 1);
      newScenes.splice(destination.index, 0, moved);
      setVideoConfig({ ...videoConfig, scenes: newScenes });
      return;
    }

    if (type === 'item') {
      const sourceSceneId = source.droppableId;
      const destSceneId = destination.droppableId;
      const newScenes = videoConfig.scenes.map(s => ({ ...s, items: [...s.items] }));
      const sourceScene = newScenes.find(s => s.id === sourceSceneId);
      const destScene = newScenes.find(s => s.id === destSceneId);
      if (!sourceScene || !destScene) return;
      const [movedItem] = sourceScene.items.splice(source.index, 1);
      destScene.items.splice(destination.index, 0, movedItem);
      const finalScenes = newScenes.filter(s => s.items.length > 0 || s.id === destSceneId);
      setVideoConfig({ ...videoConfig, scenes: finalScenes });
      if (sourceSceneId !== destSceneId) message.info('已将内容移动到新画面');
    }
  };

  return (
    <div id="editor-page-root" className="editor-page-container" style={{ position: 'relative' }}>
      <div id="editor-page-main-content" style={{ paddingRight: sidebarWidth + 24 }}>
        <SceneFlow
          videoConfig={videoConfig}
          pagedScenes={pagedScenes}
          currentPage={currentPage}
          pageSize={pageSize}
          totalScenes={videoConfig.scenes.length}
          expandedSceneIds={expandedSceneIds}
          onToggleExpand={toggleSceneExpand}
          onUpdateScene={updateScene}
          onRemoveScene={removeScene}
          setPreviewSceneId={setPreviewSceneId}
          replaceScene={replaceScene}
          onDragEnd={onDragEnd}
          onPageChange={(page, size) => {
            setCurrentPage(page);
            setPageSize(size || 10);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          isMultiSelectMode={isMultiSelectMode}
          selectedSceneIds={selectedSceneIds}
          onToggleSceneSelection={(id) => {
            setSelectedSceneIds(prev => 
              prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
            );
          }}
        />

        <div id="editor-page-bottom-divider-wrapper">
          <Divider />
        </div>
        <Space id="editor-page-footer-actions" size="large" style={{ marginBottom: 40 }}>
          <Button id="editor-page-apply-btn" name="apply-btn" type="primary" size="large" icon={<VideoCameraOutlined />} onClick={onApply}>保存并进入预览</Button>
          <Button id="editor-page-back-btn" name="back-btn" size="large" onClick={onBack}>返回上一步</Button>
        </Space>
      </div>

      <VideoSettingsSidebar
        mode="editor"
        sidebarWidth={sidebarWidth}
        SIDEBAR_MIN_WIDTH={SIDEBAR_MIN_WIDTH}
        SIDEBAR_MAX_WIDTH={SIDEBAR_MAX_WIDTH}
        FIXED_SIDEBAR_TOP_OFFSET={FIXED_SIDEBAR_TOP_OFFSET}
        isSidebarResizing={isSidebarResizing}
        startSidebarResize={startSidebarResize}
        updateSidebarWidthByInput={updateSidebarWidthByInput}
        resetSidebarWidthToDefault={resetSidebarWidthToDefault}
        toolTitle="右侧操作面板"
        toolDesc={toolDesc}
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

      <Modal
        title={`单画面实时预览（${activeAspectRatioLabel}）`}
        open={!!previewSceneId}
        onCancel={() => setPreviewSceneId(null)}
        footer={null}
        width={previewModalWidth}
        styles={{ body: { padding: 0, background: '#000' } }}
        destroyOnHidden
      >
        <div id="editor-page-preview-modal-content">
          {previewSceneId && (
            <VideoPreviewPlayer
              videoConfig={videoConfig}
              durationInFrames={(videoConfig.scenes.find(s => s.id === previewSceneId)?.duration || 5) * DEFAULT_PREVIEW_FPS}
              fps={DEFAULT_PREVIEW_FPS}
              style={{ width: '100%', aspectRatio: `${activeCanvas.width} / ${activeCanvas.height}` }}
              focusedSceneId={previewSceneId}
              controls
              autoPlay
            />
          )}
        </div>
      </Modal>
    </div>
  );
};
