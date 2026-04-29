import React, { useEffect, useState } from 'react';
import './style/colors.css';
import './style/style.css';
import './style/tables.css';
import {
  ToolKey,
} from '@/types';
import { MainLayout } from '@/pages/MainPages';

// Hooks
import { useVideoRender } from '@hooks/useVideoRender';

// Stores
import { useProjectsStore, useRedditStore, useSettingsStore, useVideoStore } from '@/store';

const App: React.FC = () => {
  // UI States
  const [collapsed, setCollapsed] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolKey>('extract');
  const [selectedSceneIdx, setSelectedSceneIdx] = useState<number>(0);

  // Custom Hooks & Stores
  const { videoConfig } = useVideoStore();
  const redditUrl = useRedditStore((state) => state.redditUrl);
  const redditResult = useRedditStore((state) => state.result);
  const redditRawResult = useRedditStore((state) => state.rawResult);
  const redditAllAuthors = useRedditStore((state) => state.allAuthors);
  const redditAuthorProfiles = useRedditStore((state) => state.authorProfiles);
  const redditHasStoredRawData = useRedditStore((state) => state.hasStoredRawData);
  const settingsProjectDigest = useSettingsStore((state) =>
    JSON.stringify([
      state.commentSortMode,
      state.replyOrderMode,
      state.imageLayoutMode,
      state.sceneLayout,
      state.titleAlignment,
      state.titleFontSize,
      state.contentFontSize,
      state.quoteFontSize,
      state.maxQuoteDepth,
      state.defaultQuoteMaxLimit,
      state.sceneBackgroundColor,
      state.itemBackgroundColor,
      state.quoteBackgroundColor,
      state.quoteBorderColor,
      state.sceneDisplayMode,
      state.colorArrangement,
    ])
  );
  const currentProjectId = useProjectsStore((state) => state.currentProjectId);
  const initProjectSystem = useProjectsStore((state) => state.initProjectSystem);
  const saveCurrentProjectSnapshot = useProjectsStore((state) => state.saveCurrentProjectSnapshot);
  const render = useVideoRender(videoConfig);

  useEffect(() => {
    void initProjectSystem();
  }, [initProjectSystem]);

  useEffect(() => {
    if (!currentProjectId) {
      return;
    }
    const timer = window.setTimeout(() => {
      void saveCurrentProjectSnapshot();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [
    currentProjectId,
    redditUrl,
    redditResult,
    redditRawResult,
    redditAllAuthors,
    redditAuthorProfiles,
    redditHasStoredRawData,
    settingsProjectDigest,
    videoConfig,
    saveCurrentProjectSnapshot,
  ]);

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
      currentProjectId={currentProjectId}
      onMenuSelect={onMenuSelect}
      isAutoRendering={render.isAutoRendering}
      isSubmittingTask={render.isSubmittingTask}
      autoRenderStatus={render.autoRenderStatus}
      renderProgress={render.renderProgress}
      renderTasks={render.renderTasks}
      activeTaskId={render.activeTaskId}
      startAutoRender={render.startAutoRender}
      cancelRenderTask={render.cancelRenderTask}
      removeRenderTask={render.removeRenderTask}
      clearFinishedTasks={render.clearFinishedTasks}
      downloadVideoConfig={render.downloadVideoConfig}
      selectedSceneIdx={selectedSceneIdx}
      setSelectedSceneIdx={setSelectedSceneIdx}
    />
  );
};

export default App;
