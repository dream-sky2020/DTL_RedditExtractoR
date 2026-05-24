import React from 'react';
import { Button, InputNumber, Typography, Tooltip } from 'antd';
import { AlignCenterOutlined } from '@ant-design/icons';
import { applyItemIndexChange } from '../../../hooks/multiSelectUtils';

const { Text } = Typography;

interface BatchStickySectionProps {
  selectedSceneIds: string[];
  stickyItemIndex: number;
  setStickyItemIndex: (val: number) => void;
  stickyValue: number;
  setStickyValue: (val: number) => void;
  handleBatchStickyChange: () => void;
  handleClearBatchStickyChange: () => void;
}

export const BatchStickySection: React.FC<BatchStickySectionProps> = ({
  selectedSceneIds,
  stickyItemIndex,
  setStickyItemIndex,
  stickyValue,
  setStickyValue,
  handleBatchStickyChange,
  handleClearBatchStickyChange,
}) => {
  const hasSelected = selectedSceneIds.length > 0;
  const clampStickyValue = (value: number) => Math.max(0, Math.min(1, value));

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <Text style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>定位项:</Text>
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
      <Tooltip title="sticky 位置比例 (0-1)，0.5 为正中心">
        <InputNumber
          size="small"
          min={0}
          max={1}
          step={0.1}
          placeholder="比例"
          value={stickyValue}
          onChange={(val) => setStickyValue(clampStickyValue(val ?? 0.5))}
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
        设置定位项
      </Button>
      <Button
        size="small"
        danger
        disabled={!hasSelected}
        onClick={handleClearBatchStickyChange}
      >
        清除
      </Button>
    </div>
  );
};
