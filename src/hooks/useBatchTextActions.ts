import { VideoConfig } from '../types';
import { toast } from '@components/Toast';
import { parseWeightedInsertTextOptions, pickWeightedInsertText } from './multiSelectUtils';

export type InsertTextMode = 'fixed' | 'weightedRandom';

interface UseBatchTextActionsProps {
  selectedSceneIds: string[];
  draftConfig: VideoConfig;
  setDraftConfig: (config: VideoConfig) => void;
  insertTextItemIndex: number;
  insertTextMode: InsertTextMode;
  insertTextValue: string;
  insertTextWeightedOptions: string;
  animationItemIndex: number;
  animationKeyframes: string;
}

export const useBatchTextActions = ({
  selectedSceneIds,
  draftConfig,
  setDraftConfig,
  insertTextItemIndex,
  insertTextMode,
  insertTextValue,
  insertTextWeightedOptions,
  animationItemIndex,
  animationKeyframes,
}: UseBatchTextActionsProps) => {
  const handleClearQuotes = () => {
    if (selectedSceneIds.length === 0) return;

    const newScenes = draftConfig.scenes.map(scene => {
      if (!selectedSceneIds.includes(scene.id)) return scene;

      const newItems = scene.items.map(item => {
        let newContent = item.content;
        const innermostQuoteRegex = /\[#quote=[^#]*?#\]((?:(?!\[#quote=)[\s\S])*?)\[\/#quote#\]/g;
        let prevContent;
        do {
          prevContent = newContent;
          newContent = newContent.replace(innermostQuoteRegex, '');
        } while (newContent !== prevContent);

        newContent = newContent.replace(/\[#\\n#\]\s*(?=\[#\\n#\]|\[#style)/g, '');
        newContent = newContent.replace(/^\[#\\n#\]+/, '').replace(/\[#\\n#\]+$/, '');

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
        const newContent = item.content.replace(/\[#\\n#\]|\r?\n/g, '');
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
        const newContent = item.content.replace(/\[#\\n#\]|\r?\n/, '');
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
        targetIdx = insertTextItemIndex - 1;
      } else if (insertTextItemIndex < 0) {
        targetIdx = items.length + insertTextItemIndex;
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

  const canInsertText = !!(selectedSceneIds.length > 0
    && (insertTextMode === 'weightedRandom' ? insertTextWeightedOptions.trim() : insertTextValue));

  return {
    handleClearQuotes,
    handleRemoveLineBreakTags,
    handleRemoveFirstLineBreakTag,
    handleBatchInsertTextToItem,
    handleBatchItemKeyframesChange,
    canInsertText,
  };
};
