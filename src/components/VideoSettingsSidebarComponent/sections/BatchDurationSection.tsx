import React from 'react';
import { Button, InputNumber, Typography } from 'antd';

const { Text } = Typography;

interface BatchDurationSectionProps {
  selectedSceneIds: string[];
  batchSceneDuration: number;
  setBatchSceneDuration: (val: number) => void;
  handleBatchSceneDurationChange: (val?: number) => void;
}

export const BatchDurationSection: React.FC<BatchDurationSectionProps> = ({
  selectedSceneIds,
  batchSceneDuration,
  setBatchSceneDuration,
  handleBatchSceneDurationChange,
}) => {
  const hasSelected = selectedSceneIds.length > 0;
  const btnColor = hasSelected ? '#fa8c16' : '#1890ff';

  const presets = [2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
          onClick={() => handleBatchSceneDurationChange()}
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {presets.map(val => (
          <Button
            key={val}
            size="small"
            style={{
              fontSize: 11,
              padding: '0 4px',
              height: 22,
              flex: 1,
              minWidth: 'calc(33.33% - 4px)',
              borderColor: batchSceneDuration === val ? btnColor : undefined,
              color: batchSceneDuration === val ? btnColor : undefined,
            }}
            onClick={() => {
              setBatchSceneDuration(val);
              handleBatchSceneDurationChange(val);
            }}
          >
            {val}s
          </Button>
        ))}
      </div>
    </div>
  );
};
