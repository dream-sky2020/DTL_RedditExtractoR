import React, { useState } from 'react';
import { Space, Button, Input, message, Typography, Divider } from 'antd';
import { FileImageOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Text } = Typography;

interface BatchBgImageSectionProps {
  selectedSceneIds: string[];
  batchBgImage: string;
  setBatchBgImage: (val: string) => void;
  batchItemBgImage: string;
  setBatchItemBgImage: (val: string) => void;
  handleBatchBgImageChange: () => void;
  handleBatchItemBgImageChange: () => void;
  handleClearBatchBgImage: () => void;
  handleClearBatchItemBgImage: () => void;
}

const LocalImageInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder }) => {
  const [loading, setLoading] = useState(false);

  const handlePickFile = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/pick_file');
      if (response.data.success && response.data.path) {
        onChange(response.data.path);
        message.success(`已选择本地图片: ${response.data.path}`);
      }
    } catch (err) {
      console.error('选择文件失败:', err);
      message.error('无法调用本地文件选择器，请确保 scripts/server.py 正在运行。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Space.Compact style={{ width: '100%' }}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <Button 
        icon={<FileImageOutlined />} 
        onClick={handlePickFile}
        loading={loading}
        title="选择本地图片 (支持任意路径)"
      >
        本地
      </Button>
    </Space.Compact>
  );
};

export const BatchBgImageSection: React.FC<BatchBgImageSectionProps> = ({
  selectedSceneIds,
  batchBgImage,
  setBatchBgImage,
  batchItemBgImage,
  setBatchItemBgImage,
  handleBatchBgImageChange,
  handleBatchItemBgImageChange,
  handleClearBatchBgImage,
  handleClearBatchItemBgImage,
}) => {
  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <div>
        <div style={{ marginBottom: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Scene 背景图 (画面格整体)</Text>
        </div>
        <Space direction="vertical" style={{ width: '100%' }}>
          <LocalImageInput
            value={batchBgImage}
            onChange={setBatchBgImage}
            placeholder="输入图片 URL 或选择本地文件"
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              type="primary"
              style={{ flex: 1 }}
              disabled={selectedSceneIds.length === 0}
              onClick={handleBatchBgImageChange}
            >
              应用 ({selectedSceneIds.length})
            </Button>
            <Button
              danger
              disabled={selectedSceneIds.length === 0}
              onClick={handleClearBatchBgImage}
            >
              清空
            </Button>
          </div>
        </Space>
      </div>

      <Divider style={{ margin: '4px 0', borderColor: 'var(--brand-border)' }} />

      <div>
        <div style={{ marginBottom: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Item 背景图 (画面格内的每一项)</Text>
        </div>
        <Space direction="vertical" style={{ width: '100%' }}>
          <LocalImageInput
            value={batchItemBgImage}
            onChange={setBatchItemBgImage}
            placeholder="输入图片 URL 或选择本地文件"
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              type="primary"
              style={{ flex: 1 }}
              disabled={selectedSceneIds.length === 0}
              onClick={handleBatchItemBgImageChange}
            >
              应用 ({selectedSceneIds.length})
            </Button>
            <Button
              danger
              disabled={selectedSceneIds.length === 0}
              onClick={handleClearBatchItemBgImage}
            >
              清空
            </Button>
          </div>
        </Space>
      </div>
    </Space>
  );
};
