import React, { useState } from 'react';
import { Button, Space, Typography, Divider, InputNumber, Select, Tooltip } from 'antd';
import {
  DownOutlined,
  UpOutlined,
  SelectOutlined,
  DeleteOutlined,
  MergeCellsOutlined,
  TranslationOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { VideoConfig } from '../../../types';
import { useSceneMerge } from '../../../hooks/useSceneMerge';
import { SceneReorderSection } from '../sections/SceneReorderSection';
import { toast } from '@components/Toast';

const { Text } = Typography;
const { Option } = Select;

interface EditorMultiSelectPanelProps {
  isMultiSelectMode: boolean;
  setIsMultiSelectMode: (mode: boolean) => void;
  selectedSceneIds: string[];
  setSelectedSceneIds: (ids: string[]) => void;
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  onRemoveSelectedScenes?: () => void;
  onOpenTranslationModal?: () => void;
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
  onOpenTranslationModal,
  draftConfig,
  setDraftConfig,
}) => {
  const { mergeScenes } = useSceneMerge({
    selectedSceneIds,
    setSelectedSceneIds,
  });

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
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <div style={{ marginBottom: 8 }}>
                  <Text style={{ fontSize: 12, color: 'var(--text-primary)' }}>批量操作</Text>
                </div>
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <Button
                    block
                    icon={<DeleteOutlined />}
                    disabled={selectedSceneIds.length === 0}
                    onClick={onRemoveSelectedScenes}
                    style={{
                      backgroundColor: selectedSceneIds.length > 0 ? '#ff4d4f' : '#fff',
                      color: selectedSceneIds.length > 0 ? '#fff' : '#000',
                      borderColor: selectedSceneIds.length > 0 ? '#ff4d4f' : '#d9d9d9',
                    }}
                  >
                    批量删除
                  </Button>
                  <Button
                    block
                    icon={<TranslationOutlined />}
                    disabled={selectedSceneIds.length === 0}
                    onClick={onOpenTranslationModal}
                    style={{
                      backgroundColor: selectedSceneIds.length > 0 ? '#ffec3d' : '#fff',
                      color: '#000',
                      borderColor: selectedSceneIds.length > 0 ? '#ffec3d' : '#d9d9d9',
                    }}
                  >
                    批量翻译
                  </Button>
                  <Button
                    block
                    icon={<MergeCellsOutlined />}
                    disabled={selectedSceneIds.length < 2}
                    onClick={() => mergeScenes(selectedSceneIds)}
                    style={{
                      backgroundColor: selectedSceneIds.length >= 2 ? '#ffec3d' : '#fff',
                      color: '#000',
                      borderColor: selectedSceneIds.length >= 2 ? '#ffec3d' : '#d9d9d9',
                    }}
                  >
                    批量合并
                  </Button>
                  <Button
                    block
                    icon={<CloseCircleOutlined />}
                    disabled={selectedSceneIds.length === 0}
                    onClick={() => setSelectedSceneIds([])}
                    style={{
                      backgroundColor: '#fff',
                      color: '#000',
                      borderColor: '#d9d9d9',
                    }}
                  >
                    清空选择
                  </Button>
                </Space>
              </div>

              <SceneReorderSection 
                selectedSceneIds={selectedSceneIds}
                totalScenes={draftConfig.scenes.length}
              />
            </Space>
          )}
        </div>
      )}
    </>
  );
};
