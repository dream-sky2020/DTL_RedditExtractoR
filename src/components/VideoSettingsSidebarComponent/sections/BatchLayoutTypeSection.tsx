import React from 'react';
import { Button, Space } from 'antd';
import {
  VerticalAlignTopOutlined,
  AlignCenterOutlined,
  VerticalAlignBottomOutlined,
} from '@ant-design/icons';

interface BatchLayoutTypeSectionProps {
  selectedSceneIds: string[];
  handleBatchLayoutChange: (layout: 'top' | 'center' | 'bottom') => void;
}

export const BatchLayoutTypeSection: React.FC<BatchLayoutTypeSectionProps> = ({
  selectedSceneIds,
  handleBatchLayoutChange,
}) => {
  const hasSelected = selectedSceneIds.length > 0;
  const btnColor = hasSelected ? '#fa8c16' : '#1890ff';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
      <Button
        size="small"
        icon={<VerticalAlignTopOutlined />}
        onClick={() => handleBatchLayoutChange('top')}
        style={{
          backgroundColor: btnColor,
          color: '#fff',
          borderColor: btnColor,
        }}
      >
        全部top
      </Button>
      <Button
        size="small"
        icon={<AlignCenterOutlined />}
        onClick={() => handleBatchLayoutChange('center')}
        style={{
          backgroundColor: btnColor,
          color: '#fff',
          borderColor: btnColor,
        }}
      >
        全部center
      </Button>
      <Button
        size="small"
        icon={<VerticalAlignBottomOutlined />}
        onClick={() => handleBatchLayoutChange('bottom')}
        style={{
          backgroundColor: btnColor,
          color: '#fff',
          borderColor: btnColor,
        }}
      >
        全部bottom
      </Button>
    </div>
  );
};
