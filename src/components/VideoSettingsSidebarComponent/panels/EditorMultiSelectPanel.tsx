import React from 'react';
import { Button, Space, Typography, message } from 'antd';
import { DownOutlined, UpOutlined, SelectOutlined, DeleteOutlined, MergeCellsOutlined } from '@ant-design/icons';
import { VideoConfig } from '../../../types';
import { mergeSelectedScenes } from '../../../utils/sceneMergeEngine';

const { Text } = Typography;

interface EditorMultiSelectPanelProps {
  isMultiSelectMode: boolean;
  setIsMultiSelectMode: (mode: boolean) => void;
  selectedSceneIds: string[];
  setSelectedSceneIds: (ids: string[]) => void;
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  onRemoveSelectedScenes?: () => void;
  draftConfig: VideoConfig;
  setDraftConfig: (config: VideoConfig) => void;
}

export const EditorMultiSelectPanel: React.FC<EditorMultiSelectPanelProps> = ({
  isMultiSelectMode,
  setIsMultiSelectMode,
  selectedSceneIds,
  setSelectedSceneIds,
  isCollapsed,
  setIsCollapsed,
  onRemoveSelectedScenes,
  draftConfig,
  setDraftConfig,
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
          onClick={() => setIsCollapsed((prev) => !prev)}
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
            borderRadius: 8,
            border: '1px solid var(--brand-border)',
            background: 'var(--panel-bg-translucent)',
          }}
        >
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: 'var(--text-secondary)' }}>
              {isMultiSelectMode ? `已选择 ${selectedSceneIds.length} 个画面格` : '未开启多选模式'}
            </Text>
            <Button
              size="small"
              type={isMultiSelectMode ? 'primary' : 'default'}
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
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                block
                danger
                icon={<DeleteOutlined />}
                disabled={selectedSceneIds.length === 0}
                onClick={onRemoveSelectedScenes}
              >
                批量删除
              </Button>
              <Button
                block
                icon={<MergeCellsOutlined />}
                disabled={selectedSceneIds.length < 2}
                onClick={() => {
                  const result = mergeSelectedScenes({
                    scenes: draftConfig.scenes,
                    selectedSceneIds,
                    strategy: 'auto',
                  });
                  if (result.ok) {
                    setDraftConfig({ ...draftConfig, scenes: result.scenes });
                    setSelectedSceneIds([]);
                    message.success(result.message || '合并成功');
                  } else {
                    message.error(result.message || '合并失败');
                  }
                }}
              >
                批量合并
              </Button>
              <Button block size="small" onClick={() => setSelectedSceneIds([])} disabled={selectedSceneIds.length === 0}>
                清空选择
              </Button>
            </Space>
          )}
        </div>
      )}
    </>
  );
};
