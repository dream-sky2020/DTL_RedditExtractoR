/**
 * SceneHeader 组件
 * 功能：展示当前场景的详细信息（标题、类型、时长）并提供快速导航。
 * 包含：
 * 1. 场景标题和类型描述。
 * 2. 上一个/下一个场景的切换按钮（支持快捷键提示）。
 * 3. 当前场景在总数中的索引指示器。
 */
import React from 'react';
import { Typography, Space, Tooltip, Button } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { VideoScene } from '../../../types';

const { Title, Text } = Typography;

interface SceneHeaderProps {
  currentScene: VideoScene | null;
  currentSceneIdx: number;
  totalScenes: number;
  onPrev: () => void;
  onNext: () => void;
}

export const SceneHeader: React.FC<SceneHeaderProps> = ({
  currentScene,
  currentSceneIdx,
  totalScenes,
  onPrev,
  onNext,
}) => {
  return (
    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <Title level={4} style={{ margin: 0 }}>
          {currentScene ? `画面格 ${currentSceneIdx + 1}: ${currentScene.title}` : '暂无数据'}
        </Title>
        <Text type="secondary">
          {currentScene ? `${currentScene.type === 'post' ? '原贴正文' : '评论内容'} • 时长 ${currentScene.duration}s` : ''}
        </Text>
      </div>
      
      <Space>
        <Tooltip title="快捷键: ←">
          <Button 
            icon={<LeftOutlined />} 
            disabled={currentSceneIdx === 0} 
            onClick={onPrev}
          >
            上一个
          </Button>
        </Tooltip>
        <span style={{ fontWeight: 'bold', minWidth: 60, textAlign: 'center' }}>{currentSceneIdx + 1} / {totalScenes}</span>
        <Tooltip title="快捷键: →">
          <Button 
            icon={<RightOutlined />} 
            disabled={currentSceneIdx === totalScenes - 1} 
            onClick={onNext}
          >
            下一个
          </Button>
        </Tooltip>
      </Space>
    </div>
  );
};
