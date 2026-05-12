import React from 'react';
import { Button, Space, Typography, Divider, InputNumber, Select, Tooltip, Input } from 'antd';
import {
  DownOutlined,
  UpOutlined,
  SelectOutlined,
  DeleteOutlined,
  CopyOutlined,
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
  DragOutlined,
  ScissorOutlined
} from '@ant-design/icons';
import { VideoConfig, VideoScene } from '../../../types';
import { useSceneMerge } from '../../../hooks/useSceneMerge';
import { SceneReorderSection } from '../sections/SceneReorderSection';
import { toast } from '@components/Toast';
import { useSettingsStore } from '@/store';
import { dialogs } from '@components/Dialogs';
import { sceneToDsl, parseSceneDsl } from '../../../rendering/sceneDsl';

const { Text } = Typography;
const { Option } = Select;

type InsertTextMode = 'fixed' | 'weightedRandom';

interface WeightedInsertTextOption {
  text: string;
  weight: number;
}

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

function createUniqueRandomId(existingIds: Set<string>, prefix = '') {
  let nextId = '';
  do {
    nextId = `${prefix}${Math.random().toString(36).slice(2, 9)}`;
  } while (existingIds.has(nextId));
  existingIds.add(nextId);
  return nextId;
}

function parseWeightedInsertTextOptions(source: string): { options: WeightedInsertTextOption[]; error?: string } {
  const lines = source.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const options: WeightedInsertTextOption[] = [];

  for (const line of lines) {
    const separatorIndex = line.lastIndexOf('|');
    if (separatorIndex === -1) {
      return { options: [], error: '随机插入配置请使用“文本 | 权重”的格式' };
    }

    const text = line.slice(0, separatorIndex).trim();
    const weight = Number(line.slice(separatorIndex + 1).trim());
    if (!text) {
      return { options: [], error: '随机插入配置中存在空文本' };
    }
    if (!Number.isFinite(weight) || weight <= 0) {
      return { options: [], error: '随机插入权重必须是大于 0 的数字' };
    }
    options.push({ text, weight });
  }

  if (options.length === 0) {
    return { options: [], error: '请先填写随机插入文本和权重' };
  }
  return { options };
}

function pickWeightedInsertText(options: WeightedInsertTextOption[]) {
  const totalWeight = options.reduce((sum, option) => sum + option.weight, 0);
  let cursor = Math.random() * totalWeight;
  for (const option of options) {
    cursor -= option.weight;
    if (cursor <= 0) {
      return option.text;
    }
  }
  return options[options.length - 1]?.text ?? '';
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
    insertTextMode = 'fixed',
    insertTextValue,
    insertTextWeightedOptions = '',
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
  const setInsertTextMode = (value: InsertTextMode) => setMultiSelectUiSettings({ insertTextMode: value });
  const setInsertTextValue = (value: string) => setMultiSelectUiSettings({ insertTextValue: value });
  const setInsertTextWeightedOptions = (value: string) => setMultiSelectUiSettings({ insertTextWeightedOptions: value });
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

  const handleOpenSplitModal = () => {
    if (selectedSceneIds.length !== 1) {
      toast.warning('请选择 1 个画面格后再进行裁剪');
      return;
    }
    const scene = draftConfig.scenes.find(s => s.id === selectedSceneIds[0]);
    if (!scene) return;
    
    dialogs.showSplitHelper({
      initialValue: sceneToDsl(scene),
      onOk: handleApplySplit
    });
  };

  const handleApplySplit = (dslWithSplits: string) => {
    const sourceSceneIndex = draftConfig.scenes.findIndex(scene => scene.id === selectedSceneIds[0]);
    if (sourceSceneIndex === -1) return;
    
    const sourceScene = draftConfig.scenes[sourceSceneIndex];
    
    // 1. 替换 [split] 为标记并解析
    const splitMarker = `__SPLIT_${Math.random().toString(36).slice(2, 9)}__`;
    const dslForParsing = dslWithSplits.replace(/\[split\]/g, splitMarker);
    
    const parseResult = parseSceneDsl(dslForParsing, sourceScene);
    if (!parseResult.ok) {
      toast.error(`解析失败: ${parseResult.error}`);
      return;
    }

    const parsedScene = parseResult.scene;
    
    // 2. 智能拆分每个 item 的 content
    let maxParts = 1;
    const itemPartsMap = parsedScene.items.map(item => {
      if (!item.content.includes(splitMarker)) return [item.content];

      // 完美方案的关键：使用正则捕获 <#text#> 及其前后的“外壳”
      // 这样可以确保 [style] 标签和作者名等前缀在每个分段中都被保留
      const textTagRegex = /^([\s\S]*?<#text#>)([\s\S]*?)(<\/#text#>[\s\S]*)$/;
      const match = item.content.match(textTagRegex);

      if (match) {
        const [_, prefix, innerContent, suffix] = match;
        const segments = innerContent.split(splitMarker);
        if (segments.length > maxParts) maxParts = segments.length;
        // 为每个片段重新套上外壳
        return segments.map(seg => `${prefix}${seg}${suffix}`);
      } else {
        // 如果没有 <#text#> 标签，则回退到普通拆分（适用于纯文本 item）
        const segments = item.content.split(splitMarker);
        if (segments.length > maxParts) maxParts = segments.length;
        return segments;
      }
    });

    if (maxParts <= 1) {
      toast.warning('未检测到有效的 [split] 标记');
      return;
    }

    // 3. 生成新场景
    const sceneIds = new Set(draftConfig.scenes.map(scene => scene.id));
    const itemIds = new Set(draftConfig.scenes.flatMap(scene => scene.items.map(item => item.id)));
    
    const newGeneratedScenes: VideoScene[] = [];
    for (let i = 0; i < maxParts; i++) {
      const newScene: VideoScene = {
        ...parsedScene,
        id: createUniqueRandomId(sceneIds, 'scene-'),
        items: parsedScene.items.map((item, itemIdx) => ({
          ...item,
          id: createUniqueRandomId(itemIds),
          // 如果当前 item 份数不足，则取最后一份（保持内容显示）
          content: itemPartsMap[itemIdx][i] ?? itemPartsMap[itemIdx][itemPartsMap[itemIdx].length - 1]
        }))
      };
      newGeneratedScenes.push(newScene);
    }

    // 4. 应用到配置
    const newScenes = [...draftConfig.scenes];
    newScenes.splice(sourceSceneIndex, 1, ...newGeneratedScenes);
    
    setDraftConfig({ ...draftConfig, scenes: newScenes });
    setSelectedSceneIds(newGeneratedScenes.map(s => s.id));
    toast.success(`已成功裁剪并生成 ${newGeneratedScenes.length} 个新画面格`);
  };

  const handleDuplicateSelectedScene = () => {
    if (selectedSceneIds.length !== 1) {
      toast.warning('请选择 1 个画面格后再复制');
      return;
    }

    const sourceSceneIndex = draftConfig.scenes.findIndex(scene => scene.id === selectedSceneIds[0]);
    if (sourceSceneIndex === -1) {
      toast.warning('未找到要复制的画面格');
      return;
    }

    const sceneIds = new Set(draftConfig.scenes.map(scene => scene.id));
    const itemIds = new Set(draftConfig.scenes.flatMap(scene => scene.items.map(item => item.id)));
    const sourceScene = draftConfig.scenes[sourceSceneIndex];
    const duplicatedScene: VideoScene = {
      ...sourceScene,
      id: createUniqueRandomId(sceneIds, 'scene-'),
      items: sourceScene.items.map(item => ({
        ...item,
        id: createUniqueRandomId(itemIds),
      })),
    };
    const newScenes = [...draftConfig.scenes];
    newScenes.splice(sourceSceneIndex + 1, 0, duplicatedScene);

    setDraftConfig({ ...draftConfig, scenes: newScenes });
    setSelectedSceneIds([duplicatedScene.id]);
    toast.success('已根据选中的画面格复制出新画面格');
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

  const handleRemoveLineBreakTags = () => {
    if (selectedSceneIds.length === 0) return;

    let affectedItemCount = 0;
    const newScenes = draftConfig.scenes.map(scene => {
      if (!selectedSceneIds.includes(scene.id)) return scene;

      const newItems = scene.items.map(item => {
        const newContent = item.content.replace(/\[\\n\]|\r?\n/g, '');
        if (newContent !== item.content) {
          affectedItemCount += 1;
        }
        return { ...item, content: newContent };
      });

      return { ...scene, items: newItems };
    });

    setDraftConfig({ ...draftConfig, scenes: newScenes });
    if (affectedItemCount > 0) {
      toast.success(`已去除 ${affectedItemCount} 个 item 中的换行标记`);
      return;
    }
    toast.warning('选中的画面格中没有找到换行标记');
  };

  const handleRemoveFirstLineBreakTag = () => {
    if (selectedSceneIds.length === 0) return;

    let affectedItemCount = 0;
    const newScenes = draftConfig.scenes.map(scene => {
      if (!selectedSceneIds.includes(scene.id)) return scene;

      const newItems = scene.items.map(item => {
        const newContent = item.content.replace(/\[\\n\]|\r?\n/, '');
        if (newContent !== item.content) {
          affectedItemCount += 1;
        }
        return { ...item, content: newContent };
      });

      return { ...scene, items: newItems };
    });

    setDraftConfig({ ...draftConfig, scenes: newScenes });
    if (affectedItemCount > 0) {
      toast.success(`已去除 ${affectedItemCount} 个 item 中的第一个换行标记`);
      return;
    }
    toast.warning('选中的画面格中没有找到换行标记');
  };

  const handleEnableGlassForSelectedItems = () => {
    if (selectedSceneIds.length === 0) return;

    let affectedItemCount = 0;
    const newScenes = draftConfig.scenes.map(scene => {
      if (!selectedSceneIds.includes(scene.id)) return scene;

      return {
        ...scene,
        items: scene.items.map(item => {
          affectedItemCount += 1;
          return {
            ...item,
            glass: true,
          };
        }),
      };
    });

    setDraftConfig({ ...draftConfig, scenes: newScenes });
    toast.success(`已将 ${affectedItemCount} 个 item 改为毛玻璃效果`);
  };

  const handleDisableGlassForSelectedItems = () => {
    if (selectedSceneIds.length === 0) return;

    let affectedItemCount = 0;
    const newScenes = draftConfig.scenes.map(scene => {
      if (!selectedSceneIds.includes(scene.id)) return scene;

      return {
        ...scene,
        items: scene.items.map(item => {
          const nextItem = { ...item };
          if (
            nextItem.glass !== undefined ||
            nextItem.glassBlur !== undefined ||
            nextItem.glassOpacity !== undefined ||
            nextItem.glassTint !== undefined ||
            nextItem.glassBorderColor !== undefined ||
            nextItem.glassShadow !== undefined
          ) {
            affectedItemCount += 1;
          }
          delete nextItem.glass;
          delete nextItem.glassBlur;
          delete nextItem.glassOpacity;
          delete nextItem.glassTint;
          delete nextItem.glassBorderColor;
          delete nextItem.glassShadow;
          return nextItem;
        }),
      };
    });

    setDraftConfig({ ...draftConfig, scenes: newScenes });
    if (affectedItemCount > 0) {
      toast.success(`已取消 ${affectedItemCount} 个 item 的毛玻璃属性`);
      return;
    }
    toast.warning('选中的画面格中没有找到毛玻璃属性');
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

    const isWeightedRandomMode = insertTextMode === 'weightedRandom';
    const weightedOptionsResult = isWeightedRandomMode
      ? parseWeightedInsertTextOptions(insertTextWeightedOptions)
      : { options: [] };

    if (isWeightedRandomMode && weightedOptionsResult.error) {
      toast.warning(weightedOptionsResult.error);
      return;
    }
    if (!isWeightedRandomMode && !insertTextValue) {
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
        const textToInsert = isWeightedRandomMode
          ? pickWeightedInsertText(weightedOptionsResult.options)
          : insertTextValue;
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
      toast.success(`已在 ${affectedSceneCount} 个场景的指定 item 末尾${isWeightedRandomMode ? '随机' : ''}插入文本`);
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

  const canInsertText = selectedSceneIds.length > 0
    && (insertTextMode === 'weightedRandom' ? insertTextWeightedOptions.trim() : insertTextValue);

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
                  <Button
                    block
                    size="small"
                    icon={<CopyOutlined />}
                    disabled={selectedSceneIds.length !== 1}
                    onClick={handleDuplicateSelectedScene}
                    style={{
                      backgroundColor: selectedSceneIds.length === 1 ? '#52c41a' : '#fff',
                      color: selectedSceneIds.length === 1 ? '#fff' : '#000',
                      borderColor: selectedSceneIds.length === 1 ? '#52c41a' : '#d9d9d9',
                    }}
                  >
                    以此复制新画面格
                  </Button>
                  <Button
                    block
                    size="small"
                    icon={<ScissorOutlined />}
                    disabled={selectedSceneIds.length !== 1}
                    onClick={handleOpenSplitModal}
                    style={{
                      backgroundColor: selectedSceneIds.length === 1 ? '#722ed1' : '#fff',
                      color: selectedSceneIds.length === 1 ? '#fff' : '#000',
                      borderColor: selectedSceneIds.length === 1 ? '#722ed1' : '#d9d9d9',
                    }}
                  >
                    根据 [split] 裁剪
                  </Button>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <Button
                      size="small"
                      icon={<BorderInnerOutlined />}
                      disabled={selectedSceneIds.length === 0}
                      onClick={handleEnableGlassForSelectedItems}
                      style={{
                        backgroundColor: selectedSceneIds.length > 0 ? '#13c2c2' : '#fff',
                        color: selectedSceneIds.length > 0 ? '#fff' : '#000',
                        borderColor: selectedSceneIds.length > 0 ? '#13c2c2' : '#d9d9d9',
                      }}
                    >
                      item毛玻璃
                    </Button>
                    <Button
                      size="small"
                      icon={<ClearOutlined />}
                      disabled={selectedSceneIds.length === 0}
                      onClick={handleDisableGlassForSelectedItems}
                    >
                      取消毛玻璃
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

                  <div style={{ marginTop: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
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
                      <Select
                        size="small"
                        value={insertTextMode}
                        onChange={setInsertTextMode}
                        style={{ width: 92 }}
                      >
                        <Option value="fixed">固定</Option>
                        <Option value="weightedRandom">随机权重</Option>
                      </Select>
                      {insertTextMode === 'fixed' && (
                        <Input
                          size="small"
                          placeholder="输入要插入的文本"
                          value={insertTextValue}
                          onChange={(e) => setInsertTextValue(e.target.value)}
                          style={{ flex: 1 }}
                        />
                      )}
                      <Button
                        size="small"
                        disabled={!canInsertText}
                        onClick={handleBatchInsertTextToItem}
                        style={{
                          backgroundColor: canInsertText ? '#fa8c16' : '#fff',
                          color: canInsertText ? '#fff' : '#000',
                          borderColor: canInsertText ? '#fa8c16' : 'var(--brand-border)',
                        }}
                      >
                        插入文本
                      </Button>
                    </div>
                    {insertTextMode === 'weightedRandom' && (
                      <Input.TextArea
                        size="small"
                        placeholder={'每行一个：文本 | 权重\n例如：哈哈 | 3\n例如：不错 | 1'}
                        value={insertTextWeightedOptions}
                        onChange={(e) => setInsertTextWeightedOptions(e.target.value)}
                        autoSize={{ minRows: 2, maxRows: 5 }}
                        style={{ marginTop: 4 }}
                      />
                    )}
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
                    icon={<ClearOutlined />}
                    disabled={selectedSceneIds.length === 0}
                    onClick={handleRemoveLineBreakTags}
                    style={{
                      backgroundColor: selectedSceneIds.length > 0 ? '#fa8c16' : '#fff',
                      color: selectedSceneIds.length > 0 ? '#fff' : '#000',
                      borderColor: selectedSceneIds.length > 0 ? '#fa8c16' : '#d9d9d9',
                    }}
                  >
                    去除 [\n]
                  </Button>
                  <Button
                    block
                    icon={<ClearOutlined />}
                    disabled={selectedSceneIds.length === 0}
                    onClick={handleRemoveFirstLineBreakTag}
                    style={{
                      backgroundColor: selectedSceneIds.length > 0 ? '#fa8c16' : '#fff',
                      color: selectedSceneIds.length > 0 ? '#fff' : '#000',
                      borderColor: selectedSceneIds.length > 0 ? '#fa8c16' : '#d9d9d9',
                    }}
                  >
                    去除第一个 [\n]
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
