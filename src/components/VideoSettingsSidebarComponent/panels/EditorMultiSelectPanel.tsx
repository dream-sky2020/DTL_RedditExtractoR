import React, { useState } from 'react';
import { Button, Space, Typography, Divider, InputNumber, Select, Tooltip } from 'antd';
import {
  DownOutlined,
  UpOutlined,
  SelectOutlined,
  DeleteOutlined,
  MergeCellsOutlined,
  TranslationOutlined,
  CloseCircleOutlined,
  CheckSquareOutlined,
  BorderInnerOutlined,
  ClearOutlined,
  VerticalAlignTopOutlined,
  VerticalAlignBottomOutlined,
  AlignCenterOutlined,
  CommentOutlined,
  HistoryOutlined
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
  galleryPage?: number;
  galleryPageSize?: number;
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
  galleryPage,
  galleryPageSize,
}) => {
  const [historyLimit, setHistoryLimit] = useState<number>(2);

  const { mergeScenes } = useSceneMerge({
    selectedSceneIds,
    setSelectedSceneIds,
  });

  const handleSelectAll = () => {
    setSelectedSceneIds(draftConfig.scenes.map(s => s.id));
    toast.success(`已全选 ${draftConfig.scenes.length} 个场景`);
  };

  const handleSelectCurrentPage = () => {
    if (galleryPage === undefined || galleryPageSize === undefined) {
      // 如果没有分页信息，则退回到全选
      handleSelectAll();
      return;
    }
    const startIndex = (galleryPage - 1) * galleryPageSize;
    const currentPageScenes = draftConfig.scenes.slice(startIndex, startIndex + galleryPageSize);
    setSelectedSceneIds(currentPageScenes.map(s => s.id));
    toast.success(`已全选当前页面 ${currentPageScenes.length} 个场景`);
  };

  const handleClearQuotes = () => {
    if (selectedSceneIds.length === 0) return;

    const newScenes = draftConfig.scenes.map(scene => {
      if (!selectedSceneIds.includes(scene.id)) return scene;

      const newItems = scene.items.map(item => {
        let newContent = item.content;
        
        // 循环移除最内层的 quote，直到没有 quote 为止
        // [quote=... id=... #... | ...] ... [/quote]
        const innermostQuoteRegex = /\[quote=[^\]]*?\]((?:(?!\[quote=)[\s\S])*?)\[\/quote\]/g;
        let prevContent;
        do {
          prevContent = newContent;
          newContent = newContent.replace(innermostQuoteRegex, '');
        } while (newContent !== prevContent);

        // 清理由于移除引用可能产生的多余换行
        // 匹配 [\n] 且后面跟着 [\n] 或 [style
        newContent = newContent.replace(/\[\\n\]\s*(?=\[\\n\]|\[style)/g, '');
        // 清理开头和结尾的 [\n]
        newContent = newContent.replace(/^\[\\n\]+/, '').replace(/\[\\n\]+$/, '');

        return { ...item, content: newContent };
      });

      return { ...scene, items: newItems };
    });

    setDraftConfig({ ...draftConfig, scenes: newScenes });
    toast.success(`已清理 ${selectedSceneIds.length} 个场景中的引用内容`);
  };

  const handleBatchLayoutChange = (layout: 'top' | 'center' | 'bottom') => {
    if (selectedSceneIds.length === 0) return;

    const newScenes = draftConfig.scenes.map(scene => {
      if (!selectedSceneIds.includes(scene.id)) return scene;
      return { ...scene, layout };
    });

    setDraftConfig({ ...draftConfig, scenes: newScenes });
    toast.success(`已将 ${selectedSceneIds.length} 个场景的布局改为 ${layout}`);
  };

  const handleChatFlow = (direction: 'top' | 'bottom') => {
    if (selectedSceneIds.length === 0) return;

    // 1. 获取选中场景的原始数据（按在配置中的顺序）
    const selectedScenes = draftConfig.scenes.filter(s => selectedSceneIds.includes(s.id));
    
    // 2. 提取每个场景的“消息块”（假设每个场景的 items 作为一个整体消息）
    const messageBlocks = selectedScenes.map(s => s.items);

    // 3. 构建新的场景列表
    const newScenes = draftConfig.scenes.map(scene => {
      const selectedIdx = selectedScenes.findIndex(s => s.id === scene.id);
      if (selectedIdx === -1) return scene;

      // 计算当前场景应该包含哪些历史消息块
      const startIdx = Math.max(0, selectedIdx - historyLimit + 1);
      const blocksToShow = messageBlocks.slice(startIdx, selectedIdx + 1);

      let finalItems: any[] = [];
      if (direction === 'top') {
        // 最新在上：逆序排列
        for (let i = blocksToShow.length - 1; i >= 0; i--) {
          finalItems = [...finalItems, ...blocksToShow[i]];
        }
      } else {
        // 最新在下：顺序排列
        for (let i = 0; i < blocksToShow.length; i++) {
          finalItems = [...finalItems, ...blocksToShow[i]];
        }
      }

      return { ...scene, items: finalItems };
    });

    setDraftConfig({ ...draftConfig, scenes: newScenes });
    toast.success(`聊天流处理完成（${direction === 'top' ? '最新在上' : '最新在下'}，K=${historyLimit}）`);
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
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <Button
                      size="small"
                      icon={<VerticalAlignTopOutlined />}
                      disabled={selectedSceneIds.length === 0}
                      onClick={() => handleBatchLayoutChange('top')}
                      style={{
                        backgroundColor: selectedSceneIds.length > 0 ? '#fa8c16' : '#fff',
                        color: selectedSceneIds.length > 0 ? '#fff' : '#000',
                        borderColor: selectedSceneIds.length > 0 ? '#fa8c16' : '#d9d9d9',
                      }}
                    >
                      全部top
                    </Button>
                    <Button
                      size="small"
                      icon={<AlignCenterOutlined />}
                      disabled={selectedSceneIds.length === 0}
                      onClick={() => handleBatchLayoutChange('center')}
                      style={{
                        backgroundColor: selectedSceneIds.length > 0 ? '#fa8c16' : '#fff',
                        color: selectedSceneIds.length > 0 ? '#fff' : '#000',
                        borderColor: selectedSceneIds.length > 0 ? '#fa8c16' : '#d9d9d9',
                      }}
                    >
                      全部center
                    </Button>
                    <Button
                      size="small"
                      icon={<VerticalAlignBottomOutlined />}
                      disabled={selectedSceneIds.length === 0}
                      onClick={() => handleBatchLayoutChange('bottom')}
                      style={{
                        backgroundColor: selectedSceneIds.length > 0 ? '#fa8c16' : '#fff',
                        color: selectedSceneIds.length > 0 ? '#fff' : '#000',
                        borderColor: selectedSceneIds.length > 0 ? '#fa8c16' : '#d9d9d9',
                      }}
                    >
                      全部bottom
                    </Button>
                  </div>

                  <Divider style={{ margin: '8px 0' }} />

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
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                            <Option key={val} value={val}>{val}</Option>
                          ))}
                        </Select>
                      </div>
                      
                      <Button
                        block
                        size="small"
                        icon={<CommentOutlined />}
                        disabled={selectedSceneIds.length === 0}
                        onClick={() => handleChatFlow('top')}
                        style={{
                          backgroundColor: selectedSceneIds.length > 0 ? '#1890ff' : '#fff',
                          color: selectedSceneIds.length > 0 ? '#fff' : '#000',
                          borderColor: selectedSceneIds.length > 0 ? '#1890ff' : '#d9d9d9',
                        }}
                      >
                        聊天流格式处理（最新在上）
                      </Button>
                      
                      <Button
                        block
                        size="small"
                        icon={<CommentOutlined />}
                        disabled={selectedSceneIds.length === 0}
                        onClick={() => handleChatFlow('bottom')}
                        style={{
                          backgroundColor: selectedSceneIds.length > 0 ? '#1890ff' : '#fff',
                          color: selectedSceneIds.length > 0 ? '#fff' : '#000',
                          borderColor: selectedSceneIds.length > 0 ? '#1890ff' : '#d9d9d9',
                        }}
                      >
                        聊天流格式处理（最新在下）
                      </Button>
                    </Space>
                  </div>

                  <Button
                    block
                    icon={<ClearOutlined />}
                    disabled={selectedSceneIds.length === 0}
                    onClick={handleClearQuotes}
                    style={{
                      backgroundColor: selectedSceneIds.length > 0 ? '#fa8c16' : '#fff',
                      color: selectedSceneIds.length > 0 ? '#fff' : '#000',
                      borderColor: selectedSceneIds.length > 0 ? '#fa8c16' : '#d9d9d9',
                    }}
                  >
                    清理引用
                  </Button>
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
