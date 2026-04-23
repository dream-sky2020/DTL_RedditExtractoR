import React, { useState } from 'react';
import { message } from 'antd';
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
import { useVideoStore } from '@/store';

const App: React.FC = () => {
  // UI States
  const [collapsed, setCollapsed] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolKey>('extract');
  const [isExportModalVisible, setIsExportModalVisible] = useState(false);
  const [selectedSceneIdx, setSelectedSceneIdx] = useState<number>(0);

  // Custom Hooks & Stores
  const { videoConfig } = useVideoStore();
  const render = useVideoRender(videoConfig);

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
