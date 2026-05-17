import React from 'react';
import { Button, Space, Typography } from 'antd';
import {
  DownOutlined,
  UpOutlined,
  SelectOutlined
} from '@ant-design/icons';
import { VideoConfig } from '@/types';

const { Text } = Typography;

interface MultiSelectSectionProps {
  isMultiSelectMode: boolean;
  setIsMultiSelectMode: (mode: boolean) => void;
  selectedSceneIds: string[];
  setSelectedSceneIds: (ids: string[]) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  draftConfig: VideoConfig;
}

export const MultiSelectSection: React.FC<MultiSelectSectionProps> = ({
  isMultiSelectMode,
  setIsMultiSelectMode,
  selectedSceneIds,
  setSelectedSceneIds,
  isCollapsed,
  setIsCollapsed,
}) => {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Space size="small">
          <SelectOutlined style={{ color: 'var(--text-primary)' }} />
          <Text strong style={{ color: 'var(--text-primary)' }}>
            多选模式
          </Text>
        </Space>
        <Button
          size="small"
          type="text"
          onClick={() => setIsCollapsed(!isCollapsed)}
          icon={isCollapsed ? <DownOutlined style={{ color: 'var(--text-primary)' }} /> : <UpOutlined style={{ color: 'var(--text-primary)' }} />}
          style={{ color: 'var(--text-primary)' }}
        >
          {isCollapsed ? '展开' : '收起'}
        </Button>
      </div>
      {!isCollapsed && (
        <div
          style={{
            padding: 12,
            borderRadius: isMultiSelectMode ? '8px 8px 0 0' : 8,
            border: '1px solid var(--brand-border)',
            background: 'var(--panel-bg-translucent)',
            borderBottom: isMultiSelectMode ? 'none' : '1px solid var(--brand-border)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: 'var(--text-secondary)' }}>
              {isMultiSelectMode ? `已选择 ${selectedSceneIds.length} 个画面格` : '未开启多选模式'}
            </Text>
            <Button
              size="small"
              style={{
                backgroundColor: isMultiSelectMode ? '#e6f7ff' : '#fff',
                color: isMultiSelectMode ? '#1890ff' : '#000',
                borderColor: isMultiSelectMode ? '#91d5ff' : '#d9d9d9',
              }}
              onClick={() => {
                setIsMultiSelectMode(!isMultiSelectMode);
                if (isMultiSelectMode) {
                  setSelectedSceneIds([]);
                }
              }}
            >
              {isMultiSelectMode ? '退出多选' : '开启多选'}
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
