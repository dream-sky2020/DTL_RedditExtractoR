import React from 'react';
import { Button, InputNumber, Typography } from 'antd';

const { Text } = Typography;

interface BatchDurationSectionProps {
  selectedSceneIds: string[];
  batchSceneDuration: number;
  setBatchSceneDuration: (val: number) => void;
  handleBatchSceneDurationChange: () => void;
}

export const BatchDurationSection: React.FC<BatchDurationSectionProps> = ({
  selectedSceneIds,
  batchSceneDuration,
  setBatchSceneDuration,
  handleBatchSceneDurationChange,
}) => {
  const hasSelected = selectedSceneIds.length > 0;
  const btnColor = hasSelected ? '#fa8c16' : '#1890ff';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Text style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>场景时长:</Text>
      <InputNumber
        size="small"
        min={0.1}
        step={0.1}
        value={batchSceneDuration}
        onChange={(val) => setBatchSceneDuration(val ?? 3)}
        style={{ width: 70 }}
      />
      <Button
        size="small"
        onClick={handleBatchSceneDurationChange}
        style={{
          flex: 1,
          backgroundColor: btnColor,
          color: '#fff',
          borderColor: btnColor,
        }}
      >
        {hasSelected ? '修改时长' : '全部修改'}
      </Button>
    </div>
  );
};
