import React, { useState } from 'react';
import { Button, Space, Typography, Divider, InputNumber, Select, Tooltip } from 'antd';
import {
  DownOutlined,
  UpOutlined,
  SelectOutlined,
  DeleteOutlined,
  MergeCellsOutlined,
  TranslationOutlined,
  VerticalAlignTopOutlined,
  VerticalAlignBottomOutlined,
  ArrowRightOutlined,
  ClockCircleOutlined,
  FontSizeOutlined
} from '@ant-design/icons';
import { VideoConfig } from '../../../types';
import { useSceneMerge } from '../../../hooks/useSceneMerge';
import { useSceneReorder } from '../../../hooks/useSceneReorder';
import { dialogs } from '@components/Dialogs';
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

  const {
    moveSelectedToStart,
    moveSelectedToEnd,
    moveSelectedToIndex,
    sortScenes
  } = useSceneReorder();

  const [targetIndex, setTargetIndex] = useState<number>(1);
  const [insertPosition, setInsertPosition] = useState<'before' | 'after'>('before');

  const handleMoveToIndex = () => {
    // 用户输入的 1-based index 转换为 0-based
    moveSelectedToIndex(selectedSceneIds, targetIndex - 1, insertPosition);
    toast.success(`已移动到第 ${targetIndex} 个画面格${insertPosition === 'before' ? '之前' : '之后'}`);
  };

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
                </Space>
              </div>

              <Divider style={{ margin: '8px 0' }} />

              <div>
                <div style={{ marginBottom: 8 }}>
                  <Text style={{ fontSize: 12, color: 'var(--text-primary)' }}>快速重排</Text>
                </div>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Button 
                      icon={<VerticalAlignTopOutlined />} 
                      disabled={selectedSceneIds.length === 0}
                      onClick={() => {
                        moveSelectedToStart(selectedSceneIds);
                        toast.success('已移动到最前');
                      }}
                      style={{
                        backgroundColor: selectedSceneIds.length > 0 ? '#ffec3d' : '#f5f5f5',
                        color: selectedSceneIds.length > 0 ? '#000' : '#bfbfbf',
                        borderColor: selectedSceneIds.length > 0 ? '#ffec3d' : '#d9d9d9',
                      }}
                    >
                      移至最前
                    </Button>
                    <Button 
                      icon={<VerticalAlignBottomOutlined />} 
                      disabled={selectedSceneIds.length === 0}
                      onClick={() => {
                        moveSelectedToEnd(selectedSceneIds);
                        toast.success('已移动到最后');
                      }}
                      style={{
                        backgroundColor: selectedSceneIds.length > 0 ? '#ffec3d' : '#f5f5f5',
                        color: selectedSceneIds.length > 0 ? '#000' : '#bfbfbf',
                        borderColor: selectedSceneIds.length > 0 ? '#ffec3d' : '#d9d9d9',
                      }}
                    >
                      移至最后
                    </Button>
                  </Space>
                  
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: 8, gap: 4 }}>
                    <Text style={{ fontSize: 12, color: 'var(--text-primary)' }}>移动到第</Text>
                    <InputNumber 
                      size="small" 
                      min={1} 
                      max={draftConfig.scenes.length} 
                      value={targetIndex} 
                      onChange={(val) => setTargetIndex(val || 1)}
                      style={{ width: 60 }}
                    />
                    <Text style={{ fontSize: 12, color: 'var(--text-primary)' }}>个</Text>
                    <Select 
                      size="small" 
                      value={insertPosition} 
                      onChange={setInsertPosition}
                      style={{ width: 70 }}
                    >
                      <Option value="before">之前</Option>
                      <Option value="after">之后</Option>
                    </Select>
                    <Button 
                      size="small" 
                      type="primary" 
                      icon={<ArrowRightOutlined />}
                      disabled={selectedSceneIds.length === 0}
                      onClick={handleMoveToIndex}
                    />
                  </div>
                </Space>
              </div>

              <Divider style={{ margin: '8px 0' }} />

              <div>
                <div style={{ marginBottom: 8 }}>
                  <Text style={{ fontSize: 12, color: 'var(--text-primary)' }}>排序建议</Text>
                </div>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Tooltip title="按场景时长从短到长排序">
                    <Button 
                      size="small" 
                      icon={<ClockCircleOutlined />} 
                      onClick={() => {
                        sortScenes('duration');
                        toast.success('已按时长排序');
                      }}
                    >
                      时长排序
                    </Button>
                  </Tooltip>
                  <Tooltip title="按场景文本总字数排序">
                    <Button 
                      size="small" 
                      icon={<FontSizeOutlined />} 
                      onClick={() => {
                        sortScenes('textLength');
                        toast.success('已按字数排序');
                      }}
                    >
                      字数排序
                    </Button>
                  </Tooltip>
                </Space>
              </div>

              <Button
                block
                size="small"
                onClick={() => setSelectedSceneIds([])}
                disabled={selectedSceneIds.length === 0}
                style={{
                  backgroundColor: '#fff',
                  color: '#000',
                  marginTop: 8
                }}
              >
                清空选择
              </Button>
            </Space>
          )}
        </div>
      )}
    </>
  );
};
