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
import { VideoConfig, VideoScene, TitleAlignmentType } from '../../types';
import { AuthorProfile, CommentSortMode, ReplyOrderMode } from '../../utils/redditTransformer';
import { VideoPreviewPlayer, DEFAULT_PREVIEW_FPS } from '../../components/VideoPreviewPlayer';
import { DropResult } from '@hello-pangea/dnd';
import { Sidebar } from './components/Sidebar';
import { SceneFlow } from './components/SceneFlow';

type ColorArrangementMode = 'uniform' | 'randomized';
interface ColorArrangementSettings {
  mode: ColorArrangementMode;
  hueOffset: number;
  hueStep: number;
  saturation: number;
  lightness: number;
  seed: number;
}

interface EditorPageProps {
  draftConfig: VideoConfig;
  setDraftConfig: (config: VideoConfig) => void;
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
  onApply: () => void;
  onBack: () => void;
  toolDesc: string;
}

export const EditorPage: React.FC<EditorPageProps> = ({
  draftConfig,
  setDraftConfig,
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
  onApply,
  onBack,
  toolDesc,
}) => {
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
  const [expandedSceneIds, setExpandedSceneIds] = useState<Record<string, boolean>>({});
  const [previewSceneId, setPreviewSceneId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editorSortMode, setEditorSortMode] = useState<CommentSortMode>(commentSortMode);
  const [editorReplyOrderMode, setEditorReplyOrderMode] = useState<ReplyOrderMode>(replyOrderMode);
  const [editorColorArrangement, setEditorColorArrangement] = useState<ColorArrangementSettings>(colorArrangement);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedSceneIds, setSelectedSceneIds] = useState<string[]>([]);

  React.useEffect(() => {
    setEditorSortMode(commentSortMode);
  }, [commentSortMode]);

  React.useEffect(() => {
    setEditorReplyOrderMode(replyOrderMode);
  }, [replyOrderMode]);

  React.useEffect(() => {
    setEditorColorArrangement(colorArrangement);
  }, [colorArrangement]);

  // 当 draftConfig.scenes 发生变化时，清理掉已经不存在的选中 ID
  React.useEffect(() => {
    setSelectedSceneIds(prev => prev.filter(id => draftConfig.scenes.some(s => s.id === id)));
  }, [draftConfig.scenes]);

  React.useEffect(() => {
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

  const setAllSceneLayouts = (layout: 'top' | 'center') => {
    const newScenes = draftConfig.scenes.map((s) => ({ ...s, layout }));
    setDraftConfig({ ...draftConfig, scenes: newScenes });
    message.success(`已将全部画面格布局设为 ${layout}`);
  };

  const addScene = () => {
    const newScene: VideoScene = {
      id: 'scene-' + Date.now(),
      type: 'comments',
      title: '新建画面格',
      layout: 'top',
      duration: 5,
      items: [{
        id: 'item-' + Date.now(),
        author: 'NewUser',
        content: '',
      }]
    };
    setDraftConfig({ ...draftConfig, scenes: [...draftConfig.scenes, newScene] });
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

      <Sidebar
        sidebarWidth={sidebarWidth}
        FIXED_SIDEBAR_TOP_OFFSET={FIXED_SIDEBAR_TOP_OFFSET}
        startSidebarResize={startSidebarResize}
        isSidebarResizing={isSidebarResizing}
        SIDEBAR_MIN_WIDTH={SIDEBAR_MIN_WIDTH}
        SIDEBAR_MAX_WIDTH={SIDEBAR_MAX_WIDTH}
        updateSidebarWidthByInput={updateSidebarWidthByInput}
        resetSidebarWidthToDefault={resetSidebarWidthToDefault}
        toolDesc={toolDesc}
        draftConfig={draftConfig}
        setDraftConfig={setDraftConfig}
        editorSortMode={editorSortMode}
        setEditorSortMode={setEditorSortMode}
        editorReplyOrderMode={editorReplyOrderMode}
        setEditorReplyOrderMode={setEditorReplyOrderMode}
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
        editorColorArrangement={editorColorArrangement}
        setEditorColorArrangement={setEditorColorArrangement}
        onRearrangeColorsAndApply={onRearrangeColorsAndApply}
        authorProfiles={authorProfiles}
        onUpdateAuthorProfile={onUpdateAuthorProfile}
        setAllSceneLayouts={setAllSceneLayouts}
        addScene={addScene}
        isMultiSelectMode={isMultiSelectMode}
        setIsMultiSelectMode={setIsMultiSelectMode}
        selectedSceneIds={selectedSceneIds}
        setSelectedSceneIds={setSelectedSceneIds}
        onRemoveSelectedScenes={removeSelectedScenes}
      />

      <Modal
        title="单画面实时预览"
        open={!!previewSceneId}
        onCancel={() => setPreviewSceneId(null)}
        footer={null}
        width={800}
        styles={{ body: { padding: 0, background: '#000' } }}
        destroyOnHidden
        afterClose={() => {
          // 如果需要处理关闭后的逻辑
        }}
      >
        <div id="editor-page-preview-modal-content">
          {previewSceneId && (
            <VideoPreviewPlayer
              videoConfig={draftConfig}
              durationInFrames={(draftConfig.scenes.find(s => s.id === previewSceneId)?.duration || 5) * DEFAULT_PREVIEW_FPS}
              compositionWidth={1280}
              compositionHeight={720}
              fps={DEFAULT_PREVIEW_FPS}
              style={{ width: '100%', aspectRatio: '16/9' }}
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
