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

const { Header, Content } = Layout;

interface MainLayoutProps {
  // UI State
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  headerHidden: boolean;
  setHeaderHidden: React.Dispatch<React.SetStateAction<boolean>>;
  activeTool: ToolKey;
  setActiveTool: React.Dispatch<React.SetStateAction<ToolKey>>;
  
  // Data State
  redditUrl: string;
  setRedditUrl: React.Dispatch<React.SetStateAction<string>>;
  loading: boolean;
  error: string;
  errorDebug: string;
  result: any;
  setResult: React.Dispatch<React.SetStateAction<any>>;
  rawResult: any;
  hasStoredRawData: boolean;
  
  // Config State
  videoConfig: VideoConfig;
  setVideoConfig: React.Dispatch<React.SetStateAction<VideoConfig>>;
  draftConfig: VideoConfig;
  setDraftConfig: React.Dispatch<React.SetStateAction<VideoConfig>>;
  persistVideoConfig: (config: VideoConfig) => void;
  
  // Preferences
  commentSortMode: CommentSortMode;
  setCommentSortMode: React.Dispatch<React.SetStateAction<CommentSortMode>>;
  replyOrderMode: ReplyOrderMode;
  setReplyOrderMode: React.Dispatch<React.SetStateAction<ReplyOrderMode>>;
  imageLayoutMode: 'gallery' | 'row' | 'single';
  setImageLayoutMode: React.Dispatch<React.SetStateAction<'gallery' | 'row' | 'single'>>;
  sceneLayout: 'top' | 'center';
  setSceneLayout: React.Dispatch<React.SetStateAction<'top' | 'center'>>;
  titleAlignment: TitleAlignmentType;
  setTitleAlignment: React.Dispatch<React.SetStateAction<TitleAlignmentType>>;
  titleFontSize: number;
  setTitleFontSize: React.Dispatch<React.SetStateAction<number>>;
  contentFontSize: number;
  setContentFontSize: React.Dispatch<React.SetStateAction<number>>;
  quoteFontSize: number;
  setQuoteFontSize: React.Dispatch<React.SetStateAction<number>>;
  maxQuoteDepth: number;
  setMaxQuoteDepth: React.Dispatch<React.SetStateAction<number>>;
  defaultQuoteMaxLimit: number;
  setDefaultQuoteMaxLimit: React.Dispatch<React.SetStateAction<number>>;
  sceneBackgroundColor: string;
  setSceneBackgroundColor: React.Dispatch<React.SetStateAction<string>>;
  itemBackgroundColor: string;
  setItemBackgroundColor: React.Dispatch<React.SetStateAction<string>>;
  quoteBackgroundColor: string;
  setQuoteBackgroundColor: React.Dispatch<React.SetStateAction<string>>;
  quoteBorderColor: string;
  setQuoteBorderColor: React.Dispatch<React.SetStateAction<string>>;
  
  // Profiles
  allAuthors: string[];
  authorProfiles: Record<string, AuthorProfile>;
  setAuthorProfiles: React.Dispatch<React.SetStateAction<Record<string, AuthorProfile>>>;
  persistAuthorProfiles: (profiles: Record<string, AuthorProfile>) => void;
  colorArrangement: ColorArrangementSettings;
  setColorArrangement: React.Dispatch<React.SetStateAction<ColorArrangementSettings>>;
  
  // Actions
  fetchRedditData: () => Promise<void>;
  clearPersistedRawRedditData: () => void;
  copyToClipboard: () => Promise<void>;
  normalizeVideoConfig: (config: VideoConfig) => VideoConfig;
  onMenuSelect: (info: { key: string }) => void;
  
  // Export/Render
  isExportModalVisible: boolean;
  setIsExportModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  isAutoRendering: boolean;
  autoRenderStatus: any;
  renderProgress: { percent: number; task: string; detail?: string } | null;
  startAutoRender: () => Promise<void>;
  downloadVideoConfig: () => void;
  
  // Studio
  selectedSceneIdx: number;
  setSelectedSceneIdx: React.Dispatch<React.SetStateAction<number>>;
}

export const MainLayout: React.FC<MainLayoutProps> = (props) => {
  const {
    collapsed, setCollapsed, headerHidden, setHeaderHidden, activeTool, setActiveTool,
    redditUrl, setRedditUrl, loading, error, errorDebug, result, setResult, rawResult, hasStoredRawData,
    videoConfig, setVideoConfig, draftConfig, setDraftConfig, persistVideoConfig,
    commentSortMode, setCommentSortMode, replyOrderMode, setReplyOrderMode, 
    imageLayoutMode, setImageLayoutMode, sceneLayout, setSceneLayout,
    titleAlignment, setTitleAlignment, titleFontSize, setTitleFontSize, contentFontSize, setContentFontSize,
    quoteFontSize, setQuoteFontSize, maxQuoteDepth, setMaxQuoteDepth, defaultQuoteMaxLimit, setDefaultQuoteMaxLimit,
    sceneBackgroundColor, setSceneBackgroundColor, itemBackgroundColor, setItemBackgroundColor,
    quoteBackgroundColor, setQuoteBackgroundColor, quoteBorderColor, setQuoteBorderColor,
    allAuthors, authorProfiles, setAuthorProfiles, persistAuthorProfiles, colorArrangement, setColorArrangement,
    fetchRedditData, clearPersistedRawRedditData, copyToClipboard,
    normalizeVideoConfig, onMenuSelect,
    isExportModalVisible, setIsExportModalVisible, isAutoRendering, autoRenderStatus, renderProgress,
    startAutoRender, downloadVideoConfig, selectedSceneIdx, setSelectedSceneIdx
  } = props;

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
                setDraftConfig={setDraftConfig}
                videoConfig={videoConfig}
                setVideoConfig={setVideoConfig}
                persistVideoConfig={persistVideoConfig}
                commentSortMode={commentSortMode}
                setCommentSortMode={setCommentSortMode}
                replyOrderMode={replyOrderMode}
                setReplyOrderMode={setReplyOrderMode}
                rawResult={rawResult}
                result={result}
                setResult={setResult}
                colorArrangement={colorArrangement}
                setColorArrangement={setColorArrangement}
                allAuthors={allAuthors}
                authorProfiles={authorProfiles}
                setAuthorProfiles={setAuthorProfiles}
                persistAuthorProfiles={persistAuthorProfiles}
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
                onApply={() => {
                  const normalizedConfig = normalizeVideoConfig(draftConfig);
                  setVideoConfig(normalizedConfig);
                  persistVideoConfig(normalizedConfig);
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
                renderProgress={renderProgress}
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
            
            {activeTool === 'studio' && (
              <StudioPage 
                videoConfig={videoConfig}
                setVideoConfig={setVideoConfig}
                draftConfig={draftConfig}
                setDraftConfig={setDraftConfig}
                persistVideoConfig={persistVideoConfig}
                onViewScene={(idx) => {
                  setSelectedSceneIdx(idx);
                  setActiveTool('studio_scene');
                }}
                commentSortMode={commentSortMode}
                setCommentSortMode={setCommentSortMode}
                replyOrderMode={replyOrderMode}
                setReplyOrderMode={setReplyOrderMode}
                rawResult={rawResult}
                result={result}
                setResult={setResult}
                colorArrangement={colorArrangement}
                setColorArrangement={setColorArrangement}
                allAuthors={allAuthors}
                authorProfiles={authorProfiles}
                setAuthorProfiles={setAuthorProfiles}
                persistAuthorProfiles={persistAuthorProfiles}
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
              />
            )}

            {activeTool === 'studio_scene' && (
              <StudioScenePage
                videoConfig={videoConfig}
                setVideoConfig={(cfg) => {
                  const normalizedConfig = normalizeVideoConfig(cfg);
                  setVideoConfig(normalizedConfig);
                  setDraftConfig(normalizedConfig);
                  persistVideoConfig(normalizedConfig);
                }}
                initialSceneIdx={selectedSceneIdx}
                onBack={() => setActiveTool('studio')}
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
