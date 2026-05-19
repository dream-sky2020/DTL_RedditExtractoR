import React from 'react';
import { Button, Space, Typography } from 'antd';
import {
  DownOutlined,
  UpOutlined,
  SelectOutlined,
  CheckSquareOutlined,
  BorderInnerOutlined,
  CloseCircleOutlined
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
  handleSelectAll: () => void;
  handleSelectCurrentPage: () => void;
}

export const MultiSelectSection: React.FC<MultiSelectSectionProps> = ({
  isMultiSelectMode,
  setIsMultiSelectMode,
  selectedSceneIds,
  setSelectedSceneIds,
  isCollapsed,
  setIsCollapsed,
  handleSelectAll,
  handleSelectCurrentPage,
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

          {isMultiSelectMode && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--brand-border)' }}>
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
                  onClick={() => setSelectedSceneIds([])}
                  style={{ gridColumn: 'span 2' }}
                >
                  清空选择
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
