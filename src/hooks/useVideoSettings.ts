import { message } from 'antd';
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
} from '../types';
import { normalizeVideoConfig, createDefaultVideoCanvasConfig } from '../rendering/videoCanvas';
import { transformRedditJson } from '../utils/redditTransformer';
import { generateRandomAliasProfiles } from '../utils/aliasGenerator';
import { hslToHex } from '../utils/color/hslToHex';
import { pseudoRandom01 } from '../utils/random/pseudoRandom01';

interface VideoSettingsOptions {
  videoConfig: VideoConfig;
  setVideoConfig: (config: VideoConfig) => void;
  draftConfig: VideoConfig;
  setDraftConfig: (config: VideoConfig) => void;
  persistVideoConfig: (config: VideoConfig) => void;
  commentSortMode: CommentSortMode;
  setCommentSortMode: (mode: CommentSortMode) => void;
  replyOrderMode: ReplyOrderMode;
  setReplyOrderMode: (mode: ReplyOrderMode) => void;
  rawResult: any;
  setResult: (result: any) => void;
  colorArrangement: ColorArrangementSettings;
  setColorArrangement: (settings: ColorArrangementSettings) => void;
  allAuthors: string[];
  authorProfiles: Record<string, AuthorProfile>;
  setAuthorProfiles: (profiles: Record<string, AuthorProfile>) => void;
  persistAuthorProfiles: (profiles: Record<string, AuthorProfile>) => void;
  // 各个具体设置的 setter
  setImageLayoutMode: (mode: ImageLayoutMode) => void;
  setSceneLayout: (layout: SceneLayoutType) => void;
  setTitleAlignment: (alignment: TitleAlignmentType) => void;
  setTitleFontSize: (size: number) => void;
  setContentFontSize: (size: number) => void;
  setQuoteFontSize: (size: number) => void;
  setMaxQuoteDepth: (depth: number) => void;
  setDefaultQuoteMaxLimit: (limit: number) => void;
  setSceneBackgroundColor: (color: string) => void;
  setItemBackgroundColor: (color: string) => void;
  setQuoteBackgroundColor: (color: string) => void;
  setQuoteBorderColor: (color: string) => void;
  // 当前值（用于计算）
  titleAlignment: TitleAlignmentType;
  titleFontSize: number;
  contentFontSize: number;
  quoteFontSize: number;
  maxQuoteDepth: number;
  defaultQuoteMaxLimit: number;
  sceneBackgroundColor: string;
  itemBackgroundColor: string;
  quoteBackgroundColor: string;
  quoteBorderColor: string;
}

export const useVideoSettings = (opts: VideoSettingsOptions) => {
  const {
    videoConfig, setVideoConfig, draftConfig, setDraftConfig, persistVideoConfig,
    commentSortMode, setCommentSortMode, replyOrderMode, setReplyOrderMode,
    rawResult, setResult, colorArrangement, setColorArrangement,
    allAuthors, authorProfiles, setAuthorProfiles, persistAuthorProfiles,
    setImageLayoutMode, setSceneLayout, setTitleAlignment, setTitleFontSize,
    setContentFontSize, setQuoteFontSize, setMaxQuoteDepth, setDefaultQuoteMaxLimit,
    setSceneBackgroundColor, setItemBackgroundColor, setQuoteBackgroundColor, setQuoteBorderColor,
    titleAlignment, titleFontSize, contentFontSize, quoteFontSize,
    maxQuoteDepth, defaultQuoteMaxLimit, sceneBackgroundColor, itemBackgroundColor,
    quoteBackgroundColor, quoteBorderColor
  } = opts;

  // --- 内部辅助函数 ---
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
      quoteFontSize: opts.quoteFontSize,
      quoteBackgroundColor: opts.quoteBackgroundColor,
      quoteBorderColor: opts.quoteBorderColor,
      maxQuoteDepth: opts.maxQuoteDepth,
      defaultQuoteMaxLimit: opts.defaultQuoteMaxLimit,
      sceneBackgroundColor: opts.sceneBackgroundColor,
      itemBackgroundColor: opts.itemBackgroundColor,
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

  // --- 导出的处理函数 ---
  const handleApplyCommentSort = (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => {
    rebuildFromRaw(sortMode, replyOrder, authorProfiles, '评论排序已应用并重排脚本');
  };

  const handleRandomizeAliasesAndApply = (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => {
    const nextProfiles = generateRandomAliasProfiles(allAuthors, authorProfiles);
    setAuthorProfiles(nextProfiles);
    rebuildFromRaw(sortMode, replyOrder, nextProfiles, '已随机生成代号并重建脚本');
  };

  const handleClearAliasesAndApply = (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => {
    const nextProfiles: Record<string, AuthorProfile> = { ...authorProfiles };
    allAuthors.forEach((author) => {
      const existing = nextProfiles[author] || {};
      nextProfiles[author] = { ...existing, alias: '' };
    });
    setAuthorProfiles(nextProfiles);
    rebuildFromRaw(sortMode, replyOrder, nextProfiles, '已清空所有代号并重建脚本');
  };

  const handleRearrangeColorsAndApply = (
    sortMode: CommentSortMode,
    replyOrder: ReplyOrderMode,
    nextSettings: ColorArrangementSettings,
  ) => {
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

  const updateAuthorProfile = (author: string, updates: Partial<AuthorProfile>) => {
    const next = { ...authorProfiles, [author]: { ...(authorProfiles[author] || {}), ...updates } };
    setAuthorProfiles(next);
    persistAuthorProfiles(next);
  };

  const handleImageLayoutModeChange = (mode: ImageLayoutMode) => {
    setImageLayoutMode(mode);
    const newConfig = normalizeVideoConfig({ ...draftConfig, imageLayoutMode: mode });
    setVideoConfig(newConfig);
    setDraftConfig(newConfig);
    persistVideoConfig(newConfig);
  };

  const handleSceneLayoutChange = (layout: SceneLayoutType) => {
    setSceneLayout(layout);
    const newScenes = draftConfig.scenes.map(s => ({ ...s, layout }));
    const newConfig = normalizeVideoConfig({ ...draftConfig, scenes: newScenes });
    setVideoConfig(newConfig);
    setDraftConfig(newConfig);
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
              return match.includes('align=') ? match.replace(/align=[^ \]]+/, `align=${alignment}`) : match.slice(0, -1) + ` align=${alignment}]`;
            });
          }
          return { ...item, content: newContent };
        });
        return { ...scene, items: newItems };
      }
      return scene;
    });
    const newConfig = normalizeVideoConfig({ ...draftConfig, scenes: newScenes, titleAlignment: alignment });
    setVideoConfig(newConfig);
    setDraftConfig(newConfig);
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
              return match.includes('size=') ? match.replace(/size=\d+/, `size=${size}`) : match.slice(0, -1) + ` size=${size}]`;
            });
          }
          return { ...item, content: newContent };
        });
        return { ...scene, items: newItems };
      }
      return scene;
    });
    const newConfig = normalizeVideoConfig({ ...draftConfig, scenes: newScenes, titleFontSize: size });
    setVideoConfig(newConfig);
    setDraftConfig(newConfig);
    persistVideoConfig(newConfig);
  };

  const handleContentFontSizeChange = (size: number) => {
    setContentFontSize(size);
    const newScenes = draftConfig.scenes.map(scene => {
      const newItems = scene.items.map(item => {
        let newContent = item.content;
        newContent = newContent.split(/(\[style [^\]]*\])/g).map(part => {
          if (part.startsWith('[style') && !part.includes(' b')) {
            return part.includes('size=') ? part.replace(/size=\d+/, `size=${size}`) : part.slice(0, -1) + ` size=${size}]`;
          }
          return part;
        }).join('');
        return { ...item, content: newContent };
      });
      return { ...scene, items: newItems };
    });
    const newConfig = normalizeVideoConfig({ ...draftConfig, scenes: newScenes, contentFontSize: size });
    setVideoConfig(newConfig);
    setDraftConfig(newConfig);
    persistVideoConfig(newConfig);
  };

  const handleQuoteFontSizeChange = (size: number) => {
    setQuoteFontSize(size);
    const newConfig = normalizeVideoConfig({ ...draftConfig, quoteFontSize: size });
    setVideoConfig(newConfig);
    setDraftConfig(newConfig);
    persistVideoConfig(newConfig);
  };

  const handleMaxQuoteDepthChange = (depth: number) => {
    setMaxQuoteDepth(depth);
    const newConfig = normalizeVideoConfig({ ...draftConfig, maxQuoteDepth: depth });
    setVideoConfig(newConfig);
    setDraftConfig(newConfig);
    persistVideoConfig(newConfig);
  };

  const handleDefaultQuoteMaxLimitChange = (limit: number) => {
    setDefaultQuoteMaxLimit(limit);
    const newConfig = normalizeVideoConfig({ ...draftConfig, defaultQuoteMaxLimit: limit });
    setVideoConfig(newConfig);
    setDraftConfig(newConfig);
    persistVideoConfig(newConfig);
  };

  const handleSceneBackgroundColorChange = (color: string) => {
    setSceneBackgroundColor(color);
    const newScenes = draftConfig.scenes.map(scene => ({ ...scene, backgroundColor: color }));
    const newConfig = normalizeVideoConfig({ ...draftConfig, scenes: newScenes, sceneBackgroundColor: color });
    setVideoConfig(newConfig);
    setDraftConfig(newConfig);
    persistVideoConfig(newConfig);
  };

  const handleItemBackgroundColorChange = (color: string) => {
    setItemBackgroundColor(color);
    const newScenes = draftConfig.scenes.map(scene => ({
      ...scene,
      items: scene.items.map(item => ({ ...item, backgroundColor: color }))
    }));
    const newConfig = normalizeVideoConfig({ ...draftConfig, scenes: newScenes, itemBackgroundColor: color });
    setVideoConfig(newConfig);
    setDraftConfig(newConfig);
    persistVideoConfig(newConfig);
  };

  const handleQuoteBackgroundColorChange = (color: string) => {
    setQuoteBackgroundColor(color);
    const newConfig = normalizeVideoConfig({ ...draftConfig, quoteBackgroundColor: color });
    setVideoConfig(newConfig);
    setDraftConfig(newConfig);
    persistVideoConfig(newConfig);
  };

  const handleQuoteBorderColorChange = (color: string) => {
    setQuoteBorderColor(color);
    const newConfig = normalizeVideoConfig({ ...draftConfig, quoteBorderColor: color });
    setVideoConfig(newConfig);
    setDraftConfig(newConfig);
    persistVideoConfig(newConfig);
  };

  const setAllSceneLayouts = (layout: 'top' | 'center') => {
    const newScenes = draftConfig.scenes.map((s) => ({ ...s, layout }));
    const newConfig = normalizeVideoConfig({ ...draftConfig, scenes: newScenes });
    setVideoConfig(newConfig);
    setDraftConfig(newConfig);
    persistVideoConfig(newConfig);
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
      items: [{ id: 'item-' + Date.now(), author: 'NewUser', content: '' }]
    };
    const newConfig = normalizeVideoConfig({ ...draftConfig, scenes: [...draftConfig.scenes, newScene] });
    setVideoConfig(newConfig);
    setDraftConfig(newConfig);
    persistVideoConfig(newConfig);
  };

  return {
    handleApplyCommentSort, handleRandomizeAliasesAndApply, handleClearAliasesAndApply,
    handleRearrangeColorsAndApply, updateAuthorProfile, handleImageLayoutModeChange,
    handleSceneLayoutChange, handleTitleAlignmentChange, handleTitleFontSizeChange,
    handleContentFontSizeChange, handleQuoteFontSizeChange, handleMaxQuoteDepthChange,
    handleDefaultQuoteMaxLimitChange, handleSceneBackgroundColorChange,
    handleItemBackgroundColorChange, handleQuoteBackgroundColorChange,
    handleQuoteBorderColorChange, setAllSceneLayouts, addScene
  };
};