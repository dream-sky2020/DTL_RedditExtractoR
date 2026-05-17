import React from 'react';
import { Button, Typography } from 'antd';
import { CheckSquareOutlined, BorderInnerOutlined, CloseCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface BatchSelectionSectionProps {
  selectedSceneIds: string[];
  handleSelectAll: () => void;
  handleSelectCurrentPage: () => void;
  onClearSelection: () => void;
}

export const BatchSelectionSection: React.FC<BatchSelectionSectionProps> = ({
  selectedSceneIds,
  handleSelectAll,
  handleSelectCurrentPage,
  onClearSelection,
}) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <Button
        size="small"
        icon={<CheckSquareOutlined />}
        onClick={handleSelectAll}
      >
        全选
      </Button>
      <Button
        size="small"
        icon={<BorderInnerOutlined />}
        onClick={handleSelectCurrentPage}
      >
        全选本页
      </Button>
      <Button
        size="small"
        icon={<CloseCircleOutlined />}
        disabled={selectedSceneIds.length === 0}
        onClick={onClearSelection}
        style={{ gridColumn: 'span 2' }}
      >
        清空选择
      </Button>
    </div>
  );
};
