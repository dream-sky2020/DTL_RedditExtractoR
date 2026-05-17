import React from 'react';
import { Button, InputNumber, Typography } from 'antd';
import { DragOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface BatchOffsetSectionProps {
  selectedSceneIds: string[];
  offsetX: number;
  setOffsetX: (val: number) => void;
  offsetY: number;
  setOffsetY: (val: number) => void;
  handleBatchOffsetChange: () => void;
}

export const BatchOffsetSection: React.FC<BatchOffsetSectionProps> = ({
  selectedSceneIds,
  offsetX,
  setOffsetX,
  offsetY,
  setOffsetY,
  handleBatchOffsetChange,
}) => {
  const hasSelected = selectedSceneIds.length > 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <Text style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>偏移:</Text>
      <InputNumber
        size="small"
        placeholder="X"
        value={offsetX}
        onChange={(val) => setOffsetX(val || 0)}
        style={{ width: 55 }}
      />
      <InputNumber
        size="small"
        placeholder="Y"
        value={offsetY}
        onChange={(val) => setOffsetY(val || 0)}
        style={{ width: 55 }}
      />
      <Button
        size="small"
        icon={<DragOutlined />}
        disabled={!hasSelected}
        onClick={handleBatchOffsetChange}
        style={{
          flex: 1,
          backgroundColor: hasSelected ? '#fa8c16' : '#fff',
          color: hasSelected ? '#fff' : '#000',
          borderColor: hasSelected ? '#fa8c16' : 'var(--brand-border)',
        }}
      >
        统一偏移
      </Button>
    </div>
  );
};
