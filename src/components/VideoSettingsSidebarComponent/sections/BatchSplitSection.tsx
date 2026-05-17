import React from 'react';
import { Button } from 'antd';
import { ScissorOutlined } from '@ant-design/icons';

interface BatchSplitSectionProps {
  selectedSceneIds: string[];
  handleOpenSplitModal: () => void;
}

export const BatchSplitSection: React.FC<BatchSplitSectionProps> = ({
  selectedSceneIds,
  handleOpenSplitModal,
}) => {
  const isSingleSelected = selectedSceneIds.length === 1;

  return (
    <Button
      block
      size="small"
      icon={<ScissorOutlined />}
      disabled={!isSingleSelected}
      onClick={handleOpenSplitModal}
      style={{
        backgroundColor: isSingleSelected ? '#722ed1' : '#fff',
        color: isSingleSelected ? '#fff' : '#000',
        borderColor: isSingleSelected ? '#722ed1' : '#d9d9d9',
      }}
    >
      根据 [split] 裁剪
    </Button>
  );
};
