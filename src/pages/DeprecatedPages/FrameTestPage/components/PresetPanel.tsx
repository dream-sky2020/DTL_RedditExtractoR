import React from 'react';
import { Card, Space, Button, message } from 'antd';
import { ToolOutlined, BugOutlined } from '@ant-design/icons';
import { VideoScene } from '../../../../types';

interface PresetPanelProps {
  presets: Record<string, VideoScene>;
  activeSceneId: string;
  onSelect: (scene: VideoScene, name: string) => void;
}

export const PresetPanel: React.FC<PresetPanelProps> = ({ presets, activeSceneId, onSelect }) => {
  return (
    <Card
      size="small"
      variant="outlined"
      style={{ background: 'var(--panel-bg-translucent)', borderRadius: 12 }}
      title={<span><ToolOutlined /> 快速加载测试预设</span>}
    >
      <Space wrap size="small">
        {Object.keys(presets).map(name => (
          <Button
            key={name}
            size="small"
            type={activeSceneId === presets[name].id ? 'primary' : 'default'}
            onClick={() => {
              onSelect(presets[name], name);
              message.success(`已加载“${name}”示例`);
            }}
            icon={<BugOutlined />}
          >
            {name}
          </Button>
        ))}
      </Space>
    </Card>
  );
};
