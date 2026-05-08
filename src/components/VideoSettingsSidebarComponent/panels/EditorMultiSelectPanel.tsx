import React from 'react';
import { Button, Space, Typography, Divider, InputNumber, Select, Tooltip, Input } from 'antd';
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
  HistoryOutlined,
  LineHeightOutlined,
  DragOutlined
} from '@ant-design/icons';
import { VideoConfig } from '../../../types';
import { useSceneMerge } from '../../../hooks/useSceneMerge';
import { SceneReorderSection } from '../sections/SceneReorderSection';
import { toast } from '@components/Toast';
import { useSettingsStore } from '@/store';

const { Text } = Typography;
const { Option } = Select;

/** 1-based 正序 / 负序索引，不允许 0；清空时回到 1；经 0 步进时在 ±1 之间跳过 */
function applyItemIndexChange(val: number | null, prev: number, set: (n: number) => void) {
  if (val == null) {
    set(1);
    return;
  }
  if (val === 0) {
    set(prev > 0 ? -1 : 1);
    return;
  }
  set(val);
}

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
  const { editorUiSettings, setMultiSelectUiSettings } = useSettingsStore();
  const {
    historyLimit,
    batchSceneDuration = 3,
    batchItemSpacing,
    offsetX,
    offsetY,
    stickyItemIndex,
    stickyValue,
    insertTextItemIndex,
    insertTextValue,
    animationItemIndex = 1,
    animationKeyframes = '',
  } = editorUiSettings.multiSelect;
  const setHistoryLimit = (value: number) => setMultiSelectUiSettings({ historyLimit: value });
  const setBatchSceneDuration = (value: number) => setMultiSelectUiSettings({ batchSceneDuration: value });
  const setBatchItemSpacing = (value: number) => setMultiSelectUiSettings({ batchItemSpacing: value });
  const setOffsetX = (value: number) => setMultiSelectUiSettings({ offsetX: value });
  const setOffsetY = (value: number) => setMultiSelectUiSettings({ offsetY: value });
  const setStickyItemIndex = (value: number) => setMultiSelectUiSettings({ stickyItemIndex: value });
  const setStickyValue = (value: number | boolean) => setMultiSelectUiSettings({ stickyValue: value });
  const setInsertTextItemIndex = (value: number) => setMultiSelectUiSettings({ insertTextItemIndex: value });
  const setInsertTextValue = (value: string) => setMultiSelectUiSettings({ insertTextValue: value });
  const setAnimationItemIndex = (value: number) => setMultiSelectUiSettings({ animationItemIndex: value });
  const setAnimationKeyframes = (value: string) => setMultiSelectUiSettings({ animationKeyframes: value });

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

  const handleBatchItemSpacingChange = () => {
    if (selectedSceneIds.length === 0) return;

    const newScenes = draftConfig.scenes.map(scene => {
      if (!selectedSceneIds.includes(scene.id)) return scene;
      return { ...scene, itemSpacing: batchItemSpacing };
    });

    setDraftConfig({ ...draftConfig, scenes: newScenes });
    toast.success(`已将 ${selectedSceneIds.length} 个场景的项目间距改为 ${batchItemSpacing}`);
  };

  const handleBatchSceneDurationChange = () => {
    if (selectedSceneIds.length === 0) return;

    if (!Number.isFinite(batchSceneDuration) || batchSceneDuration <= 0) {
      toast.warning('请输入大于 0 的场景时长');
      return;
    }

    const newScenes = draftConfig.scenes.map(scene => {
      if (!selectedSceneIds.includes(scene.id)) return scene;
      return {
        ...scene,
        duration: batchSceneDuration,
        items: scene.items.map(item => ({
          ...item,
          exitAt: batchSceneDuration,
        })),
      };
    });

    setDraftConfig({ ...draftConfig, scenes: newScenes });
    toast.success(`已将 ${selectedSceneIds.length} 个场景的时长和 item exitAt 改为 ${batchSceneDuration}s`);
  };

  const handleBatchOffsetChange = () => {
    if (selectedSceneIds.length === 0) return;

    const offsetStr = `x: ${offsetX}; y: ${offsetY}`;
    const newScenes = draftConfig.scenes.map(scene => {
      if (!selectedSceneIds.includes(scene.id)) return scene;
      return { ...scene, offset: offsetStr };
    });

    setDraftConfig({ ...draftConfig, scenes: newScenes });
    toast.success(`已将 ${selectedSceneIds.length} 个场景的偏移设置为 ${offsetStr}`);
  };

  const handleBatchStickyChange = () => {
    if (selectedSceneIds.length === 0) return;

    const newScenes = draftConfig.scenes.map(scene => {
      if (!selectedSceneIds.includes(scene.id)) return scene;

      const items = [...scene.items];
      // 清除该场景中所有现有的 sticky
      items.forEach(item => { delete item.sticky; });

      let targetIdx = -1;
      if (stickyItemIndex > 0) {
        targetIdx = stickyItemIndex - 1; // 1-based to 0-based
      } else if (stickyItemIndex < 0) {
        targetIdx = items.length + stickyItemIndex; // -1 is last
      }

      if (targetIdx >= 0 && targetIdx < items.length) {
        items[targetIdx] = { ...items[targetIdx], sticky: stickyValue };
      }

      return { ...scene, items };
    });

    setDraftConfig({ ...draftConfig, scenes: newScenes });
    toast.success(`已更新 ${selectedSceneIds.length} 个场景的强制居中设置`);
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

  const handleBatchInsertTextToItem = () => {
    if (selectedSceneIds.length === 0) return;

    const textToInsert = insertTextValue;
    if (!textToInsert) {
      toast.warning('请先输入要插入的文本');
      return;
    }

    let affectedSceneCount = 0;
    const newScenes = draftConfig.scenes.map(scene => {
      if (!selectedSceneIds.includes(scene.id)) return scene;

      const items = [...scene.items];
      let targetIdx = -1;
      if (insertTextItemIndex > 0) {
        targetIdx = insertTextItemIndex - 1; // 1-based to 0-based
      } else if (insertTextItemIndex < 0) {
        targetIdx = items.length + insertTextItemIndex; // -1 is last
      }

      if (targetIdx >= 0 && targetIdx < items.length) {
        const targetItem = items[targetIdx];
        items[targetIdx] = {
          ...targetItem,
          content: `${targetItem.content}${textToInsert}`,
        };
        affectedSceneCount += 1;
      }

      return { ...scene, items };
    });

    setDraftConfig({ ...draftConfig, scenes: newScenes });
    if (affectedSceneCount > 0) {
      toast.success(`已在 ${affectedSceneCount} 个场景的指定 item 末尾插入文本`);
      return;
    }
    toast.warning('未找到可插入的目标 item，请检查索引');
  };

  const handleBatchItemKeyframesChange = () => {
    if (selectedSceneIds.length === 0) return;

    const nextKeyframes = animationKeyframes.trim();
    let affectedSceneCount = 0;
    const newScenes = draftConfig.scenes.map(scene => {
      if (!selectedSceneIds.includes(scene.id)) return scene;

      const targetIdx = animationItemIndex > 0
        ? animationItemIndex - 1
        : animationItemIndex < 0
          ? scene.items.length + animationItemIndex
          : -1;

      if (targetIdx < 0 || targetIdx >= scene.items.length) {
        return scene;
      }

      const items = scene.items.map((item, itemIndex) => {
        if (itemIndex !== targetIdx) return item;
        affectedSceneCount += 1;
        if (nextKeyframes) {
          return { ...item, keyframes: nextKeyframes };
        }
        const nextItem = { ...item };
        delete nextItem.keyframes;
        return nextItem;
      });

      return { ...scene, items };
    });

    setDraftConfig({ ...draftConfig, scenes: newScenes });
    if (affectedSceneCount > 0) {
      toast.success(nextKeyframes
        ? `已更新 ${affectedSceneCount} 个场景的指定 item 关键帧动画`
        : `已清除 ${affectedSceneCount} 个场景的指定 item 关键帧动画`);
      return;
    }
    toast.warning('未找到可修改动画的目标 item，请检查索引');
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <Text style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>场景时长:</Text>
                    <InputNumber
                      size="small"
                      min={0.1}
                      step={0.1}
                      value={batchSceneDuration}
                      onChange={(val) => setBatchSceneDuration(val ?? 3)}
                      style={{ width: 70 }}
                    />
                    <Button
                      size="small"
                      disabled={selectedSceneIds.length === 0}
                      onClick={handleBatchSceneDurationChange}
                      style={{
                        flex: 1,
                        backgroundColor: selectedSceneIds.length > 0 ? '#fa8c16' : '#fff',
                        color: selectedSceneIds.length > 0 ? '#fff' : '#000',
                        borderColor: selectedSceneIds.length > 0 ? '#fa8c16' : '#d9d9d9',
                      }}
                    >
                      修改时长
                    </Button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <Text style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>项目间距:</Text>
                    <InputNumber
                      size="small"
                      min={0}
                      max={200}
                      value={batchItemSpacing}
                      onChange={(val) => setBatchItemSpacing(val || 0)}
                      style={{ width: 70 }}
                    />
                    <Button
                      size="small"
                      icon={<LineHeightOutlined />}
                      disabled={selectedSceneIds.length === 0}
                      onClick={handleBatchItemSpacingChange}
                      style={{
                        flex: 1,
                        backgroundColor: selectedSceneIds.length > 0 ? '#fa8c16' : '#fff',
                        color: selectedSceneIds.length > 0 ? '#fff' : '#000',
                        borderColor: selectedSceneIds.length > 0 ? '#fa8c16' : '#d9d9d9',
                      }}
                    >
                      统一间距
                    </Button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <Text style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>偏移:</Text>
                    <InputNumber
                      size="small"
                      placeholder="X"
                      value={offsetX}
                      onChange={(val) => setOffsetX(val || 0)}
                      style={{ width: 55 }}
                    />
                    <InputNumber
                      size="small"
                      placeholder="Y"
                      value={offsetY}
                      onChange={(val) => setOffsetY(val || 0)}
                      style={{ width: 55 }}
                    />
                    <Button
                      size="small"
                      icon={<DragOutlined />}
                      disabled={selectedSceneIds.length === 0}
                      onClick={handleBatchOffsetChange}
                      style={{
                        flex: 1,
                        backgroundColor: selectedSceneIds.length > 0 ? '#fa8c16' : '#fff',
                        color: selectedSceneIds.length > 0 ? '#fff' : '#000',
                        borderColor: selectedSceneIds.length > 0 ? '#fa8c16' : 'var(--brand-border)',
                      }}
                    >
                      统一偏移
                    </Button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <Text style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>居中项:</Text>
                    <Tooltip title="正数从前往后(1,2...)，负数从后往前(-1,-2...)">
                      <InputNumber
                        size="small"
                        step={1}
                        placeholder="索引"
                        value={stickyItemIndex}
                        onChange={(val) => applyItemIndexChange(val, stickyItemIndex, setStickyItemIndex)}
                        style={{ width: 55 }}
                      />
                    </Tooltip>
                    <Tooltip title="居中位置比例 (0-1)，0.5 为正中心">
                      <InputNumber
                        size="small"
                        min={0}
                        max={1}
                        step={0.1}
                        placeholder="比例"
                        value={typeof stickyValue === 'number' ? stickyValue : 0.5}
                        onChange={(val) => setStickyValue(val ?? 0.5)}
                        style={{ width: 55 }}
                      />
                    </Tooltip>
                    <Button
                      size="small"
                      icon={<AlignCenterOutlined />}
                      disabled={selectedSceneIds.length === 0}
                      onClick={handleBatchStickyChange}
                      style={{
                        flex: 1,
                        backgroundColor: selectedSceneIds.length > 0 ? '#fa8c16' : '#fff',
                        color: selectedSceneIds.length > 0 ? '#fff' : '#000',
                        borderColor: selectedSceneIds.length > 0 ? '#fa8c16' : 'var(--brand-border)',
                      }}
                    >
                      设置居中项
                    </Button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <Text style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>插入项:</Text>
                    <Tooltip title="正数从前往后(1,2...)，负数从后往前(-1,-2...)">
                      <InputNumber
                        size="small"
                        step={1}
                        placeholder="索引"
                        value={insertTextItemIndex}
                        onChange={(val) => applyItemIndexChange(val, insertTextItemIndex, setInsertTextItemIndex)}
                        style={{ width: 55 }}
                      />
                    </Tooltip>
                    <Input
                      size="small"
                      placeholder="输入要插入的文本"
                      value={insertTextValue}
                      onChange={(e) => setInsertTextValue(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <Button
                      size="small"
                      disabled={selectedSceneIds.length === 0 || !insertTextValue}
                      onClick={handleBatchInsertTextToItem}
                      style={{
                        backgroundColor: selectedSceneIds.length > 0 && insertTextValue ? '#fa8c16' : '#fff',
                        color: selectedSceneIds.length > 0 && insertTextValue ? '#fff' : '#000',
                        borderColor: selectedSceneIds.length > 0 && insertTextValue ? '#fa8c16' : 'var(--brand-border)',
                      }}
                    >
                      插入文本
                    </Button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, marginTop: 4 }}>
                    <Text style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', paddingTop: 4 }}>动画项:</Text>
                    <Tooltip title="正数从前往后(1,2...)，负数从后往前(-1,-2...)">
                      <InputNumber
                        size="small"
                        step={1}
                        placeholder="索引"
                        value={animationItemIndex}
                        onChange={(val) => applyItemIndexChange(val, animationItemIndex, setAnimationItemIndex)}
                        style={{ width: 55 }}
                      />
                    </Tooltip>
                    <Input.TextArea
                      size="small"
                      placeholder="输入 item keyframes，留空则清除"
                      value={animationKeyframes}
                      onChange={(e) => setAnimationKeyframes(e.target.value)}
                      autoSize={{ minRows: 1, maxRows: 3 }}
                      style={{ flex: 1 }}
                    />
                    <Button
                      size="small"
                      disabled={selectedSceneIds.length === 0}
                      onClick={handleBatchItemKeyframesChange}
                      style={{
                        backgroundColor: selectedSceneIds.length > 0 ? '#fa8c16' : '#fff',
                        color: selectedSceneIds.length > 0 ? '#fff' : '#000',
                        borderColor: selectedSceneIds.length > 0 ? '#fa8c16' : 'var(--brand-border)',
                      }}
                    >
                      修改动画
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
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10,11 ,12 ,13 ,14 ,15 ,16].map(val => (
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
