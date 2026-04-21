import React, { useState, useEffect } from 'react';
import {
  message,
} from 'antd';
import axios from 'axios';
import './style/colors.css';
import './style/style.css';
import './style/tables.css';
import {
  transformRedditJson,
  extractAuthorsFromRawData,
} from './utils/redditTransformer';
import { generateRandomAliasProfiles } from './utils/aliasGenerator';
import {
  VideoConfig,
  TitleAlignmentType,
  ToolKey,
  CommentSortMode,
  ReplyOrderMode,
  AuthorProfile,
  ColorArrangementSettings,
  GlobalSettings,
  DEFAULT_GLOBAL_SETTINGS,
} from './types';
import { createDefaultVideoCanvasConfig, normalizeVideoConfig } from './rendering/videoCanvas';
import { hslToHex } from './utils/color/hslToHex';
import { pseudoRandom01 } from './utils/random/pseudoRandom01';

import { MainLayout } from './pages/MainPages';

const RAW_REDDIT_DATA_STORAGE_KEY = 'reddit-extractor.raw-reddit-data.v1';
const VIDEO_CONFIG_STORAGE_KEY = 'reddit-extractor.video-config.v1';
const AUTHOR_PROFILES_STORAGE_KEY = 'reddit-extractor.author-profiles.v1';
const GLOBAL_CONFIG_STORAGE_KEY = 'reddit-extractor.global-config.v1';

const App: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolKey>('extract');
  const [redditUrl, setRedditUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [rawResult, setRawResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [errorDebug, setErrorDebug] = useState('');
  const [commentSortMode, setCommentSortMode] = useState<CommentSortMode>(DEFAULT_GLOBAL_SETTINGS.commentSortMode);
  const [replyOrderMode, setReplyOrderMode] = useState<ReplyOrderMode>(DEFAULT_GLOBAL_SETTINGS.replyOrderMode);
  const [imageLayoutMode, setImageLayoutMode] = useState<'gallery' | 'row' | 'single'>(DEFAULT_GLOBAL_SETTINGS.imageLayoutMode);
  const [sceneLayout, setSceneLayout] = useState<'top' | 'center'>(DEFAULT_GLOBAL_SETTINGS.sceneLayout);
  const [titleAlignment, setTitleAlignment] = useState<TitleAlignmentType>(DEFAULT_GLOBAL_SETTINGS.titleAlignment);
  const [titleFontSize, setTitleFontSize] = useState<number>(DEFAULT_GLOBAL_SETTINGS.titleFontSize);
  const [contentFontSize, setContentFontSize] = useState<number>(DEFAULT_GLOBAL_SETTINGS.contentFontSize);
  const [quoteFontSize, setQuoteFontSize] = useState<number>(DEFAULT_GLOBAL_SETTINGS.quoteFontSize);
  const [maxQuoteDepth, setMaxQuoteDepth] = useState<number>(DEFAULT_GLOBAL_SETTINGS.maxQuoteDepth);
  const [defaultQuoteMaxLimit, setDefaultQuoteMaxLimit] = useState<number>(DEFAULT_GLOBAL_SETTINGS.defaultQuoteMaxLimit);
  const [sceneBackgroundColor, setSceneBackgroundColor] = useState<string>(DEFAULT_GLOBAL_SETTINGS.sceneBackgroundColor);
  const [itemBackgroundColor, setItemBackgroundColor] = useState<string>(DEFAULT_GLOBAL_SETTINGS.itemBackgroundColor);
  const [quoteBackgroundColor, setQuoteBackgroundColor] = useState<string>(DEFAULT_GLOBAL_SETTINGS.quoteBackgroundColor);
  const [quoteBorderColor, setQuoteBorderColor] = useState<string>(DEFAULT_GLOBAL_SETTINGS.quoteBorderColor);
  const [allAuthors, setAllAuthors] = useState<string[]>([]);
  const [authorProfiles, setAuthorProfiles] = useState<Record<string, AuthorProfile>>({});
  const [colorArrangement, setColorArrangement] = useState<ColorArrangementSettings>({
    mode: 'uniform',
    hueOffset: 0,
    hueStep: 137.508,
    saturation: 68,
    lightness: 52,
    seed: 20260402,
  });
  const [isExportModalVisible, setIsExportModalVisible] = useState(false);
  const [isAutoRendering, setIsAutoRendering] = useState(false);
  const [autoRenderStatus, setAutoRenderStatus] = useState<any>(null);
  const [renderProgress, setRenderProgress] = useState<{ percent: number, task: string, detail?: string } | null>(null);
  const [hasStoredRawData, setHasStoredRawData] = useState(false);
  const [selectedSceneIdx, setSelectedSceneIdx] = useState<number>(0);

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
    const postScene = {
      id: 'scene-post-' + Date.now(),
      type: 'post' as const,
      title: '贴子正文',
      layout: 'top' as const,
      duration: 5,
      items: [{
        id: 'post-content',
        author: nextResult.author,
        content: `[style size=${titleSize} b align=${alignment}]${nextResult.title}[/style]\n\n[style size=${contentSize}]${nextResult.content || ''}[/style]`,
      }]
    };

    const commentScenes = nextResult.comments.map((c: any) => ({
      id: 'scene-' + c.id,
      type: 'comments' as const,
      title: `评论 u/${c.author}`,
      layout: 'center' as const,
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

  const persistRawRedditData = (raw: any) => {
    try {
      localStorage.setItem(RAW_REDDIT_DATA_STORAGE_KEY, JSON.stringify(raw));
      setHasStoredRawData(true);
    } catch (err) {
      console.warn('保存原始 Reddit 数据到 localStorage 失败:', err);
    }
  };

  const persistVideoConfig = (config: VideoConfig) => {
    try {
      localStorage.setItem(VIDEO_CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch (err) {
      console.warn('保存视频配置到 localStorage 失败:', err);
    }
  };

  const persistAuthorProfiles = (profiles: Record<string, AuthorProfile>) => {
    try {
      localStorage.setItem(AUTHOR_PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    } catch (err) {
      console.warn('保存作者配置到 localStorage 失败:', err);
    }
  };

  const persistGlobalConfig = (settings: GlobalSettings) => {
    try {
      localStorage.setItem(GLOBAL_CONFIG_STORAGE_KEY, JSON.stringify(settings));
    } catch (err) {
      console.warn('保存全局配置到 localStorage 失败:', err);
    }
  };

  const restoreRawRedditData = () => {
    try {
      const cached = localStorage.getItem(RAW_REDDIT_DATA_STORAGE_KEY);
      if (!cached) return null;
      return JSON.parse(cached);
    } catch (err) {
      console.warn('读取 localStorage 中的原始 Reddit 数据失败:', err);
      return null;
    }
  };

  const restoreVideoConfig = () => {
    try {
      const cached = localStorage.getItem(VIDEO_CONFIG_STORAGE_KEY);
      if (!cached) return null;
      return normalizeVideoConfig(JSON.parse(cached));
    } catch (err) {
      console.warn('读取 localStorage 中的视频配置失败:', err);
      return null;
    }
  };

  const restoreAuthorProfiles = () => {
    try {
      const cached = localStorage.getItem(AUTHOR_PROFILES_STORAGE_KEY);
      if (!cached) return {};
      return JSON.parse(cached);
    } catch (err) {
      console.warn('读取 localStorage 中的作者配置失败:', err);
      return {};
    }
  };

  const restoreGlobalConfig = (): GlobalSettings => {
    try {
      const cached = localStorage.getItem(GLOBAL_CONFIG_STORAGE_KEY);
      if (!cached) return DEFAULT_GLOBAL_SETTINGS;
      return { ...DEFAULT_GLOBAL_SETTINGS, ...JSON.parse(cached) };
    } catch (err) {
      console.warn('读取 localStorage 中的全局配置失败:', err);
      return DEFAULT_GLOBAL_SETTINGS;
    }
  };

  const clearPersistedRawRedditData = () => {
    try {
      localStorage.removeItem(RAW_REDDIT_DATA_STORAGE_KEY);
      localStorage.removeItem(VIDEO_CONFIG_STORAGE_KEY);
      localStorage.removeItem(AUTHOR_PROFILES_STORAGE_KEY);
      localStorage.removeItem(GLOBAL_CONFIG_STORAGE_KEY);
      setHasStoredRawData(false);
      message.success('已清除本地缓存的所有数据');
    } catch (err) {
      console.warn('清除 localStorage 数据失败:', err);
      message.error('清除缓存失败，请重试');
    }
  };

  // 视频配置状态，初始使用默认值
  const [videoConfig, setVideoConfig] = useState<VideoConfig>({
    title: '你的精彩标题',
    subreddit: 'interestingasfuck',
    canvas: createDefaultVideoCanvasConfig(),
    scenes: [
      {
        id: 'scene-main',
        type: 'post',
        title: '贴子正文',
        duration: 5,
        items: [
          {
            id: 'main-post',
            author: 'RedditUser',
            content: '这里是你的视频正文内容预览。你可以通过抓取 Reddit 链接自动填充，或者在这里手动修改。'
          }
        ]
      }
    ]
  });

  // 编辑中的临时配置
  const [draftConfig, setDraftConfig] = useState<VideoConfig>(videoConfig);

  // 页面刷新后恢复最近一次提取的原始 Reddit 数据
  useEffect(() => {
    const cachedRawResult = restoreRawRedditData();
    const cachedVideoConfig = restoreVideoConfig();
    const cachedAuthorProfiles = restoreAuthorProfiles();
    const cachedGlobalConfig = restoreGlobalConfig();

    if (cachedAuthorProfiles) {
      setAuthorProfiles(cachedAuthorProfiles);
    }

    if (cachedGlobalConfig) {
      setCommentSortMode(cachedGlobalConfig.commentSortMode);
      setReplyOrderMode(cachedGlobalConfig.replyOrderMode);
      setImageLayoutMode(cachedGlobalConfig.imageLayoutMode);
      setSceneLayout(cachedGlobalConfig.sceneLayout);
      if (cachedGlobalConfig.titleAlignment) {
        setTitleAlignment(cachedGlobalConfig.titleAlignment);
      }
      if (cachedGlobalConfig.titleFontSize) {
        setTitleFontSize(cachedGlobalConfig.titleFontSize);
      }
      if (cachedGlobalConfig.contentFontSize) {
        setContentFontSize(cachedGlobalConfig.contentFontSize);
      }
      if (cachedGlobalConfig.quoteFontSize) {
        setQuoteFontSize(cachedGlobalConfig.quoteFontSize);
      }
      if (cachedGlobalConfig.maxQuoteDepth) {
        setMaxQuoteDepth(cachedGlobalConfig.maxQuoteDepth);
      }
      if (cachedGlobalConfig.defaultQuoteMaxLimit) {
        setDefaultQuoteMaxLimit(cachedGlobalConfig.defaultQuoteMaxLimit);
      }
      if (cachedGlobalConfig.sceneBackgroundColor) {
        setSceneBackgroundColor(cachedGlobalConfig.sceneBackgroundColor);
      }
      if (cachedGlobalConfig.itemBackgroundColor) {
        setItemBackgroundColor(cachedGlobalConfig.itemBackgroundColor);
      }
      if (cachedGlobalConfig.quoteBackgroundColor) {
        setQuoteBackgroundColor(cachedGlobalConfig.quoteBackgroundColor);
      }
      if (cachedGlobalConfig.quoteBorderColor) {
        setQuoteBorderColor(cachedGlobalConfig.quoteBorderColor);
      }
    }

    if (cachedVideoConfig) {
      setVideoConfig(cachedVideoConfig);
      setDraftConfig(cachedVideoConfig);
    }

    if (cachedRawResult) {
      const nextAuthors = extractAuthorsFromRawData(cachedRawResult);
      // 如果没有缓存的作者配置，则生成
      const nextProfiles = Object.keys(cachedAuthorProfiles).length > 0 
        ? cachedAuthorProfiles 
        : buildProfilesForAuthors(nextAuthors, {}, colorArrangement);
      
      const nextResult = transformRedditJson(cachedRawResult, {
        sortMode: cachedGlobalConfig.commentSortMode,
        replyOrder: cachedGlobalConfig.replyOrderMode,
        authorProfiles: nextProfiles,
        imageLayoutMode: cachedVideoConfig?.imageLayoutMode || cachedGlobalConfig.imageLayoutMode,
      });

      setRawResult(cachedRawResult);
      setAllAuthors(nextAuthors);
      setResult(nextResult);
      setHasStoredRawData(true);
      
      // 如果没有缓存的视频配置，则根据提取结果生成
      if (!cachedVideoConfig) {
        const nextConfig = buildVideoConfigFromResult(
          nextResult,
          cachedGlobalConfig.titleAlignment || 'center',
          cachedGlobalConfig.titleFontSize || 64,
          cachedGlobalConfig.contentFontSize || 32,
          createDefaultVideoCanvasConfig()
        );
        setVideoConfig(nextConfig);
        setDraftConfig(nextConfig);
      }
      
      message.success('已从本地缓存恢复最近一次的数据');
    }
  }, []);

  // 监听全局配置变化并持久化
  useEffect(() => {
    persistGlobalConfig({
      commentSortMode,
      replyOrderMode,
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
    });
  }, [commentSortMode, replyOrderMode, imageLayoutMode, sceneLayout, titleAlignment, titleFontSize, contentFontSize, quoteFontSize, maxQuoteDepth, defaultQuoteMaxLimit, sceneBackgroundColor, itemBackgroundColor, quoteBackgroundColor, quoteBorderColor]);

  // 当抓取结果更新时，自动同步到草稿配置
  useEffect(() => {
    if (result) {
      const newConfig: VideoConfig = {
        ...buildVideoConfigFromResult(
          result, 
          titleAlignment, 
          titleFontSize, 
          contentFontSize,
          draftConfig.canvas || videoConfig.canvas || createDefaultVideoCanvasConfig()
        ),
        imageLayoutMode: imageLayoutMode, // 使用当前全局设置
        titleAlignment: titleAlignment, // 使用当前全局设置
        titleFontSize: titleFontSize,
        contentFontSize: contentFontSize,
        quoteFontSize: quoteFontSize,
        quoteBackgroundColor: quoteBackgroundColor,
        quoteBorderColor: quoteBorderColor,
        maxQuoteDepth: maxQuoteDepth,
        defaultQuoteMaxLimit: defaultQuoteMaxLimit,
        sceneBackgroundColor: sceneBackgroundColor,
        itemBackgroundColor: itemBackgroundColor,
      };
      
      // 统一应用当前场景布局，并保持全局颜色设置
      newConfig.scenes = newConfig.scenes.map((scene) => ({
        ...scene,
        layout: sceneLayout,
        backgroundColor: sceneBackgroundColor,
        items: scene.items.map((item) => ({ ...item, backgroundColor: itemBackgroundColor })),
      }));
      
      setVideoConfig(newConfig);
      setDraftConfig(newConfig);
      persistVideoConfig(newConfig);
    }
  }, [result]);

  const resetResultState = () => {
    setError('');
    setErrorDebug('');
    setResult(null);
    setRawResult(null);
  };

  const fetchRedditData = async () => {
    if (!redditUrl.trim()) return;

    setLoading(true);
    resetResultState();

    try {
      const jsonUrl = `${redditUrl.trim().replace(/\/$/, '')}.json`;
      // 使用 Python 后端代理抓取，彻底解决浏览器跨域 (CORS) 限制和 User-Agent 伪装问题
      const proxyUrl = `http://localhost:5000/fetch_reddit?url=${encodeURIComponent(jsonUrl)}`;
      const response = await axios.get(proxyUrl);
      
      const nextAuthors = extractAuthorsFromRawData(response.data);
      const nextProfiles = buildProfilesForAuthors(nextAuthors, authorProfiles, colorArrangement);
      setAllAuthors(nextAuthors);
      setAuthorProfiles(nextProfiles);
      persistAuthorProfiles(nextProfiles); // 持久化作者配置
      persistRawRedditData(response.data);
      setRawResult(response.data);
      setResult(transformRedditJson(response.data, {
        sortMode: commentSortMode,
        replyOrder: replyOrderMode,
        authorProfiles: nextProfiles,
        imageLayoutMode: videoConfig.imageLayoutMode,
      }));
      message.success('数据提取成功，已同步至视频配置');
    } catch (err) {
      console.error(err);
      setError('抓取失败，请检查 URL 是否正确或存在跨域限制。');
      if (axios.isAxiosError(err)) {
        const debugInfo = {
          url: err.config?.url ?? 'unknown',
          method: err.config?.method ?? 'get',
          code: err.code ?? 'unknown',
          status: err.response?.status ?? 'no_response',
          statusText: err.response?.statusText ?? 'unknown',
          message: err.message,
          responseData:
            typeof err.response?.data === 'string'
              ? err.response.data.slice(0, 600)
              : JSON.stringify(err.response?.data ?? null, null, 2)?.slice(0, 600),
        };
        setErrorDebug(JSON.stringify(debugInfo, null, 2));
      } else {
        setErrorDebug(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setLoading(false);
    }
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
    setVideoConfig(nextConfig);
    setDraftConfig(nextConfig);
    message.success(successMessage);
  };

  const applyCommentSortInEditor = (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => {
    setCommentSortMode(sortMode);
    setReplyOrderMode(replyOrder);
    rebuildFromRaw(sortMode, replyOrder, authorProfiles, '评论排序已应用并重排脚本');
  };

  const updateAuthorProfile = (
    author: string,
    updates: Partial<AuthorProfile>,
  ) => {
    setAuthorProfiles((prev) => {
      const next = {
        ...prev,
        [author]: {
          ...(prev[author] || {}),
          ...updates,
        },
      };
      persistAuthorProfiles(next); // 持久化更新
      return next;
    });
  };

  const applyIdentityAndSortInEditor = (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => {
    applyCommentSortInEditor(sortMode, replyOrder);
  };

  const randomizeAliasesAndApplyInEditor = (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => {
    setCommentSortMode(sortMode);
    setReplyOrderMode(replyOrder);
    const nextProfiles = generateRandomAliasProfiles(allAuthors, authorProfiles);
    setAuthorProfiles(nextProfiles);
    rebuildFromRaw(sortMode, replyOrder, nextProfiles, '已随机生成代号并重建脚本');
  };

  const clearAliasesAndApplyInEditor = (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => {
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

  const rearrangeColorsAndApplyInEditor = (
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

  const copyToClipboard = async () => {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      message.success('JSON 已复制到剪贴板');
    } catch (err) {
      console.error(err);
      message.error('复制失败，请重试');
    }
  };

  const downloadVideoConfig = () => {
    const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(videoConfig, null, 2))}`;
    const anchor = document.createElement('a');
    anchor.setAttribute('href', dataStr);
    anchor.setAttribute('download', `video-config.json`);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    message.success('配置文件已下载');
  };

  const startAutoRender = async () => {
    setIsAutoRendering(true);
    setAutoRenderStatus(null);
    setRenderProgress({ percent: 0, task: '🚀 正在初始化渲染...' });
    
    try {
      const response = await fetch('http://localhost:5000/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(videoConfig)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '服务器响应异常' }));
        throw new Error(errorData.message || `HTTP 错误: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('无法建立数据流连接');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        // 按照换行符分割 JSON 行
        const lines = buffer.split('\n');
        // 最后一行如果不完整，留在 buffer 里
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.type === 'progress') {
              setRenderProgress({
                percent: data.percent,
                task: data.task,
                detail: data.detail
              });
            } else if (data.type === 'success') {
              setRenderProgress({ percent: 100, task: '✅ 渲染完成！' });
              setAutoRenderStatus({ 
                type: 'success', 
                message: `视频导出成功！位置：${data.path}` 
              });
              message.success('渲染成功！');
            } else if (data.type === 'error') {
              setAutoRenderStatus({ type: 'error', message: data.message });
              message.error(data.message);
            }
          } catch (e) {
            console.warn('解析 JSON 行失败:', line);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setAutoRenderStatus({ 
        type: 'error', 
        message: `错误: ${err.message || '连接本地 Python 服务失败。'}` 
      });
    } finally {
      setIsAutoRendering(false);
    }
  };

  const onMenuSelect = (info: { key: string }) => {
    setActiveTool(info.key as ToolKey);
  };

  return (
    <MainLayout
      collapsed={collapsed}
      setCollapsed={setCollapsed}
      headerHidden={headerHidden}
      setHeaderHidden={setHeaderHidden}
      activeTool={activeTool}
      setActiveTool={setActiveTool}
      redditUrl={redditUrl}
      setRedditUrl={setRedditUrl}
      loading={loading}
      error={error}
      errorDebug={errorDebug}
      result={result}
      rawResult={rawResult}
      hasStoredRawData={hasStoredRawData}
      videoConfig={videoConfig}
      setVideoConfig={setVideoConfig}
      draftConfig={draftConfig}
      setDraftConfig={setDraftConfig}
      commentSortMode={commentSortMode}
      replyOrderMode={replyOrderMode}
      imageLayoutMode={imageLayoutMode}
      setImageLayoutMode={setImageLayoutMode}
      sceneLayout={sceneLayout}
      setSceneLayout={setSceneLayout}
      titleAlignment={titleAlignment}
      setTitleAlignment={setTitleAlignment}
      titleFontSize={titleFontSize}
      setTitleFontSize={setTitleFontSize}
      contentFontSize={contentFontSize}
      setContentFontSize={setContentFontSize}
      quoteFontSize={quoteFontSize}
      setQuoteFontSize={setQuoteFontSize}
      maxQuoteDepth={maxQuoteDepth}
      setMaxQuoteDepth={setMaxQuoteDepth}
      defaultQuoteMaxLimit={defaultQuoteMaxLimit}
      setDefaultQuoteMaxLimit={setDefaultQuoteMaxLimit}
      sceneBackgroundColor={sceneBackgroundColor}
      setSceneBackgroundColor={setSceneBackgroundColor}
      itemBackgroundColor={itemBackgroundColor}
      setItemBackgroundColor={setItemBackgroundColor}
      quoteBackgroundColor={quoteBackgroundColor}
      setQuoteBackgroundColor={setQuoteBackgroundColor}
      quoteBorderColor={quoteBorderColor}
      setQuoteBorderColor={setQuoteBorderColor}
      allAuthors={allAuthors}
      authorProfiles={authorProfiles}
      updateAuthorProfile={updateAuthorProfile}
      colorArrangement={colorArrangement}
      fetchRedditData={fetchRedditData}
      clearPersistedRawRedditData={clearPersistedRawRedditData}
      copyToClipboard={copyToClipboard}
      applyIdentityAndSortInEditor={applyIdentityAndSortInEditor}
      randomizeAliasesAndApplyInEditor={randomizeAliasesAndApplyInEditor}
      clearAliasesAndApplyInEditor={clearAliasesAndApplyInEditor}
      rearrangeColorsAndApplyInEditor={rearrangeColorsAndApplyInEditor}
      normalizeVideoConfig={normalizeVideoConfig}
      persistVideoConfig={persistVideoConfig}
      onMenuSelect={onMenuSelect}
      isExportModalVisible={isExportModalVisible}
      setIsExportModalVisible={setIsExportModalVisible}
      isAutoRendering={isAutoRendering}
      autoRenderStatus={autoRenderStatus}
      renderProgress={renderProgress}
      startAutoRender={startAutoRender}
      downloadVideoConfig={downloadVideoConfig}
      selectedSceneIdx={selectedSceneIdx}
      setSelectedSceneIdx={setSelectedSceneIdx}
    />
  );
};

export default App;
