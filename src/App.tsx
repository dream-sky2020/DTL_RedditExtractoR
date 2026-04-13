import React, { useState, useMemo, useEffect } from 'react';
import {
  Layout,
  Menu,
  Button,
  Tag,
  Typography,
  message,
  App as AntdApp,
} from 'antd';
import {
  AppstoreOutlined,
  LinkOutlined,
  CodeOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  VideoCameraOutlined,
  EditOutlined,
  FileImageOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  SoundOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import './style/colors.css';
import './style/style.css';
import './style/tables.css';
import {
  transformRedditJson,
  CommentSortMode,
  ReplyOrderMode,
  AuthorProfile,
  extractAuthorsFromRawData,
} from './utils/redditTransformer';
import { generateRandomAliasProfiles } from './utils/aliasGenerator';
import { VideoConfig, VideoScene } from './types';

// Pages
import { ExtractPage } from './pages/ExtractPage/index';
import { EditorPage } from './pages/EditorPage/index';
import { VideoPreviewPage } from './pages/VideoPreviewPage/index';
import { FilteredJsonPage } from './pages/FilteredJsonPage/index';
import { RawJsonPage } from './pages/RawJsonPage/index';
import { FrameTestPage } from './pages/FrameTestPage/index';
import { ScriptJsonPage } from './pages/ScriptJsonPage/index';
import { SlidePreviewPage } from './pages/SlidePreviewPage/index';
import { SimulationPage } from './pages/SimulationPage/index';
import { AudioPreviewPage } from './pages/AudioPreviewPage/index';
import { ComponentTestPage } from './pages/ComponentTestPage/index';
import { DialogsInit } from './components/Dialogs';
import { ToastInit } from './components/Toast';

const { Header, Sider, Content } = Layout;
const RAW_REDDIT_DATA_STORAGE_KEY = 'reddit-extractor.raw-reddit-data.v1';
const VIDEO_CONFIG_STORAGE_KEY = 'reddit-extractor.video-config.v1';
const AUTHOR_PROFILES_STORAGE_KEY = 'reddit-extractor.author-profiles.v1';

type ToolKey = 'extract' | 'raw_data' | 'filtered_data' | 'script_data' | 'editor' | 'preview' | 'static_preview' | 'frame_test' | 'simulation' | 'audio_preview' | 'component_test';
type ColorArrangementMode = 'uniform' | 'randomized';
interface ColorArrangementSettings {
  mode: ColorArrangementMode;
  hueOffset: number;
  hueStep: number;
  saturation: number;
  lightness: number;
  seed: number;
}

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
  const [commentSortMode, setCommentSortMode] = useState<CommentSortMode>('best');
  const [replyOrderMode, setReplyOrderMode] = useState<ReplyOrderMode>('preserve');
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
  const [hasStoredRawData, setHasStoredRawData] = useState(false);

  const hslToHex = (h: number, s: number, l: number) => {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const hp = h / 60;
    const x = c * (1 - Math.abs((hp % 2) - 1));
    let r1 = 0;
    let g1 = 0;
    let b1 = 0;
    if (hp >= 0 && hp < 1) [r1, g1, b1] = [c, x, 0];
    else if (hp < 2) [r1, g1, b1] = [x, c, 0];
    else if (hp < 3) [r1, g1, b1] = [0, c, x];
    else if (hp < 4) [r1, g1, b1] = [0, x, c];
    else if (hp < 5) [r1, g1, b1] = [x, 0, c];
    else [r1, g1, b1] = [c, 0, x];
    const m = l - c / 2;
    const r = Math.round((r1 + m) * 255).toString(16).padStart(2, '0');
    const g = Math.round((g1 + m) * 255).toString(16).padStart(2, '0');
    const b = Math.round((b1 + m) * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  };

  const pseudoRandom01 = (seed: number, index: number) => {
    const x = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
    return x - Math.floor(x);
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

  const buildVideoConfigFromResult = (nextResult: any): VideoConfig => {
    const postScene: VideoScene = {
      id: 'scene-post-' + Date.now(),
      type: 'post',
      title: '贴子正文',
      duration: 5,
      items: [{
        id: 'post-content',
        author: nextResult.author,
        content: nextResult.content || nextResult.title,
      }]
    };

    const commentScenes: VideoScene[] = nextResult.comments.map((c: any) => ({
      id: 'scene-' + c.id,
      type: 'comments',
      title: `评论 u/${c.author}`,
      duration: 3,
      items: [{
        id: c.id,
        author: c.author,
        content: c.body,
        replyChain: c.replyChain
      }]
    }));

    return {
      title: nextResult.title,
      subreddit: nextResult.subreddit,
      scenes: [postScene, ...commentScenes]
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
      return JSON.parse(cached);
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

  const clearPersistedRawRedditData = () => {
    try {
      localStorage.removeItem(RAW_REDDIT_DATA_STORAGE_KEY);
      localStorage.removeItem(VIDEO_CONFIG_STORAGE_KEY);
      localStorage.removeItem(AUTHOR_PROFILES_STORAGE_KEY);
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

    if (cachedAuthorProfiles) {
      setAuthorProfiles(cachedAuthorProfiles);
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
        sortMode: commentSortMode,
        replyOrder: replyOrderMode,
        authorProfiles: nextProfiles,
      });

      setRawResult(cachedRawResult);
      setAllAuthors(nextAuthors);
      setResult(nextResult);
      setHasStoredRawData(true);
      
      // 如果没有缓存的视频配置，则根据提取结果生成
      if (!cachedVideoConfig) {
        const nextConfig = buildVideoConfigFromResult(nextResult);
        setVideoConfig(nextConfig);
        setDraftConfig(nextConfig);
      }
      
      message.success('已从本地缓存恢复最近一次的数据');
    }
  }, []);

  // 当抓取结果更新时，自动同步到草稿配置
  useEffect(() => {
    if (result) {
      const newConfig: VideoConfig = buildVideoConfigFromResult(result);
      
      setVideoConfig(newConfig);
      setDraftConfig(newConfig);
      persistVideoConfig(newConfig);
    }
  }, [result]);

  const toolMeta = useMemo(() => {
    switch (activeTool) {
      case 'extract':
        return {
          title: 'Reddit 链接提取',
          desc: '输入 Reddit 帖子链接，自动抓取并转换为精简结构化 JSON。',
          button: '开始提取',
        };
      case 'editor':
        return {
          title: '视频内容调整',
          desc: '在此微调视频的文字内容、作者信息等任务脚本。',
          button: '保存并前往预览',
        };
      case 'preview':
        return {
          title: '动画预览与导出 (Video)',
          desc: '查看动态视频效果并生成导出任务。',
          button: '生成视频',
        };
      case 'static_preview':
        return {
          title: '画面预览 (PPT Mode)',
          desc: '像幻灯片一样逐帧确认画面内容。',
          button: '',
        };
      case 'filtered_data':
        return {
          title: '过滤后 Reddit JSON 数据',
          desc: '查看抓取并转换后的 Reddit 帖子精简数据结构。',
          button: '',
        };
      case 'raw_data':
        return {
          title: '未处理 Reddit JSON 数据',
          desc: '查看抓取到的 Reddit 帖子原始 JSON 结构（未经过滤）。',
          button: '',
        };
      case 'script_data':
        return {
          title: '视频脚本 JSON 数据',
          desc: '查看用于视频生成的自动化配置数据。',
          button: '',
        };
      case 'frame_test':
        return {
          title: '画面格渲染测试',
          desc: '独立调试单个画面格的视觉样式与动画效果。',
          button: '',
        };
      case 'simulation':
        return {
          title: '物理过程模拟程序',
          desc: '渲染物理过程并保存为一帧帧的数据。',
          button: '',
        };
      case 'audio_preview':
        return {
          title: '音频素材预览',
          desc: '预览并测试所有音频素材。',
          button: '',
        };
      case 'component_test':
        return {
          title: '组件功能测试',
          desc: '测试 Dialogs 和 Toast 统一组件。',
          button: '',
        };
    }
  }, [activeTool]);

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
    });
    const nextConfig = buildVideoConfigFromResult(nextResult);

    setResult(nextResult);
    setVideoConfig(nextConfig);
    setDraftConfig(nextConfig);
    message.success(successMessage);
  };

  const applyCommentSortInEditor = (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => {
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
    const nextProfiles = generateRandomAliasProfiles(allAuthors, authorProfiles);
    setAuthorProfiles(nextProfiles);
    rebuildFromRaw(sortMode, replyOrder, nextProfiles, '已随机生成代号并重建脚本');
  };

  const clearAliasesAndApplyInEditor = (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => {
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
    try {
      const response = await axios.post('http://localhost:5000/render', videoConfig, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.data.success) {
        setAutoRenderStatus({ type: 'success', message: '视频导出成功！视频已保存在 out/video.mp4' });
        message.success('渲染成功！');
      } else {
        setAutoRenderStatus({ type: 'error', message: response.data.message });
      }
    } catch (err) {
      console.error(err);
      setAutoRenderStatus({ type: 'error', message: '连接本地 Python 服务失败。请确保 scripts/server.py 正在运行。' });
    } finally {
      setIsAutoRendering(false);
    }
  };

  const onMenuSelect = (info: { key: string }) => {
    setActiveTool(info.key as ToolKey);
  };

  return (
    <AntdApp>
      <DialogsInit />
      <ToastInit />
      <Layout className={`admin-layout ${headerHidden ? 'admin-layout--header-hidden' : ''}`}>
        {!headerHidden && (
        <Header className="admin-header">
        <div className="header-left">
          <div className="header-title-group">
            <span className="header-title">{toolMeta.title}</span>
            <span className="header-subtitle">Reddit 视频自动化工具</span>
          </div>
        </div>
        <Tag color="blue" icon={<AppstoreOutlined />}>
          v1.0.0
        </Tag>
      </Header>
      )}

      <Layout className="workspace-layout">
        <Sider
          collapsed={collapsed}
          collapsible
          trigger={null}
          width={240}
          className="admin-sider"
        >
          <div className="brand-wrap">
            {!collapsed && (
              <div className="brand-text">
                <div className="brand-title">RedditExtractor</div>
                <div className="brand-subtitle">Video Creator</div>
              </div>
            )}
          </div>

          <Menu
            theme="dark"
            mode="inline"
            className="sider-menu"
            selectedKeys={[activeTool]}
            onSelect={(item) => onMenuSelect({ key: item.key })}
            items={[
              {
                key: 'extract',
                icon: <LinkOutlined />,
                label: 'Reddit 链接提取',
              },
              {
                key: 'editor',
                icon: <EditOutlined />,
                label: '视频脚本编辑',
              },
              {
                key: 'preview',
                icon: <VideoCameraOutlined />,
                label: '视频预览与导出',
              },
              {
                key: 'static_preview',
                icon: <FileImageOutlined />,
                label: '画面预览 (PPT)',
              },
              {
                key: 'filtered_data',
                icon: <CodeOutlined />,
                label: '过滤后 Reddit JSON',
              },
              {
                key: 'raw_data',
                icon: <CodeOutlined />,
                label: '未处理 Reddit JSON',
              },
              {
                key: 'script_data',
                icon: <CodeOutlined />,
                label: '视频脚本 JSON',
              },
              {
                key: 'frame_test',
                icon: <CodeOutlined />,
                label: '画面格测试',
              },
              {
                key: 'simulation',
                icon: <PlayCircleOutlined />,
                label: '模拟程序',
              },
              {
                key: 'audio_preview',
                icon: <SoundOutlined />,
                label: '音频预览',
              },
              {
                key: 'component_test',
                icon: <AppstoreOutlined />,
                label: '组件测试',
              },
            ]}
          />

          <div className="sider-trigger-wrap">
            <Button
              type="text"
              className="sider-trigger-btn"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              {!collapsed && <span className="sider-trigger-text">收起导航</span>}
            </Button>
            <Button
              type="text"
              className="sider-trigger-btn"
              onClick={() => setHeaderHidden((prev) => !prev)}
            >
              {headerHidden ? <EyeOutlined /> : <EyeInvisibleOutlined />}
              {!collapsed && <span className="sider-trigger-text">{headerHidden ? '显示顶栏' : '隐藏顶栏'}</span>}
            </Button>
          </div>
        </Sider>

        <Layout>
          <Content className="admin-content">
            {activeTool === 'extract' && (
              <ExtractPage 
                redditUrl={redditUrl}
                setRedditUrl={setRedditUrl}
                loading={loading}
                error={error}
                errorDebug={errorDebug}
                result={result}
                fetchRedditData={fetchRedditData}
                clearStoredRawData={clearPersistedRawRedditData}
                hasStoredRawData={hasStoredRawData}
                copyToClipboard={copyToClipboard}
                goToEditor={() => setActiveTool('editor')}
                goToFilteredData={() => setActiveTool('filtered_data')}
                goToRawData={() => setActiveTool('raw_data')}
                goToScriptData={() => setActiveTool('script_data')}
                toolDesc={toolMeta.desc}
                toolButton={toolMeta.button}
              />
            )}

            {activeTool === 'editor' && (
              <EditorPage 
                draftConfig={draftConfig}
                setDraftConfig={(cfg) => {
                  setDraftConfig(cfg);
                  setVideoConfig(cfg); // 同时更新主配置，确保其他页面实时可见
                  persistVideoConfig(cfg); // 持久化
                }}
                commentSortMode={commentSortMode}
                replyOrderMode={replyOrderMode}
                onApplyCommentSort={applyIdentityAndSortInEditor}
                onRandomizeAliasesAndApply={randomizeAliasesAndApplyInEditor}
                onClearAliasesAndApply={clearAliasesAndApplyInEditor}
                colorArrangement={colorArrangement}
                onRearrangeColorsAndApply={rearrangeColorsAndApplyInEditor}
                canApplyCommentSort={!!rawResult}
                allAuthors={allAuthors}
                authorProfiles={authorProfiles}
                onUpdateAuthorProfile={updateAuthorProfile}
                onApply={() => {
                  setVideoConfig(draftConfig);
                  persistVideoConfig(draftConfig);
                  setActiveTool('preview');
                  message.success('配置已保存并跳转到预览');
                }}
                onBack={() => setActiveTool('extract')}
                toolDesc={toolMeta.desc}
              />
            )}

            {activeTool === 'preview' && (
              <VideoPreviewPage 
                videoConfig={videoConfig}
                onBackToEditor={() => setActiveTool('editor')}
                isExportModalVisible={isExportModalVisible}
                setIsExportModalVisible={setIsExportModalVisible}
                isAutoRendering={isAutoRendering}
                autoRenderStatus={autoRenderStatus}
                startAutoRender={startAutoRender}
                downloadVideoConfig={downloadVideoConfig}
              />
            )}

            {activeTool === 'static_preview' && (
              <SlidePreviewPage 
                videoConfig={videoConfig}
                onBackToEditor={() => setActiveTool('editor')}
              />
            )}

            {activeTool === 'filtered_data' && (
              <FilteredJsonPage 
                data={result}
                onBack={() => setActiveTool('extract')}
                toolDesc={toolMeta.desc}
              />
            )}

            {activeTool === 'raw_data' && (
              <RawJsonPage 
                data={rawResult}
                onBack={() => setActiveTool('extract')}
                toolDesc={toolMeta.desc}
              />
            )}

            {activeTool === 'script_data' && (
              <ScriptJsonPage 
                config={videoConfig}
                onBack={() => setActiveTool('extract')}
                toolDesc={toolMeta.desc}
              />
            )}

            {activeTool === 'frame_test' && (
              <FrameTestPage 
                onBack={() => setActiveTool('editor')}
              />
            )}

            {activeTool === 'simulation' && (
              <SimulationPage 
                onBack={() => setActiveTool('editor')}
              />
            )}

            {activeTool === 'audio_preview' && (
              <AudioPreviewPage />
            )}

            {activeTool === 'component_test' && (
              <ComponentTestPage />
            )}
          </Content>
        </Layout>
      </Layout>
    </Layout>
    </AntdApp>
  );
};

export default App;
