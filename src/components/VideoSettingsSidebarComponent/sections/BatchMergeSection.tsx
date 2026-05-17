import React from 'react';
import { Button } from 'antd';
import { MergeCellsOutlined } from '@ant-design/icons';

interface BatchMergeSectionProps {
  selectedSceneIds: string[];
  mergeScenes: (ids: string[]) => void;
}

export const BatchMergeSection: React.FC<BatchMergeSectionProps> = ({
  selectedSceneIds,
  mergeScenes,
}) => {
  const canMerge = selectedSceneIds.length >= 2;

  return (
    <Button
      block
      icon={<MergeCellsOutlined />}
      disabled={!canMerge}
      onClick={() => mergeScenes(selectedSceneIds)}
      style={{
        backgroundColor: canMerge ? '#ffec3d' : '#fff',
        color: '#000',
        borderColor: canMerge ? '#ffec3d' : '#d9d9d9',
      }}
    >
      批量合并
    </Button>
  );
};
