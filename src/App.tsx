import React, { useState, useMemo, useEffect } from 'react';
import {
  Layout,
  Menu,
  Button,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  AppstoreOutlined,
  LinkOutlined,
  CodeOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  VideoCameraOutlined,
  EditOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { transformRedditJson } from './utils/redditTransformer';
import { VideoConfig, VideoScene } from './types';

// Pages
import { ExtractPage } from './pages/ExtractPage';
import { EditorPage } from './pages/EditorPage';
import { PreviewPage } from './pages/PreviewPage';
import { FilteredJsonPage } from './pages/FilteredJsonPage';
import { RawJsonPage } from './pages/RawJsonPage';
import { FrameTestPage } from './pages/FrameTestPage';
import { ScriptJsonPage } from './pages/ScriptJsonPage';

const { Header, Sider, Content } = Layout;

type ToolKey = 'extract' | 'raw_data' | 'filtered_data' | 'script_data' | 'editor' | 'preview' | 'frame_test';

const App: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolKey>('extract');
  const [redditUrl, setRedditUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [rawResult, setRawResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [isExportModalVisible, setIsExportModalVisible] = useState(false);
  const [isAutoRendering, setIsAutoRendering] = useState(false);
  const [autoRenderStatus, setAutoRenderStatus] = useState<any>(null);

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
            content: '这里是你的视频正文内容预览。你可以通过抓取 Reddit 链接自动填充，或者在这里手动修改。',
            image: ''
          }
        ]
      }
    ]
  });

  // 编辑中的临时配置
  const [draftConfig, setDraftConfig] = useState<VideoConfig>(videoConfig);

  // 当抓取结果更新时，自动同步到草稿配置
  useEffect(() => {
    if (result) {
      // 1. 创建帖子正文画面
      const postScene: VideoScene = {
        id: 'scene-post-' + Date.now(),
        type: 'post',
        title: '贴子正文',
        duration: 5,
        items: [{
          id: 'post-content',
          author: result.author,
          content: result.content || result.title,
          image: result.image || '',
        }]
      };

      // 2. 将评论按层级或某种规则初步分到不同画面格 (初始每条评论一个画面格)
      const commentScenes: VideoScene[] = result.comments.map((c: any) => ({
        id: 'scene-' + c.id,
        type: 'comments',
        title: `评论 u/${c.author}`,
        duration: 3,
        items: [{
          id: c.id,
          author: c.author,
          content: c.body,
          image: c.image || '',
          replyChain: c.replyChain
        }]
      }));
      
      const newConfig: VideoConfig = {
        title: result.title,
        subreddit: result.subreddit,
        scenes: [postScene, ...commentScenes]
      };
      
      setVideoConfig(newConfig);
      setDraftConfig(newConfig);
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
          title: '视频预览与导出',
          desc: '查看最终视频效果并生成导出任务。',
          button: '生成视频',
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
    }
  }, [activeTool]);

  const resetResultState = () => {
    setError('');
    setResult(null);
    setRawResult(null);
  };

  const fetchRedditData = async () => {
    if (!redditUrl.trim()) return;

    setLoading(true);
    resetResultState();

    try {
      const jsonUrl = `${redditUrl.trim().replace(/\/$/, '')}.json`;
      const response = await axios.get(jsonUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
      });
      setRawResult(response.data);
      setResult(transformRedditJson(response.data));
      message.success('数据提取成功，已同步至视频配置');
    } catch (err) {
      console.error(err);
      setError('抓取失败，请检查 URL 是否正确或存在跨域限制。');
    } finally {
      setLoading(false);
    }
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
    <Layout className="admin-layout">
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
                result={result}
                fetchRedditData={fetchRedditData}
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
                setDraftConfig={setDraftConfig}
                onApply={() => {
                  setVideoConfig(draftConfig);
                  setActiveTool('preview');
                  message.success('配置已应用并跳转到预览');
                }}
                onBack={() => setActiveTool('extract')}
                toolDesc={toolMeta.desc}
              />
            )}

            {activeTool === 'preview' && (
              <PreviewPage 
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
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default App;
