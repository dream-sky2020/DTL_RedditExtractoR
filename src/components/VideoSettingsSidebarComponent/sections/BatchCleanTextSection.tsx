import React from 'react';
import { Button, Space } from 'antd';
import { ClearOutlined } from '@ant-design/icons';

interface BatchCleanTextSectionProps {
  selectedSceneIds: string[];
  handleRemoveLineBreakTags: () => void;
  handleRemoveFirstLineBreakTag: () => void;
}

export const BatchCleanTextSection: React.FC<BatchCleanTextSectionProps> = ({
  selectedSceneIds,
  handleRemoveLineBreakTags,
  handleRemoveFirstLineBreakTag,
}) => {
  const hasSelected = selectedSceneIds.length > 0;

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="small">
      <Button
        block
        icon={<ClearOutlined />}
        disabled={!hasSelected}
        onClick={handleRemoveLineBreakTags}
        style={{
          backgroundColor: hasSelected ? '#fa8c16' : '#fff',
          color: hasSelected ? '#fff' : '#000',
          borderColor: hasSelected ? '#fa8c16' : '#d9d9d9',
        }}
      >
        去除 [\n]
      </Button>
      <Button
        block
        icon={<ClearOutlined />}
        disabled={!hasSelected}
        onClick={handleRemoveFirstLineBreakTag}
        style={{
          backgroundColor: hasSelected ? '#fa8c16' : '#fff',
          color: hasSelected ? '#fff' : '#000',
          borderColor: hasSelected ? '#fa8c16' : '#d9d9d9',
        }}
      >
        去除第一个 [\n]
      </Button>
    </Space>
  );
};
