import React from 'react';
import { Button, Space } from 'antd';
import { CopyOutlined, PlusOutlined } from '@ant-design/icons';

interface BatchDuplicateSectionProps {
  selectedSceneIds: string[];
  handleDuplicateSelectedScene: () => void;
  onAddScene: () => void;
}

export const BatchDuplicateSection: React.FC<BatchDuplicateSectionProps> = ({
  selectedSceneIds,
  handleDuplicateSelectedScene,
  onAddScene,
}) => {
  const isSingleSelected = selectedSceneIds.length === 1;

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Button
        block
        size="small"
        icon={<CopyOutlined />}
        disabled={!isSingleSelected}
        onClick={handleDuplicateSelectedScene}
        style={{
          backgroundColor: isSingleSelected ? '#52c41a' : '#fff',
          color: isSingleSelected ? '#fff' : '#000',
          borderColor: isSingleSelected ? '#52c41a' : '#d9d9d9',
        }}
      >
        以此复制新画面格
      </Button>
      <Button
        block
        size="small"
        icon={<PlusOutlined />}
        onClick={onAddScene}
        style={{
          backgroundColor: '#1890ff',
          color: '#fff',
          borderColor: '#1890ff',
        }}
      >
        新增画面格
      </Button>
    </Space>
  );
};
