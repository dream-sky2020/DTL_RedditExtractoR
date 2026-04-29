import React, { useMemo } from 'react';
import {
  Layout,
  Tag,
  message,
  App as AntdApp,
} from 'antd';
import {
  AppstoreOutlined,
} from '@ant-design/icons';
import { AppSidebar } from '../../components/AppSidebar';
import { DialogsInit } from '../../components/Dialogs';
import { ToastInit } from '../../components/Toast';

// Pages
import { ExtractPage } from '../ExtractPage/index';
import { EditorPage } from '../EditorPage/index';
import { VideoPreviewPage } from '../VideoPreviewPage/index';
import { FilteredJsonPage } from '../FilteredJsonPage/index';
import { RawJsonPage } from '../RawJsonPage/index';
import { FrameTestPage } from '../DeprecatedPages/FrameTestPage/index';
import { ScriptJsonPage } from '../ScriptJsonPage/index';
import { SlidePreviewPage } from '../DeprecatedPages/SlidePreviewPage/index';
import { SimulationPage } from '../DeprecatedPages/SimulationPage/index';
import { StudioPage } from '../StudioPage/index';
import { AudioPreviewPage } from '../AudioPreviewPage/index';
import { ComponentTestPage } from '../ComponentTestPage/index';
import { StudioScenePage } from '../StudioScenePage/index';
import { RenderTasksPage } from '../RenderTasksPage/index';
import { ProjectsPage } from '../ProjectsPage/index';

import { 
  ToolKey, 
  VideoConfig, 
  CommentSortMode, 
  ReplyOrderMode, 
  AuthorProfile, 
  ColorArrangementSettings,
  TitleAlignmentType,
  VideoScene
} from '../../types';
import { useRedditStore, useSettingsStore, useVideoStore } from '@/store';
import { normalizeVideoConfig } from '@/rendering/videoCanvas';
import { AUTHOR_PROFILES_STORAGE_KEY } from '@/constants/storage';
import { RenderTask } from '@/hooks/useVideoRender';

const { Header, Content } = Layout;

interface MainLayoutProps {
  // UI State
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  headerHidden: boolean;
  setHeaderHidden: React.Dispatch<React.SetStateAction<boolean>>;
  activeTool: ToolKey;
  setActiveTool: React.Dispatch<React.SetStateAction<ToolKey>>;
  currentProjectId: string | null;
  
  // Actions
  onMenuSelect: (info: { key: string }) => void;
  
  // Export/Render
  isAutoRendering: boolean;
  isSubmittingTask: boolean;
  autoRenderStatus: any;
  renderProgress: { percent: number; task: string; detail?: string } | null;
  renderTasks: RenderTask[];
  activeTaskId: string | null;
  startAutoRender: () => Promise<void>;
  cancelRenderTask: (taskId: string) => Promise<void>;
  removeRenderTask: (taskId: string) => Promise<void>;
  clearFinishedTasks: (statuses?: Array<'success' | 'error' | 'cancelled'>) => Promise<void>;
  downloadVideoConfig: () => void;
  
  // Studio
  selectedSceneIdx: number;
  setSelectedSceneIdx: React.Dispatch<React.SetStateAction<number>>;
}

export const MainLayout: React.FC<MainLayoutProps> = (props) => {
  const {
    collapsed, setCollapsed, headerHidden, setHeaderHidden, activeTool, setActiveTool, currentProjectId,
    onMenuSelect,
    isAutoRendering, isSubmittingTask, autoRenderStatus, renderProgress,
    renderTasks, activeTaskId, startAutoRender, cancelRenderTask, removeRenderTask, clearFinishedTasks, downloadVideoConfig, selectedSceneIdx, setSelectedSceneIdx
  } = props;

  const {
    result,
    rawResult,
    allAuthors,
    authorProfiles,
    setAuthorProfiles,
  } = useRedditStore();

  const {
    videoConfig,
    setVideoConfig,
  } = useVideoStore();

  const {
    commentSortMode, 
    replyOrderMode, 
  } = useSettingsStore();

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
      case 'projects':
        return {
          title: '项目管理',
          desc: '创建、切换和维护本地项目。',
          button: '',
        };
      case 'preview':
        return {
          title: '动画预览 (Video)',
          desc: '查看动态视频效果。',
          button: '',
        };
      case 'render_tasks':
        return {
          title: '导出与渲染任务',
          desc: '统一管理导出任务、进度与取消/清理。',
          button: '',
        };
      case 'static_preview':
        return {
          title: '画面预览 (PPT Mode)',
          desc: '像幻灯片一样逐帧确认画面内容。',
          button: '',
        };
      case 'studio':
        return {
          title: '视频编辑页面',
          desc: '更现代、更高效率的画面预览与整理画板。',
          button: '',
        };
      case 'studio_scene':
        return {
          title: '场景切片详情',
          desc: '查看单个场景的详细画面与切片。',
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

  if (!toolMeta) return null;

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
        <AppSidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          activeTool={activeTool}
          onMenuSelect={onMenuSelect}
          headerHidden={headerHidden}
          setHeaderHidden={setHeaderHidden}
        />

        <Layout>
          <Content className="admin-content" key={currentProjectId || 'no-project'}>
            {activeTool === 'extract' && (
              <ExtractPage 
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
                onApply={() => {
                  const normalizedConfig = normalizeVideoConfig(videoConfig);
                  setVideoConfig(normalizedConfig);
                  setActiveTool('preview');
                  message.success('配置已保存并跳转到预览');
                }}
                onBack={() => setActiveTool('extract')}
                toolDesc={toolMeta.desc}
              />
            )}

            {activeTool === 'projects' && (
              <ProjectsPage />
            )}

            {activeTool === 'preview' && (
              <VideoPreviewPage
                videoConfig={videoConfig}
                onBackToEditor={() => setActiveTool('editor')}
                onGoToRenderTasks={() => setActiveTool('render_tasks')}
              />
            )}

            {activeTool === 'render_tasks' && (
              <RenderTasksPage
                isAutoRendering={isAutoRendering}
                isSubmittingTask={isSubmittingTask}
                autoRenderStatus={autoRenderStatus}
                renderProgress={renderProgress}
                renderTasks={renderTasks}
                activeTaskId={activeTaskId}
                startAutoRender={startAutoRender}
                cancelRenderTask={cancelRenderTask}
                removeRenderTask={removeRenderTask}
                clearFinishedTasks={clearFinishedTasks}
                downloadVideoConfig={downloadVideoConfig}
              />
            )}

            {activeTool === 'static_preview' && (
              <SlidePreviewPage 
                videoConfig={videoConfig}
                onBackToEditor={() => setActiveTool('editor')}
              />
            )}
            
            {activeTool === 'studio' && (
              <StudioPage 
                onViewScene={(idx) => {
                  setSelectedSceneIdx(idx);
                  setActiveTool('studio_scene');
                }}
              />
            )}

            {activeTool === 'studio_scene' && (
              <StudioScenePage
                initialSceneIdx={selectedSceneIdx}
                onBack={() => setActiveTool('studio')}
              />
            )}

            {activeTool === 'filtered_data' && (
              <FilteredJsonPage 
                onBack={() => setActiveTool('extract')}
                toolDesc={toolMeta.desc}
              />
            )}

            {activeTool === 'raw_data' && (
              <RawJsonPage 
                onBack={() => setActiveTool('extract')}
                toolDesc={toolMeta.desc}
              />
            )}

            {activeTool === 'script_data' && (
              <ScriptJsonPage 
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
