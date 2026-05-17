import React from 'react';
import { Button, InputNumber, Typography } from 'antd';
import { LineHeightOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface BatchSpacingSectionProps {
  selectedSceneIds: string[];
  batchItemSpacing: number;
  setBatchItemSpacing: (val: number) => void;
  handleBatchItemSpacingChange: () => void;
}

export const BatchSpacingSection: React.FC<BatchSpacingSectionProps> = ({
  selectedSceneIds,
  batchItemSpacing,
  setBatchItemSpacing,
  handleBatchItemSpacingChange,
}) => {
  const hasSelected = selectedSceneIds.length > 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Text style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>项目间距:</Text>
      <InputNumber
        size="small"
        min={0}
        max={200}
        value={batchItemSpacing}
        onChange={(val) => setBatchItemSpacing(val || 0)}
        style={{ width: 70 }}
      />
      <Button
        size="small"
        icon={<LineHeightOutlined />}
        disabled={!hasSelected}
        onClick={handleBatchItemSpacingChange}
        style={{
          flex: 1,
          backgroundColor: hasSelected ? '#fa8c16' : '#fff',
          color: hasSelected ? '#fff' : '#000',
          borderColor: hasSelected ? '#fa8c16' : '#d9d9d9',
        }}
      >
        统一间距
      </Button>
    </div>
  );
};
