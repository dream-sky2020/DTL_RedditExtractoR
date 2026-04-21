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
import { VideoSettingsSidebar } from 'VideoSettingsSidebarCompont_panel_compont';
import { getActiveVideoCanvasSize, getAspectRatioLabel, normalizeVideoConfig, createDefaultVideoCanvasConfig } from '../../rendering/videoCanvas';
import { transformRedditJson } from '../../utils/redditTransformer';
import { generateRandomAliasProfiles } from '../../utils/aliasGenerator';
import { hslToHex } from '../../utils/color/hslToHex';
import { pseudoRandom01 } from '../../utils/random/pseudoRandom01';

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

export const EditorPage: React.FC<EditorPageProps> = ({
  draftConfig,
  setDraftConfig,
  videoConfig,
  setVideoConfig,
  persistVideoConfig,
  commentSortMode,
  setCommentSortMode,
  replyOrderMode,
  setReplyOrderMode,
  rawResult,
  result,
  setResult,
  colorArrangement,
  setColorArrangement,
  allAuthors,
  authorProfiles,
  setAuthorProfiles,
  persistAuthorProfiles,
  imageLayoutMode,
  setImageLayoutMode,
  sceneLayout,
  setSceneLayout,
  titleAlignment,
  setTitleAlignment,
  titleFontSize,
  setTitleFontSize,
  contentFontSize,
  setContentFontSize,
  quoteFontSize,
  setQuoteFontSize,
  maxQuoteDepth,
  setMaxQuoteDepth,
  defaultQuoteMaxLimit,
  setDefaultQuoteMaxLimit,
  sceneBackgroundColor,
  setSceneBackgroundColor,
  itemBackgroundColor,
  setItemBackgroundColor,
  quoteBackgroundColor,
  setQuoteBackgroundColor,
  quoteBorderColor,
  setQuoteBorderColor,
  onApply,
  onBack,
  toolDesc,
}) => {
  // ---------------------------------------------------------
  // 辅助函数 (原本在 App.tsx 中)
  // ---------------------------------------------------------
  
  const buildColorWithSettings = (index: number, settings: ColorArrangementSettings) => {
    const s = Math.max(20, Math.min(90, settings.saturation)) / 100;
    const l = Math.max(20, Math.min(80, settings.lightness)) / 100;
    const offset = ((settings.hueOffset % 360) + 360) % 360;
    const step = Math.max(1, Math.min(359, settings.hueStep));
    const hue = settings.mode === 'uniform'
      ? (offset + index * step) % 360
      : (offset + pseudoRandom01(settings.seed, index) * 360) % 360;
    return hslToHex(hue, s, l);
  };

  const buildProfilesForAuthors = (
    authors: string[],
    previousProfiles: Record<string, AuthorProfile>,
    settings: ColorArrangementSettings,
    overwriteColors = false,
  ) => {
    const nextProfiles: Record<string, AuthorProfile> = { ...previousProfiles };

    authors.forEach((author, index) => {
      const existing = nextProfiles[author] || {};
      if (overwriteColors || !existing.color) {
        nextProfiles[author] = {
          ...existing,
          color: buildColorWithSettings(index, settings),
        };
      }
    });

    return nextProfiles;
  };

  const buildVideoConfigFromResult = (
    nextResult: any,
    alignment: TitleAlignmentType = 'center',
    titleSize = 64,
    contentSize = 32,
    canvas = createDefaultVideoCanvasConfig()
  ): VideoConfig => {
    const postScene: VideoScene = {
      id: 'scene-post-' + Date.now(),
      type: 'post',
      title: '贴子正文',
      layout: 'top',
      duration: 5,
      items: [{
        id: 'post-content',
        author: nextResult.author,
        content: `[style size=${titleSize} b align=${alignment}]${nextResult.title}[/style]\n\n[style size=${contentSize}]${nextResult.content || ''}[/style]`,
      }]
    };

    const commentScenes: VideoScene[] = nextResult.comments.map((c: any) => ({
      id: 'scene-' + c.id,
      type: 'comments',
      title: `评论 u/${c.author}`,
      layout: 'center',
      duration: 3,
      items: [{
        id: c.id,
        author: c.author,
        content: `[style size=${contentSize}]${c.body}[/style]`,
        replyChain: c.replyChain
      }]
    }));

    return {
      title: nextResult.title,
      subreddit: nextResult.subreddit,
      scenes: [postScene, ...commentScenes],
      titleFontSize: titleSize,
      contentFontSize: contentSize,
      quoteFontSize: quoteFontSize,
      quoteBackgroundColor: quoteBackgroundColor,
      quoteBorderColor: quoteBorderColor,
      maxQuoteDepth: maxQuoteDepth,
      defaultQuoteMaxLimit: defaultQuoteMaxLimit,
      sceneBackgroundColor: sceneBackgroundColor,
      itemBackgroundColor: itemBackgroundColor,
      canvas,
    };
  };

  const rebuildFromRaw = (
    sortMode: CommentSortMode,
    replyOrder: ReplyOrderMode,
    profiles: Record<string, AuthorProfile>,
    successMessage: string,
  ) => {
    if (!rawResult) {
      message.warning('请先提取 Reddit 数据，再进行排序重排');
      return;
    }

    setCommentSortMode(sortMode);
    setReplyOrderMode(replyOrder);

    const nextResult = transformRedditJson(rawResult, {
      sortMode,
      replyOrder,
      authorProfiles: profiles,
      imageLayoutMode: draftConfig.imageLayoutMode,
    });
    const nextConfig = {
      ...buildVideoConfigFromResult(
        nextResult,
        titleAlignment,
        titleFontSize,
        contentFontSize,
        draftConfig.canvas || videoConfig.canvas || createDefaultVideoCanvasConfig()
      ),
      imageLayoutMode: draftConfig.imageLayoutMode,
    };

    setResult(nextResult);
    const normalizedConfig = normalizeVideoConfig(nextConfig);
    setVideoConfig(normalizedConfig);
    setDraftConfig(normalizedConfig);
    persistVideoConfig(normalizedConfig);
    message.success(successMessage);
  };

  // ---------------------------------------------------------
  // 核心逻辑处理器 (原本在 App.tsx / MainPages 中)
  // ---------------------------------------------------------

  const updateAuthorProfile = (
    author: string,
    updates: Partial<AuthorProfile>,
  ) => {
    const next = {
      ...authorProfiles,
      [author]: {
        ...(authorProfiles[author] || {}),
        ...updates,
      },
    };
    setAuthorProfiles(next);
    persistAuthorProfiles(next);
  };

  const handleApplyCommentSort = (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => {
    setCommentSortMode(sortMode);
    setReplyOrderMode(replyOrder);
    rebuildFromRaw(sortMode, replyOrder, authorProfiles, '评论排序已应用并重排脚本');
  };

  const handleRandomizeAliasesAndApply = (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => {
    setCommentSortMode(sortMode);
    setReplyOrderMode(replyOrder);
    const nextProfiles = generateRandomAliasProfiles(allAuthors, authorProfiles);
    setAuthorProfiles(nextProfiles);
    rebuildFromRaw(sortMode, replyOrder, nextProfiles, '已随机生成代号并重建脚本');
  };

  const handleClearAliasesAndApply = (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => {
    setCommentSortMode(sortMode);
    setReplyOrderMode(replyOrder);
    const nextProfiles: Record<string, AuthorProfile> = { ...authorProfiles };
    allAuthors.forEach((author) => {
      const existing = nextProfiles[author] || {};
      nextProfiles[author] = {
        ...existing,
        alias: '',
      };
    });
    setAuthorProfiles(nextProfiles);
    rebuildFromRaw(sortMode, replyOrder, nextProfiles, '已清空所有代号并重建脚本');
  };

  const handleRearrangeColorsAndApply = (
    sortMode: CommentSortMode,
    replyOrder: ReplyOrderMode,
    nextSettings: ColorArrangementSettings,
  ) => {
    setCommentSortMode(sortMode);
    setReplyOrderMode(replyOrder);
    const normalizedSettings = {
      ...nextSettings,
      saturation: Math.max(20, Math.min(90, nextSettings.saturation)),
      lightness: Math.max(20, Math.min(80, nextSettings.lightness)),
      hueStep: Math.max(1, Math.min(359, nextSettings.hueStep)),
    };
    setColorArrangement(normalizedSettings);
    const nextProfiles = buildProfilesForAuthors(allAuthors, authorProfiles, normalizedSettings, true);
    setAuthorProfiles(nextProfiles);
    rebuildFromRaw(sortMode, replyOrder, nextProfiles, '已按新规则重排颜色并重建脚本');
  };

  const handleImageLayoutModeChange = (mode: ImageLayoutMode) => {
    setImageLayoutMode(mode);
    const newConfig = normalizeVideoConfig({ ...draftConfig, imageLayoutMode: mode });
    setDraftConfig(newConfig);
    setVideoConfig(newConfig);
    persistVideoConfig(newConfig);
  };

  const handleSceneLayoutChange = (layout: SceneLayoutType) => {
    setSceneLayout(layout);
    const newScenes = draftConfig.scenes.map(s => ({ ...s, layout }));
    const newConfig = normalizeVideoConfig({ ...draftConfig, scenes: newScenes });
    setDraftConfig(newConfig);
    setVideoConfig(newConfig);
    persistVideoConfig(newConfig);
  };

  const handleTitleAlignmentChange = (alignment: TitleAlignmentType) => {
    setTitleAlignment(alignment);
    const newScenes = draftConfig.scenes.map(scene => {
      if (scene.type === 'post' && scene.items.length > 0) {
        const newItems = scene.items.map(item => {
          let newContent = item.content;
          if (newContent.includes('[style') && newContent.includes(' b')) {
            newContent = newContent.replace(/(\[style [^\]]*b[^\]]*)\]/, (match) => {
              if (match.includes('align=')) {
                return match.replace(/align=[^ \]]+/, `align=${alignment}`);
              } else {
                return match.slice(0, -1) + ` align=${alignment}]`;
              }
            });
          }
          return { ...item, content: newContent };
        });
        return { ...scene, items: newItems };
      }
      return scene;
    });
    const newConfig = normalizeVideoConfig({ ...draftConfig, scenes: newScenes, titleAlignment: alignment });
    setDraftConfig(newConfig);
    setVideoConfig(newConfig);
    persistVideoConfig(newConfig);
  };

  const handleTitleFontSizeChange = (size: number) => {
    setTitleFontSize(size);
    const newScenes = draftConfig.scenes.map(scene => {
      if (scene.type === 'post' && scene.items.length > 0) {
        const newItems = scene.items.map(item => {
          let newContent = item.content;
          if (newContent.includes('[style') && newContent.includes(' b')) {
            newContent = newContent.replace(/(\[style [^\]]*b[^\]]*)\]/, (match) => {
              if (match.includes('size=')) {
                return match.replace(/size=\d+/, `size=${size}`);
              } else {
                return match.slice(0, -1) + ` size=${size}]`;
              }
            });
          }
          return { ...item, content: newContent };
        });
        return { ...scene, items: newItems };
      }
      return scene;
    });
    const newConfig = normalizeVideoConfig({ ...draftConfig, scenes: newScenes, titleFontSize: size });
    setDraftConfig(newConfig);
    setVideoConfig(newConfig);
    persistVideoConfig(newConfig);
  };

  const handleContentFontSizeChange = (size: number) => {
    setContentFontSize(size);
    const newScenes = draftConfig.scenes.map(scene => {
      const newItems = scene.items.map(item => {
        let newContent = item.content;
        newContent = newContent.split(/(\[style [^\]]*\])/g).map(part => {
          if (part.startsWith('[style') && !part.includes(' b')) {
            if (part.includes('size=')) {
              return part.replace(/size=\d+/, `size=${size}`);
            } else {
              return part.slice(0, -1) + ` size=${size}]`;
            }
          }
          return part;
        }).join('');
        return { ...item, content: newContent };
      });
      return { ...scene, items: newItems };
    });
    const newConfig = normalizeVideoConfig({ ...draftConfig, scenes: newScenes, contentFontSize: size });
    setDraftConfig(newConfig);
    setVideoConfig(newConfig);
    persistVideoConfig(newConfig);
  };

  const handleQuoteFontSizeChange = (size: number) => {
    setQuoteFontSize(size);
    const newConfig = normalizeVideoConfig({ ...draftConfig, quoteFontSize: size });
    setDraftConfig(newConfig);
    setVideoConfig(newConfig);
    persistVideoConfig(newConfig);
  };

  const handleMaxQuoteDepthChange = (depth: number) => {
    setMaxQuoteDepth(depth);
    const newConfig = normalizeVideoConfig({ ...draftConfig, maxQuoteDepth: depth });
    setDraftConfig(newConfig);
    setVideoConfig(newConfig);
    persistVideoConfig(newConfig);
  };

  const handleDefaultQuoteMaxLimitChange = (limit: number) => {
    setDefaultQuoteMaxLimit(limit);
    const newConfig = normalizeVideoConfig({ ...draftConfig, defaultQuoteMaxLimit: limit });
    setDraftConfig(newConfig);
    setVideoConfig(newConfig);
    persistVideoConfig(newConfig);
  };

  const handleSceneBackgroundColorChange = (color: string) => {
    setSceneBackgroundColor(color);
    const newScenes = draftConfig.scenes.map(scene => ({
      ...scene,
      backgroundColor: color
    }));
    const newConfig = normalizeVideoConfig({ ...draftConfig, scenes: newScenes, sceneBackgroundColor: color });
    setDraftConfig(newConfig);
    setVideoConfig(newConfig);
    persistVideoConfig(newConfig);
  };

  const handleItemBackgroundColorChange = (color: string) => {
    setItemBackgroundColor(color);
    const newScenes = draftConfig.scenes.map(scene => ({
      ...scene,
      items: scene.items.map(item => ({ ...item, backgroundColor: color }))
    }));
    const newConfig = normalizeVideoConfig({ ...draftConfig, scenes: newScenes, itemBackgroundColor: color });
    setDraftConfig(newConfig);
    setVideoConfig(newConfig);
    persistVideoConfig(newConfig);
  };

  const handleQuoteBackgroundColorChange = (color: string) => {
    setQuoteBackgroundColor(color);
    const newConfig = normalizeVideoConfig({ ...draftConfig, quoteBackgroundColor: color });
    setDraftConfig(newConfig);
    setVideoConfig(newConfig);
    persistVideoConfig(newConfig);
  };

  const handleQuoteBorderColorChange = (color: string) => {
    setQuoteBorderColor(color);
    const newConfig = normalizeVideoConfig({ ...draftConfig, quoteBorderColor: color });
    setDraftConfig(newConfig);
    setVideoConfig(newConfig);
    persistVideoConfig(newConfig);
  };

  // ---------------------------------------------------------
  // 原有的组件逻辑
  // ---------------------------------------------------------
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
  
  const activeCanvas = getActiveVideoCanvasSize(draftConfig);
  const activeAspectRatioLabel = getAspectRatioLabel(activeCanvas.width, activeCanvas.height);
  const previewModalWidth = activeCanvas.width >= activeCanvas.height ? 800 : 560;

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
      backgroundColor: sceneBackgroundColor,
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
        onApplyCommentSort={handleApplyCommentSort}
        onRandomizeAliasesAndApply={handleRandomizeAliasesAndApply}
        onClearAliasesAndApply={handleClearAliasesAndApply}
        onRearrangeColorsAndApply={handleRearrangeColorsAndApply}
        onUpdateAuthorProfile={updateAuthorProfile}
        onImageLayoutModeChange={handleImageLayoutModeChange}
        onSceneLayoutChange={handleSceneLayoutChange}
        onTitleAlignmentChange={handleTitleAlignmentChange}
        onTitleFontSizeChange={handleTitleFontSizeChange}
        onContentFontSizeChange={handleContentFontSizeChange}
        onQuoteFontSizeChange={handleQuoteFontSizeChange}
        onMaxQuoteDepthChange={handleMaxQuoteDepthChange}
        onDefaultQuoteMaxLimitChange={handleDefaultQuoteMaxLimitChange}
        onSceneBackgroundColorChange={handleSceneBackgroundColorChange}
        onItemBackgroundColorChange={handleItemBackgroundColorChange}
        onQuoteBackgroundColorChange={handleQuoteBackgroundColorChange}
        onQuoteBorderColorChange={handleQuoteBorderColorChange}
        onSetAllSceneLayouts={setAllSceneLayouts}
        onAddScene={addScene}
        canApplyCommentSort={!!rawResult}
        allAuthors={allAuthors}
        authorProfiles={authorProfiles}
        colorArrangement={colorArrangement}
        setColorArrangement={setEditorColorArrangement}
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
        afterClose={() => {
          // 如果需要处理关闭后的逻辑
        }}
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
