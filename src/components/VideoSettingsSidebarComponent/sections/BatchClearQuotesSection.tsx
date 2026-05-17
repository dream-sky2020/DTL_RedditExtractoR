import React from 'react';
import { Button } from 'antd';
import { ClearOutlined } from '@ant-design/icons';

interface BatchClearQuotesSectionProps {
  selectedSceneIds: string[];
  handleClearQuotes: () => void;
}

export const BatchClearQuotesSection: React.FC<BatchClearQuotesSectionProps> = ({
  selectedSceneIds,
  handleClearQuotes,
}) => {
  const hasSelected = selectedSceneIds.length > 0;

  return (
    <Button
      block
      icon={<ClearOutlined />}
      disabled={!hasSelected}
      onClick={handleClearQuotes}
      style={{
        backgroundColor: hasSelected ? '#fa8c16' : '#fff',
        color: hasSelected ? '#fff' : '#000',
        borderColor: hasSelected ? '#fa8c16' : '#d9d9d9',
      }}
    >
      清理引用
    </Button>
  );
};
