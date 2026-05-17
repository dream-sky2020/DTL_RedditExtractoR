import React from 'react';
import { Button } from 'antd';
import { TranslationOutlined } from '@ant-design/icons';

interface BatchTranslateSectionProps {
  selectedSceneIds: string[];
  onOpenTranslationModal?: () => void;
}

export const BatchTranslateSection: React.FC<BatchTranslateSectionProps> = ({
  selectedSceneIds,
  onOpenTranslationModal,
}) => {
  const hasSelected = selectedSceneIds.length > 0;

  return (
    <Button
      block
      size="small"
      icon={<TranslationOutlined />}
      disabled={!hasSelected}
      onClick={onOpenTranslationModal}
      style={{
        backgroundColor: hasSelected ? '#ffec3d' : '#fff',
        color: '#000',
        borderColor: hasSelected ? '#ffec3d' : '#d9d9d9',
      }}
    >
      批量翻译
    </Button>
  );
};
