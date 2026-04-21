import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import './style/colors.css';
import './style/style.css';
import './style/tables.css';
import {
  transformRedditJson,
  extractAuthorsFromRawData,
} from '@/utils/redditTransformer';
import {
  ToolKey,
  DEFAULT_GLOBAL_SETTINGS,
} from '@/types';
import { createDefaultVideoCanvasConfig, normalizeVideoConfig } from '@/rendering/videoCanvas';
import { MainLayout } from '@/pages/MainPages';

// Hooks
import { useGlobalSettings } from '@hooks/useGlobalSettings';
import { useRedditData } from '@hooks/useRedditData';
import { useVideoRender } from '@hooks/useVideoRender';
import { useVideoConfig } from '@hooks/useVideoConfig';

// Constants
import {
  RAW_REDDIT_DATA_STORAGE_KEY,
  VIDEO_CONFIG_STORAGE_KEY,
  AUTHOR_PROFILES_STORAGE_KEY,
  GLOBAL_CONFIG_STORAGE_KEY,
} from '@/constants/storage';

const App: React.FC = () => {
  // UI States
  const [collapsed, setCollapsed] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolKey>('extract');
  const [isExportModalVisible, setIsExportModalVisible] = useState(false);
  const [selectedSceneIdx, setSelectedSceneIdx] = useState<number>(0);

  // Custom Hooks
  const settings = useGlobalSettings();
  const reddit = useRedditData(
    settings.commentSortMode,
    settings.replyOrderMode,
    settings.colorArrangement
  );
  const config = useVideoConfig(reddit.result, settings);
  const render = useVideoRender(config.videoConfig);

  // 页面刷新后恢复数据
  useEffect(() => {
    const restoreData = () => {
      try {
        // 1. 恢复全局配置
        const cachedGlobalConfig = localStorage.getItem(GLOBAL_CONFIG_STORAGE_KEY);
        const globalSettings = cachedGlobalConfig ? { ...DEFAULT_GLOBAL_SETTINGS, ...JSON.parse(cachedGlobalConfig) } : DEFAULT_GLOBAL_SETTINGS;
        
        // 2. 恢复作者配置
        const cachedAuthorProfiles = localStorage.getItem(AUTHOR_PROFILES_STORAGE_KEY);
        const authorProfiles = cachedAuthorProfiles ? JSON.parse(cachedAuthorProfiles) : {};
        reddit.setAuthorProfiles(authorProfiles);

        // 3. 恢复视频配置
        const cachedVideoConfig = localStorage.getItem(VIDEO_CONFIG_STORAGE_KEY);
        let videoConfig = cachedVideoConfig ? normalizeVideoConfig(JSON.parse(cachedVideoConfig)) : null;

        // 4. 恢复原始 Reddit 数据
        const cachedRawResult = localStorage.getItem(RAW_REDDIT_DATA_STORAGE_KEY);
        if (cachedRawResult) {
          const rawData = JSON.parse(cachedRawResult);
          const nextAuthors = extractAuthorsFromRawData(rawData);
          
          // 如果没有缓存的作者配置，则生成
          const nextProfiles = Object.keys(authorProfiles).length > 0 
            ? authorProfiles 
            : reddit.buildProfilesForAuthors(nextAuthors, {}, settings.colorArrangement);
          
          const nextResult = transformRedditJson(rawData, {
            sortMode: globalSettings.commentSortMode,
            replyOrder: globalSettings.replyOrderMode,
            authorProfiles: nextProfiles,
            imageLayoutMode: videoConfig?.imageLayoutMode || globalSettings.imageLayoutMode,
          });

          reddit.setRawResult(rawData);
          reddit.setAllAuthors(nextAuthors);
          reddit.setResult(nextResult);
          reddit.setHasStoredRawData(true);
          
          // 如果没有缓存的视频配置，则根据提取结果生成
          if (!videoConfig) {
            videoConfig = config.buildVideoConfigFromResult(nextResult);
          }
          
          message.success('已从本地缓存恢复最近一次的数据');
        }

        if (videoConfig) {
          config.setVideoConfig(videoConfig);
          config.setDraftConfig(videoConfig);
        }
      } catch (err) {
        console.warn('数据恢复失败:', err);
      }
    };

    restoreData();
  }, []); // 仅挂载时运行一次

  const onMenuSelect = (info: { key: string }) => {
    setActiveTool(info.key as ToolKey);
  };

  const copyToClipboard = async () => {
    if (!reddit.result) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(reddit.result, null, 2));
      message.success('JSON 已复制到剪贴板');
    } catch (err) {
      message.error('复制失败');
    }
  };

  return (
    <MainLayout
      collapsed={collapsed}
      setCollapsed={setCollapsed}
      headerHidden={headerHidden}
      setHeaderHidden={setHeaderHidden}
      activeTool={activeTool}
      setActiveTool={setActiveTool}
      redditUrl={reddit.redditUrl}
      setRedditUrl={reddit.setRedditUrl}
      loading={reddit.loading}
      error={reddit.error}
      errorDebug={reddit.errorDebug}
      result={reddit.result}
      rawResult={reddit.rawResult}
      hasStoredRawData={reddit.hasStoredRawData}
      videoConfig={config.videoConfig}
      setVideoConfig={config.setVideoConfig}
      draftConfig={config.draftConfig}
      setDraftConfig={config.setDraftConfig}
      persistVideoConfig={config.persistVideoConfig}
      commentSortMode={settings.commentSortMode}
      setCommentSortMode={settings.setCommentSortMode}
      replyOrderMode={settings.replyOrderMode}
      setReplyOrderMode={settings.setReplyOrderMode}
      setResult={reddit.setResult}
      colorArrangement={settings.colorArrangement}
      setColorArrangement={settings.setColorArrangement}
      allAuthors={reddit.allAuthors}
      authorProfiles={reddit.authorProfiles}
      setAuthorProfiles={reddit.setAuthorProfiles}
      persistAuthorProfiles={(p) => {
        reddit.setAuthorProfiles(p);
        localStorage.setItem(AUTHOR_PROFILES_STORAGE_KEY, JSON.stringify(p));
      }}
      imageLayoutMode={settings.imageLayoutMode}
      setImageLayoutMode={settings.setImageLayoutMode}
      sceneLayout={settings.sceneLayout}
      setSceneLayout={settings.setSceneLayout}
      titleAlignment={settings.titleAlignment}
      setTitleAlignment={settings.setTitleAlignment}
      titleFontSize={settings.titleFontSize}
      setTitleFontSize={settings.setTitleFontSize}
      contentFontSize={settings.contentFontSize}
      setContentFontSize={settings.setContentFontSize}
      quoteFontSize={settings.quoteFontSize}
      setQuoteFontSize={settings.setQuoteFontSize}
      maxQuoteDepth={settings.maxQuoteDepth}
      setMaxQuoteDepth={settings.setMaxQuoteDepth}
      defaultQuoteMaxLimit={settings.defaultQuoteMaxLimit}
      setDefaultQuoteMaxLimit={settings.setDefaultQuoteMaxLimit}
      sceneBackgroundColor={settings.sceneBackgroundColor}
      setSceneBackgroundColor={settings.setSceneBackgroundColor}
      itemBackgroundColor={settings.itemBackgroundColor}
      setItemBackgroundColor={settings.setItemBackgroundColor}
      quoteBackgroundColor={settings.quoteBackgroundColor}
      setQuoteBackgroundColor={settings.setQuoteBackgroundColor}
      quoteBorderColor={settings.quoteBorderColor}
      setQuoteBorderColor={settings.setQuoteBorderColor}
      fetchRedditData={reddit.fetchRedditData}
      clearPersistedRawRedditData={reddit.clearPersistedData}
      copyToClipboard={copyToClipboard}
      normalizeVideoConfig={normalizeVideoConfig}
      onMenuSelect={onMenuSelect}
      isExportModalVisible={isExportModalVisible}
      setIsExportModalVisible={setIsExportModalVisible}
      isAutoRendering={render.isAutoRendering}
      autoRenderStatus={render.autoRenderStatus}
      renderProgress={render.renderProgress}
      startAutoRender={render.startAutoRender}
      downloadVideoConfig={render.downloadVideoConfig}
      selectedSceneIdx={selectedSceneIdx}
      setSelectedSceneIdx={setSelectedSceneIdx}
    />
  );
};

export default App;
