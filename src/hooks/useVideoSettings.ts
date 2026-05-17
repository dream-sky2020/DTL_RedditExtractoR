import { toast } from '@components/Toast';
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

type GlobalSceneLayout = Extract<SceneLayoutType, 'top' | 'center'>;

interface VideoSettingsOptions {
  videoConfig: VideoConfig;
  setVideoConfig: (config: VideoConfig) => void;
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
  setSceneLayout: (layout: GlobalSceneLayout) => void;
  setTitleAlignment: (alignment: TitleAlignmentType) => void;
  setTitleFontSize: (size: number) => void;
  setContentFontSize: (size: number) => void;
  setQuoteFontSize: (size: number) => void;
  setTitleFontColor: (color: string) => void;
  setContentFontColor: (color: string) => void;
  setQuoteFontColor: (color: string) => void;
  setTitleFontBold: (bold: boolean) => void;
  setContentFontBold: (bold: boolean) => void;
  setMaxQuoteDepth: (depth: number) => void;
  setDefaultQuoteMaxLimit: (limit: number) => void;
  setSceneBackgroundColor: (color: string) => void;
  setSceneBackgroundColorEnd: (color: string) => void;
  setSceneBackgroundGradientMode: (mode: boolean) => void;
  setItemBackgroundColor: (color: string) => void;
  setItemBackgroundColorEnd: (color: string) => void;
  setItemBackgroundGradientMode: (mode: boolean) => void;
  setQuoteBackgroundColor: (color: string) => void;
  setQuoteBorderColor: (color: string) => void;
  // 当前值（用于计算）
  titleAlignment: TitleAlignmentType;
  titleFontSize: number;
  contentFontSize: number;
  quoteFontSize: number;
  titleFontColor: string;
  contentFontColor: string;
  quoteFontColor: string;
  titleFontBold: boolean;
  contentFontBold: boolean;
  maxQuoteDepth: number;
  defaultQuoteMaxLimit: number;
  sceneBackgroundColor: string;
  sceneBackgroundColorEnd: string;
  sceneBackgroundGradientMode: boolean;
  itemBackgroundColor: string;
  itemBackgroundColorEnd: string;
  itemBackgroundGradientMode: boolean;
  quoteBackgroundColor: string;
  quoteBorderColor: string;
}

export const useVideoSettings = (opts: VideoSettingsOptions) => {
  const {
    videoConfig, setVideoConfig,
    commentSortMode, setCommentSortMode, replyOrderMode, setReplyOrderMode,
    rawResult, setResult, colorArrangement, setColorArrangement,
    allAuthors, authorProfiles, setAuthorProfiles, persistAuthorProfiles,
    setImageLayoutMode, setSceneLayout, setTitleAlignment,     setTitleFontSize,
    setContentFontSize, setQuoteFontSize, 
    setTitleFontColor, setContentFontColor, setQuoteFontColor,
    setTitleFontBold, setContentFontBold,
    setMaxQuoteDepth, setDefaultQuoteMaxLimit,
    setSceneBackgroundColor, setSceneBackgroundColorEnd, setSceneBackgroundGradientMode,
    setItemBackgroundColor, setItemBackgroundColorEnd, setItemBackgroundGradientMode,
    setQuoteBackgroundColor, setQuoteBorderColor,
    titleAlignment, titleFontSize, contentFontSize, quoteFontSize,
    titleFontColor, contentFontColor, quoteFontColor,
    titleFontBold, contentFontBold,
    maxQuoteDepth, defaultQuoteMaxLimit, 
    sceneBackgroundColor, sceneBackgroundColorEnd, sceneBackgroundGradientMode,
    itemBackgroundColor, itemBackgroundColorEnd, itemBackgroundGradientMode,
    quoteBackgroundColor, quoteBorderColor
  } = opts;

  // --- 统一的 [style] 标签更新逻辑 ---
  const updateStyleInContent = (
    content: string, 
    type: 'title' | 'context', 
    updates: Record<string, string | number | boolean>
  ) => {
    const typePattern = new RegExp(`type=${type}\\b`);
    return content.split(/(\[style [^\]]*\])/g).map(part => {
      if (part.startsWith('[style') && typePattern.test(part)) {
        let newTag = part;
        Object.entries(updates).forEach(([key, value]) => {
          if (key === 'b') {
            const hasB = /\bb\b/.test(newTag);
            if (value && !hasB) {
              newTag = newTag.slice(0, -1) + ' b]';
            } else if (!value && hasB) {
              newTag = newTag.replace(/\bb\b/, '').replace(/\s+/g, ' ').replace(' ]', ']');
            }
          } else {
            const regex = new RegExp(`${key}=([^ \\]]+)`);
            if (regex.test(newTag)) {
              newTag = newTag.replace(regex, `${key}=${value}`);
            } else {
              newTag = newTag.slice(0, -1) + ` ${key}=${value}]`;
            }
          }
        });
        return newTag;
      }
      return part;
    }).join('');
  };

  // --- 内部辅助函数 ---
  const interpolateColor = (color1: string, color2: string, factor: number) => {
    if (color1 === 'transparent' || color2 === 'transparent') {
      return factor < 0.5 ? color1 : color2;
    }
    
    const hex = (x: string) => {
      const h = x.replace('#', '');
      if (h.length === 3) return h.split('').map(c => c + c).join('');
      return h;
    };

    const r1 = parseInt(hex(color1).substring(0, 2), 16);
    const g1 = parseInt(hex(color1).substring(2, 4), 16);
    const b1 = parseInt(hex(color1).substring(4, 6), 16);

    const r2 = parseInt(hex(color2).substring(0, 2), 16);
    const g2 = parseInt(hex(color2).substring(2, 4), 16);
    const b2 = parseInt(hex(color2).substring(4, 6), 16);

    const r = Math.round(r1 + factor * (r2 - r1));
    const g = Math.round(g1 + factor * (g2 - g1));
    const b = Math.round(b1 + factor * (b2 - b1));

    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const applyColorsToConfig = (config: VideoConfig, overrideOpts?: Partial<VideoSettingsOptions>) => {
    const sColor = overrideOpts?.sceneBackgroundColor ?? sceneBackgroundColor;
    const sColorEnd = overrideOpts?.sceneBackgroundColorEnd ?? sceneBackgroundColorEnd;
    const sMode = overrideOpts?.sceneBackgroundGradientMode ?? sceneBackgroundGradientMode;
    const iColor = overrideOpts?.itemBackgroundColor ?? itemBackgroundColor;
    const iColorEnd = overrideOpts?.itemBackgroundColorEnd ?? itemBackgroundColorEnd;
    const iMode = overrideOpts?.itemBackgroundGradientMode ?? itemBackgroundGradientMode;

    const total = config.scenes.length;
    const nextScenes = config.scenes.map((scene, index) => {
      const factor = total > 1 ? index / (total - 1) : 0;
      
      const currentSceneBg = sMode ? interpolateColor(sColor, sColorEnd, factor) : sColor;
      const currentItemBg = iMode ? interpolateColor(iColor, iColorEnd, factor) : iColor;

      return {
        ...scene,
        backgroundColor: currentSceneBg,
        items: scene.items.map(item => ({ ...item, backgroundColor: currentItemBg }))
      };
    });

    return {
      ...config,
      scenes: nextScenes,
      sceneBackgroundColor: sColor,
      itemBackgroundColor: iColor,
    };
  };
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
    
    const avatarPool = [
      '01_dish.png', '02_dish_2.png', '03_dish_pile.png', '04_bowl.png', '05_apple_pie.png',
      '06_apple_pie_dish.png', '07_bread.png', '08_bread_dish.png', '09_baguette.png', '10_baguette_dish.png',
      '11_bun.png', '12_bun_dish.png', '13_bacon.png', '14_bacon_dish.png', '15_burger.png',
      '16_burger_dish.png', '17_burger_napkin.png', '18_burrito.png', '19_burrito_dish.png', '20_bagel.png',
      '21_bagel_dish.png', '22_cheesecake.png', '23_cheesecake_dish.png', '24_cheesepuff.png', '25_cheesepuff_bowl.png',
      '26_chocolate.png', '27_chocolate_dish.png', '28_cookies.png', '29_cookies_dish.png', '30_chocolatecake.png',
      '31_chocolatecake_dish.png', '32_curry.png', '33_curry_dish.png', '34_donut.png', '35_donut_dish.png',
      '36_dumplings.png', '37_dumplings_dish.png', '38_friedegg.png', '39_friedegg_dish.png', '40_eggsalad.png',
      '41_eggsalad_bowl.png', '42_eggtart.png', '43_eggtart_dish.png', '44_frenchfries.png', '45_frenchfries_dish.png',
      '46_fruitcake.png', '47_fruitcake_dish.png', '48_garlicbread.png', '49_garlicbread_dish.png', '50_giantgummybear.png',
      '51_giantgummybear_dish.png', '52_gingerbreadman.png', '53_gingerbreadman_dish.png', '54_hotdog.png', '55_hotdog_sauce.png',
      '56_hotdog_dish.png', '57_icecream.png', '58_icecream_bowl.png', '59_jelly.png', '60_jelly_dish.png',
      '61_jam.png', '62_jam_dish.png', '63_lemonpie.png', '64_lemonpie_dish.png', '65_loafbread.png',
      '66_loafbread_dish.png', '67_macncheese.png', '68_macncheese_dish.png', '69_meatball.png', '70_meatball_dish.png',
      '71_nacho.png', '72_nacho_dish.png', '73_omlet.png', '74_omlet_dish.png', '75_pudding.png',
      '76_pudding_dish.png', '77_potatochips.png', '78_potatochips_bowl.png', '79_pancakes.png', '80_pancakes_dish.png',
      '81_pizza.png', '82_pizza_dish.png', '83_popcorn.png', '84_popcorn_bowl.png', '85_roastedchicken.png',
      '86_roastedchicken_dish.png', '87_ramen.png', '88_salmon.png', '89_salmon_dish.png', '90_strawberrycake.png',
      '91_strawberrycake_dish.png', '92_sandwich.png', '93_sandwich_dish.png', '94_spaghetti.png', '95_steak.png',
      '96_steak_dish.png', '97_sushi.png', '98_sushi_dish.png', '99_taco.png', '100_taco_dish.png'
    ];

    authors.forEach((author, index) => {
      const existing = nextProfiles[author] || {};
      const needsColor = overwriteColors || !existing.color;
      const needsAvatar = !existing.avatar;

      if (needsColor || needsAvatar) {
        const profile = { ...existing };
        if (needsColor) {
          profile.color = buildColorWithSettings(index, settings);
        }
        if (needsAvatar) {
          const avatarIdx = Math.floor(pseudoRandom01(settings.seed + 1, index) * avatarPool.length);
          profile.avatar = `public/avatar/${avatarPool[avatarIdx]}`;
        }
        nextProfiles[author] = profile;
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
        content: `[style size=${titleSize} color=${opts.titleFontColor}${opts.titleFontBold ? ' b' : ''} align=${alignment} type=title]${nextResult.title}[/style]\n\n[style size=${contentSize} color=${opts.contentFontColor}${opts.contentFontBold ? ' b' : ''} type=title]${nextResult.content || ''}[/style]`,
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
        content: `[style size=${contentSize} color=${opts.contentFontColor}${opts.contentFontBold ? ' b' : ''} type=context]${c.body}[/style]`,
        replyChain: c.replyChain
      }]
    }));

    const baseConfig = {
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

    return applyColorsToConfig(baseConfig);
  };

  const rebuildFromRaw = (
    sortMode: CommentSortMode,
    replyOrder: ReplyOrderMode,
    profiles: Record<string, AuthorProfile>,
    successMessage: string,
  ) => {
    if (!rawResult) {
      toast.warning('请先提取 Reddit 数据，再进行排序重排');
      return;
    }

    setCommentSortMode(sortMode);
    setReplyOrderMode(replyOrder);

    const nextResult = transformRedditJson(rawResult, {
      sortMode,
      replyOrder,
      authorProfiles: profiles,
      imageLayoutMode: videoConfig.imageLayoutMode,
    });
    const nextConfig = {
      ...buildVideoConfigFromResult(
        nextResult,
        titleAlignment,
        titleFontSize,
        contentFontSize,
        videoConfig.canvas || createDefaultVideoCanvasConfig()
      ),
      imageLayoutMode: videoConfig.imageLayoutMode,
    };

    setResult(nextResult);
    const normalizedConfig = normalizeVideoConfig(nextConfig);
    setVideoConfig(normalizedConfig);
    toast.success(successMessage);
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
    const newConfig = normalizeVideoConfig({ ...videoConfig, imageLayoutMode: mode });
    setVideoConfig(newConfig);
  };

  const handleSceneLayoutChange = (layout: SceneLayoutType) => {
    if (layout !== 'bottom') {
      setSceneLayout(layout);
    }
    const newScenes = videoConfig.scenes.map(s => ({ ...s, layout }));
    const newConfig = normalizeVideoConfig({ ...videoConfig, scenes: newScenes });
    setVideoConfig(newConfig);
  };

  const handleTitleAlignmentChange = (alignment: TitleAlignmentType) => {
    setTitleAlignment(alignment);
    const newScenes = videoConfig.scenes.map(scene => {
      const newItems = scene.items.map(item => ({
        ...item,
        content: updateStyleInContent(item.content, 'title', { align: alignment })
      }));
      return { ...scene, items: newItems };
    });
    const newConfig = normalizeVideoConfig({ ...videoConfig, scenes: newScenes, titleAlignment: alignment });
    setVideoConfig(newConfig);
  };

  const handleTitleFontSizeChange = (size: number) => {
    setTitleFontSize(size);
    const newScenes = videoConfig.scenes.map(scene => {
      const newItems = scene.items.map(item => ({
        ...item,
        content: updateStyleInContent(item.content, 'title', { size })
      }));
      return { ...scene, items: newItems };
    });
    const newConfig = normalizeVideoConfig({ ...videoConfig, scenes: newScenes, titleFontSize: size });
    setVideoConfig(newConfig);
  };

  const handleContentFontSizeChange = (size: number) => {
    setContentFontSize(size);
    const newScenes = videoConfig.scenes.map(scene => {
      const newItems = scene.items.map(item => ({
        ...item,
        content: updateStyleInContent(item.content, 'context', { size })
      }));
      return { ...scene, items: newItems };
    });
    const newConfig = normalizeVideoConfig({ ...videoConfig, scenes: newScenes, contentFontSize: size });
    setVideoConfig(newConfig);
  };

  const handleTitleFontColorChange = (color: string) => {
    setTitleFontColor(color);
    const newScenes = videoConfig.scenes.map(scene => {
      const newItems = scene.items.map(item => ({
        ...item,
        content: updateStyleInContent(item.content, 'title', { color })
      }));
      return { ...scene, items: newItems };
    });
    const newConfig = normalizeVideoConfig({ ...videoConfig, scenes: newScenes, titleFontColor: color });
    setVideoConfig(newConfig);
  };

  const handleContentFontColorChange = (color: string) => {
    setContentFontColor(color);
    const newScenes = videoConfig.scenes.map(scene => {
      const newItems = scene.items.map(item => ({
        ...item,
        content: updateStyleInContent(item.content, 'context', { color })
      }));
      return { ...scene, items: newItems };
    });
    const newConfig = normalizeVideoConfig({ ...videoConfig, scenes: newScenes, contentFontColor: color });
    setVideoConfig(newConfig);
  };

  const handleTitleFontBoldChange = (bold: boolean) => {
    setTitleFontBold(bold);
    const newScenes = videoConfig.scenes.map(scene => {
      const newItems = scene.items.map(item => ({
        ...item,
        content: updateStyleInContent(item.content, 'title', { b: bold })
      }));
      return { ...scene, items: newItems };
    });
    const newConfig = normalizeVideoConfig({ ...videoConfig, scenes: newScenes, titleFontBold: bold });
    setVideoConfig(newConfig);
  };

  const handleContentFontBoldChange = (bold: boolean) => {
    setContentFontBold(bold);
    const newScenes = videoConfig.scenes.map(scene => {
      const newItems = scene.items.map(item => ({
        ...item,
        content: updateStyleInContent(item.content, 'context', { b: bold })
      }));
      return { ...scene, items: newItems };
    });
    const newConfig = normalizeVideoConfig({ ...videoConfig, scenes: newScenes, contentFontBold: bold });
    setVideoConfig(newConfig);
  };

  const handleQuoteFontColorChange = (color: string) => {
    setQuoteFontColor(color);
    const newConfig = normalizeVideoConfig({ ...videoConfig, quoteFontColor: color });
    setVideoConfig(newConfig);
  };

  const handleQuoteFontSizeChange = (size: number) => {
    setQuoteFontSize(size);
    const newConfig = normalizeVideoConfig({ ...videoConfig, quoteFontSize: size });
    setVideoConfig(newConfig);
  };

  const handleMaxQuoteDepthChange = (depth: number) => {
    setMaxQuoteDepth(depth);
    const newConfig = normalizeVideoConfig({ ...videoConfig, maxQuoteDepth: depth });
    setVideoConfig(newConfig);
  };

  const handleDefaultQuoteMaxLimitChange = (limit: number) => {
    setDefaultQuoteMaxLimit(limit);
    const newConfig = normalizeVideoConfig({ ...videoConfig, defaultQuoteMaxLimit: limit });
    setVideoConfig(newConfig);
  };

  const handleQuoteBackgroundColorChange = (color: string) => {
    setQuoteBackgroundColor(color);
    const newConfig = normalizeVideoConfig({ ...videoConfig, quoteBackgroundColor: color });
    setVideoConfig(newConfig);
  };

  const handleQuoteBorderColorChange = (color: string) => {
    setQuoteBorderColor(color);
    const newConfig = normalizeVideoConfig({ ...videoConfig, quoteBorderColor: color });
    setVideoConfig(newConfig);
  };

  const setAllSceneLayouts = (layout: 'top' | 'center') => {
    const newScenes = videoConfig.scenes.map((s) => ({ ...s, layout }));
    const newConfig = normalizeVideoConfig({ ...videoConfig, scenes: newScenes });
    setVideoConfig(newConfig);
    toast.success(`已将全部画面格布局设为 ${layout}`);
  };

  const addScene = () => {
    const newScene: VideoScene = {
      id: 'scene-' + Date.now(),
      type: 'comments',
      title: '新建画面格',
      layout: 'top',
      backgroundColor: sceneBackgroundColor,
      duration: 5,
      items: [{ id: 'item-' + Date.now(), author: 'NewUser', content: '', backgroundColor: itemBackgroundColor }]
    };
    const newConfig = normalizeVideoConfig(applyColorsToConfig({ ...videoConfig, scenes: [...videoConfig.scenes, newScene] }));
    setVideoConfig(newConfig);
  };

  const setAllSceneDurations = (duration: number) => {
    const newScenes = videoConfig.scenes.map((s) => ({
      ...s,
      duration,
      items: s.items.map((item) => ({
        ...item,
        exitAt: duration,
      })),
    }));
    const newConfig = normalizeVideoConfig({ ...videoConfig, scenes: newScenes });
    setVideoConfig(newConfig);
    toast.success(`已将全部画面格及元素时长统一设为 ${duration}s`);
  };

  const handleRefreshStyles = () => {
    const newScenes = videoConfig.scenes.map(scene => {
      const newItems = scene.items.map(item => {
        let newContent = item.content;
        // 更新 title 类型的 style 标签
        newContent = updateStyleInContent(newContent, 'title', {
          size: titleFontSize,
          color: titleFontColor,
          align: titleAlignment,
          b: titleFontBold
        });
        // 更新 context 类型的 style 标签
        newContent = updateStyleInContent(newContent, 'context', {
          size: contentFontSize,
          color: contentFontColor,
          b: contentFontBold
        });
        return { ...item, content: newContent };
      });
      return { ...scene, items: newItems };
    });

    const newConfig = normalizeVideoConfig({
      ...videoConfig,
      scenes: newScenes,
      titleFontSize,
      contentFontSize,
      titleFontColor,
      contentFontColor,
      titleFontBold,
      contentFontBold,
      titleAlignment,
    });
    setVideoConfig(newConfig);
    toast.success('已刷新所有画面格样式（保留结构）');
  };

  const handleRearrangeScenes = (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => {
    if (!rawResult) {
      toast.warning('请先提取 Reddit 数据，再进行排序重排');
      return;
    }

    setCommentSortMode(sortMode);
    setReplyOrderMode(replyOrder);

    // 重新获取排序后的结果，但仅用于获取 ID 顺序
    const nextResult = transformRedditJson(rawResult, {
      sortMode,
      replyOrder,
      authorProfiles,
      imageLayoutMode: videoConfig.imageLayoutMode,
    });

    // 获取排序后的 ID 列表
    const sortedIds = nextResult.comments.map((c: any) => 'scene-' + c.id);
    // 贴子场景通常在最前面
    const postSceneId = videoConfig.scenes.find(s => s.type === 'post')?.id;
    const finalIdOrder = postSceneId ? [postSceneId, ...sortedIds] : sortedIds;

    // 根据 ID 顺序重排现有的 scenes
    const currentScenes = [...videoConfig.scenes];
    const rearrangedScenes: VideoScene[] = [];
    
    finalIdOrder.forEach(id => {
      const scene = currentScenes.find(s => s.id === id);
      if (scene) {
        rearrangedScenes.push(scene);
      }
    });

    // 如果有些场景不在排序结果中（可能是手动添加的），把它们放在最后
    currentScenes.forEach(scene => {
      if (!rearrangedScenes.find(s => s.id === scene.id)) {
        rearrangedScenes.push(scene);
      }
    });

    const nextConfig = normalizeVideoConfig({
      ...videoConfig,
      scenes: rearrangedScenes,
    });

    setVideoConfig(nextConfig);
    toast.success('已根据新规则重排画面顺序（保留手动修改）');
  };

  const handleResetAndRebuild = (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => {
    rebuildFromRaw(sortMode, replyOrder, authorProfiles, '已重置并重新生成脚本');
  };

  const handleRefreshAliases = () => {
    // 实际上 authorProfiles 改变后，渲染层会自动响应（如果它是从 store 读取的）
    // 但为了保险，我们可以触发一次 config 的更新
    setVideoConfig({ ...videoConfig });
    toast.success('已刷新代号映射');
  };

  return {
    handleApplyCommentSort, handleRandomizeAliasesAndApply, handleClearAliasesAndApply,
    handleRearrangeColorsAndApply, updateAuthorProfile, handleImageLayoutModeChange,
    handleSceneLayoutChange, handleTitleAlignmentChange, handleTitleFontSizeChange,
    handleContentFontSizeChange, handleTitleFontColorChange, handleContentFontColorChange,
    handleTitleFontBoldChange, handleContentFontBoldChange, handleQuoteFontColorChange,
    handleQuoteFontSizeChange, handleMaxQuoteDepthChange,
    handleDefaultQuoteMaxLimitChange,
    handleQuoteBackgroundColorChange,
    handleQuoteBorderColorChange,
    setAllSceneLayouts, addScene, setAllSceneDurations,
    handleRefreshStyles, handleRearrangeScenes, handleResetAndRebuild, handleRefreshAliases
  };
};