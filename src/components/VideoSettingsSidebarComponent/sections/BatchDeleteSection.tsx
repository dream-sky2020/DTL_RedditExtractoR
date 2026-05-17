import React from 'react';
import { Button } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';

interface BatchDeleteSectionProps {
  selectedSceneIds: string[];
  onRemoveSelectedScenes?: () => void;
}

export const BatchDeleteSection: React.FC<BatchDeleteSectionProps> = ({
  selectedSceneIds,
  onRemoveSelectedScenes,
}) => {
  const hasSelected = selectedSceneIds.length > 0;

  return (
    <Button
      block
      icon={<DeleteOutlined />}
      disabled={!hasSelected}
      onClick={onRemoveSelectedScenes}
      style={{
        backgroundColor: hasSelected ? '#ff4d4f' : '#fff',
        color: hasSelected ? '#fff' : '#000',
        borderColor: hasSelected ? '#ff4d4f' : '#d9d9d9',
      }}
    >
      批量删除
    </Button>
  );
};
