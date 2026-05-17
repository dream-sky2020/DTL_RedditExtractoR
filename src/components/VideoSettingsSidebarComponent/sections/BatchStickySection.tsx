import React from 'react';
import { Button, InputNumber, Typography, Tooltip } from 'antd';
import { AlignCenterOutlined } from '@ant-design/icons';
import { applyItemIndexChange } from '../../../hooks/multiSelectUtils';

const { Text } = Typography;

interface BatchStickySectionProps {
  selectedSceneIds: string[];
  stickyItemIndex: number;
  setStickyItemIndex: (val: number) => void;
  stickyValue: number | boolean;
  setStickyValue: (val: number | boolean) => void;
  handleBatchStickyChange: () => void;
}

export const BatchStickySection: React.FC<BatchStickySectionProps> = ({
  selectedSceneIds,
  stickyItemIndex,
  setStickyItemIndex,
  stickyValue,
  setStickyValue,
  handleBatchStickyChange,
}) => {
  const hasSelected = selectedSceneIds.length > 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <Text style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>居中项:</Text>
      <Tooltip title="正数从前往后(1,2...)，负数从后往前(-1,-2...)">
        <InputNumber
          size="small"
          step={1}
          placeholder="索引"
          value={stickyItemIndex}
          onChange={(val) => applyItemIndexChange(val, stickyItemIndex, setStickyItemIndex)}
          style={{ width: 55 }}
        />
      </Tooltip>
      <Tooltip title="居中位置比例 (0-1)，0.5 为正中心">
        <InputNumber
          size="small"
          min={0}
          max={1}
          step={0.1}
          placeholder="比例"
          value={typeof stickyValue === 'number' ? stickyValue : 0.5}
          onChange={(val) => setStickyValue(val ?? 0.5)}
          style={{ width: 55 }}
        />
      </Tooltip>
      <Button
        size="small"
        icon={<AlignCenterOutlined />}
        disabled={!hasSelected}
        onClick={handleBatchStickyChange}
        style={{
          flex: 1,
          backgroundColor: hasSelected ? '#fa8c16' : '#fff',
          color: hasSelected ? '#fff' : '#000',
          borderColor: hasSelected ? '#fa8c16' : 'var(--brand-border)',
        }}
      >
        设置居中项
      </Button>
    </div>
  );
};
