import React from 'react';
import { Button, Space, Typography, Tooltip, Select } from 'antd';
import { HistoryOutlined, CommentOutlined } from '@ant-design/icons';

const { Text } = Typography;
const { Option } = Select;

interface BatchChatFlowSectionProps {
  selectedSceneIds: string[];
  historyLimit: number;
  setHistoryLimit: (val: number) => void;
  handleChatFlow: (direction: 'top' | 'bottom') => void;
}

export const BatchChatFlowSection: React.FC<BatchChatFlowSectionProps> = ({
  selectedSceneIds,
  historyLimit,
  setHistoryLimit,
  handleChatFlow,
}) => {
  const hasSelected = selectedSceneIds.length > 0;

  return (
    <div>
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
        <Text style={{ fontSize: 12, color: 'var(--text-primary)' }}>聊天流处理</Text>
        <Tooltip title="设置每个场景中保留的最大历史消息数">
          <HistoryOutlined style={{ fontSize: 12, color: 'var(--text-secondary)' }} />
        </Tooltip>
      </div>

      <Space direction="vertical" style={{ width: '100%' }} size="small">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>最大历史数 K:</Text>
          <Select
            size="small"
            value={historyLimit}
            onChange={setHistoryLimit}
            style={{ width: 80 }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map(val => (
              <Option key={val} value={val}>{val}</Option>
            ))}
          </Select>
        </div>

        <Button
          block
          size="small"
          icon={<CommentOutlined />}
          disabled={!hasSelected}
          onClick={() => handleChatFlow('top')}
          style={{
            backgroundColor: hasSelected ? '#1890ff' : '#fff',
            color: hasSelected ? '#fff' : '#000',
            borderColor: hasSelected ? '#1890ff' : '#d9d9d9',
          }}
        >
          聊天流格式处理（最新在上）
        </Button>

        <Button
          block
          size="small"
          icon={<CommentOutlined />}
          disabled={!hasSelected}
          onClick={() => handleChatFlow('bottom')}
          style={{
            backgroundColor: hasSelected ? '#1890ff' : '#fff',
            color: hasSelected ? '#fff' : '#000',
            borderColor: hasSelected ? '#1890ff' : '#d9d9d9',
          }}
        >
          聊天流格式处理（最新在下）
        </Button>
      </Space>
    </div>
  );
};
