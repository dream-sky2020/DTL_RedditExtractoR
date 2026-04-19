import React from 'react';
import { Space, Button, Typography, Tag } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, DeleteOutlined } from '@ant-design/icons';

const { Title } = Typography;

interface HeaderActionsProps {
  onBack: () => void;
  currentFrame: number;
  recordedFrames: number;
  onSave: () => void;
  onClear: () => void;
  isSaveDisabled: boolean;
}

export const HeaderActions: React.FC<HeaderActionsProps> = ({
  onBack,
  currentFrame,
  recordedFrames,
  onSave,
  onClear,
  isSaveDisabled
}) => {
  return (
    <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Space size="middle">
        <Button icon={<ArrowLeftOutlined />} onClick={onBack}>返回</Button>
        <Title level={3} style={{ margin: 0 }}>物理过程模拟程序</Title>
      </Space>
      <Space>
        <Tag color="blue">当前帧: {currentFrame}</Tag>
        <Tag color="green">已记录: {recordedFrames} 帧</Tag>
        <Button size="small" icon={<SaveOutlined />} onClick={onSave} disabled={isSaveDisabled}>保存 JSON</Button>
        <Button size="small" danger icon={<DeleteOutlined />} onClick={onClear} disabled={isSaveDisabled}>清空</Button>
      </Space>
    </div>
  );
};
