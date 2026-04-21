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
  TitleAlignmentType, 
  ImageLayoutMode, 
  SceneLayoutType,
  AuthorProfile, 
  CommentSortMode, 
  ReplyOrderMode,
  ColorArrangementSettings 
} from '../../types';
import { VideoPreviewPlayer, DEFAULT_PREVIEW_FPS } from '../../components/VideoPreviewPlayer';
import { DropResult } from '@hello-pangea/dnd';
import { SceneFlow } from './components/SceneFlow';
import { VideoSettingsSidebar } from 'VideoSettingsSidebarComponent_panel_compont';
import { useSidebarResize } from '@hooks/useSidebarResize';
import { useVideoSettings } from '@hooks/useVideoSettings';
import { getActiveVideoCanvasSize, getAspectRatioLabel } from '../../rendering/videoCanvas';

interface EditorPageProps {
  draftConfig: VideoConfig;
  setDraftConfig: (config: VideoConfig) => void;
  videoConfig: VideoConfig;
  setVideoConfig: (config: VideoConfig) => void;
  persistVideoConfig: (config: VideoConfig) => void;
  
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
  
  onApply: () => void;
  onBack: () => void;
  toolDesc: string;
}

export const EditorPage: React.FC<EditorPageProps> = (props) => {
  const {
    draftConfig,
    setDraftConfig,
    videoConfig,
    commentSortMode,
    replyOrderMode,
    rawResult,
    colorArrangement,
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
    onApply,
    onBack,
    toolDesc,
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

  const [expandedSceneIds, setExpandedSceneIds] = useState<Record<string, boolean>>({});
  const [previewSceneId, setPreviewSceneId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedSceneIds, setSelectedSceneIds] = useState<string[]>([]);
  
  const activeCanvas = getActiveVideoCanvasSize(draftConfig);
  const activeAspectRatioLabel = getAspectRatioLabel(activeCanvas.width, activeCanvas.height);
  const previewModalWidth = activeCanvas.width >= activeCanvas.height ? 800 : 560;

  // 当 draftConfig.scenes 发生变化时，清理掉已经不存在的选中 ID
  React.useEffect(() => {
    setSelectedSceneIds(prev => prev.filter(id => draftConfig.scenes.some(s => s.id === id)));
  }, [draftConfig.scenes]);

  // 计算当前分页的数据
  const pagedScenes = draftConfig.scenes.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSceneExpand = (id: string) => {
    setExpandedSceneIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const updateScene = (sceneId: string, updates: Partial<VideoScene>) => {
    const newScenes = draftConfig.scenes.map(s => 
      s.id === sceneId ? { ...s, ...updates } : s
    );
    setDraftConfig({ ...draftConfig, scenes: newScenes });
  };

  const replaceScene = (sceneId: string, nextScene: VideoScene): { ok: boolean; message?: string } => {
    const duplicatedId = draftConfig.scenes.some((s) => s.id === nextScene.id && s.id !== sceneId);
    if (duplicatedId) {
      return { ok: false, message: `scene.id "${nextScene.id}" 已存在，请改成唯一值` };
    }
    const newScenes = draftConfig.scenes.map((s) => (s.id === sceneId ? nextScene : s));
    setDraftConfig({ ...draftConfig, scenes: newScenes });
    return { ok: true, message: '场景 JSON 已应用到画面格' };
  };

  const removeScene = (id: string) => {
    const newScenes = draftConfig.scenes.filter(s => s.id !== id);
    setDraftConfig({ ...draftConfig, scenes: newScenes });
  };

  const removeSelectedScenes = () => {
    if (selectedSceneIds.length === 0) return;
    Modal.confirm({
      title: '确认批量删除',
      content: `确认删除选中的 ${selectedSceneIds.length} 个画面格吗？`,
      okText: '确认删除',
      cancelText: '取消',
      onOk: () => {
        const newScenes = draftConfig.scenes.filter(s => !selectedSceneIds.includes(s.id));
        setDraftConfig({ ...draftConfig, scenes: newScenes });
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
      const sourceScene = draftConfig.scenes[sourceIndex];
      const newScenes = draftConfig.scenes.filter((_, idx) => idx !== sourceIndex).map(s => {
        if (s.id === destinationSceneId) {
          return {
            ...s,
            items: [...s.items, ...sourceScene.items],
            duration: s.duration + sourceScene.duration
          };
        }
        return s;
      });
      setDraftConfig({ ...draftConfig, scenes: newScenes });
      message.success('已合并两个画面格');
      return;
    }

    if (!destination) return;

    if (type === 'scene') {
      const newScenes = [...draftConfig.scenes];
      const [moved] = newScenes.splice(source.index, 1);
      newScenes.splice(destination.index, 0, moved);
      setDraftConfig({ ...draftConfig, scenes: newScenes });
      return;
    }

    if (type === 'item') {
      const sourceSceneId = source.droppableId;
      const destSceneId = destination.droppableId;
      const newScenes = draftConfig.scenes.map(s => ({ ...s, items: [...s.items] }));
      const sourceScene = newScenes.find(s => s.id === sourceSceneId);
      const destScene = newScenes.find(s => s.id === destSceneId);
      if (!sourceScene || !destScene) return;
      const [movedItem] = sourceScene.items.splice(source.index, 1);
      destScene.items.splice(destination.index, 0, movedItem);
      const finalScenes = newScenes.filter(s => s.items.length > 0 || s.id === destSceneId);
      setDraftConfig({ ...draftConfig, scenes: finalScenes });
      if (sourceSceneId !== destSceneId) message.info('已将内容移动到新画面');
    }
  };

  return (
    <div id="editor-page-root" className="editor-page-container" style={{ position: 'relative' }}>
      <div id="editor-page-main-content" style={{ paddingRight: sidebarWidth + 24 }}>
        <SceneFlow
          videoConfig={draftConfig}
          pagedScenes={pagedScenes}
          currentPage={currentPage}
          pageSize={pageSize}
          totalScenes={draftConfig.scenes.length}
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
        draftConfig={draftConfig}
        setDraftConfig={setDraftConfig}
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
        setColorArrangement={props.setColorArrangement}
        isMultiSelectMode={isMultiSelectMode}
        setIsMultiSelectMode={setIsMultiSelectMode}
        selectedSceneIds={selectedSceneIds}
        setSelectedSceneIds={setSelectedSceneIds}
        onRemoveSelectedScenes={removeSelectedScenes}
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
              videoConfig={draftConfig}
              durationInFrames={(draftConfig.scenes.find(s => s.id === previewSceneId)?.duration || 5) * DEFAULT_PREVIEW_FPS}
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
