import { useVideoStore } from '@/store';

/**
 * 场景排序逻辑 Hook
 * 仅负责处理场景在列表中的顺序调整
 */
export const useSceneReorder = () => {
  const { videoConfig, setVideoConfig } = useVideoStore();

  /**
   * 调整场景顺序
   * @param startIndex 起始索引
   * @param endIndex 目标索引
   */
  const reorderScenes = (startIndex: number, endIndex: number) => {
    const newScenes = [...videoConfig.scenes];
    const [moved] = newScenes.splice(startIndex, 1);
    newScenes.splice(endIndex, 0, moved);
    setVideoConfig({ ...videoConfig, scenes: newScenes });
  };

  /**
   * 将选中的场景移动到最前
   */
  const moveSelectedToStart = (selectedIds: string[]) => {
    if (selectedIds.length === 0) return;
    const scenes = [...videoConfig.scenes];
    const selected = scenes.filter(s => selectedIds.includes(s.id));
    const remaining = scenes.filter(s => !selectedIds.includes(s.id));
    setVideoConfig({ ...videoConfig, scenes: [...selected, ...remaining] });
  };

  /**
   * 将选中的场景移动到最后
   */
  const moveSelectedToEnd = (selectedIds: string[]) => {
    if (selectedIds.length === 0) return;
    const scenes = [...videoConfig.scenes];
    const selected = scenes.filter(s => selectedIds.includes(s.id));
    const remaining = scenes.filter(s => !selectedIds.includes(s.id));
    setVideoConfig({ ...videoConfig, scenes: [...remaining, ...selected] });
  };

  /**
   * 将选中的场景移动到指定位置
   * @param selectedIds 选中的场景 ID 列表
   * @param targetIndex 目标参考位置的索引
   * @param position 'before' | 'after'
   */
  const moveSelectedToIndex = (selectedIds: string[], targetIndex: number, position: 'before' | 'after') => {
    if (selectedIds.length === 0 || targetIndex < 0 || targetIndex >= videoConfig.scenes.length) return;
    
    const scenes = [...videoConfig.scenes];
    const targetSceneId = scenes[targetIndex].id;
    
    // 如果目标场景也在选中列表中，且移动后逻辑复杂，简单处理：先移除所有选中的，再在目标位置插入
    const selected = scenes.filter(s => selectedIds.includes(s.id));
    const remaining = scenes.filter(s => !selectedIds.includes(s.id));
    
    let insertIndex = remaining.findIndex(s => s.id === targetSceneId);
    if (insertIndex === -1) {
      // 如果目标场景被移除了（即它本身在选中列表中），我们需要决定插入点
      // 这里采用简单策略：如果目标场景在选中中，则按原索引插入
      insertIndex = targetIndex;
    } else if (position === 'after') {
      insertIndex += 1;
    }
    
    remaining.splice(insertIndex, 0, ...selected);
    setVideoConfig({ ...videoConfig, scenes: remaining });
  };

  /**
   * 按属性自动排序
   * @param type 排序类型
   * @param selectedIds 可选，如果传入则仅在选中的场景间进行局部排序
   */
  const sortScenes = (type: 'duration' | 'textLength' | 'selectionOrder', selectedIds?: string[]) => {
    const allScenes = [...videoConfig.scenes];
    
    // 如果指定了局部排序
    if (selectedIds && selectedIds.length > 1) {
      // 1. 获取选中场景原本占据的索引位置（从小到大排序）
      const selectedIndices: number[] = [];
      allScenes.forEach((scene, index) => {
        if (selectedIds.includes(scene.id)) {
          selectedIndices.push(index);
        }
      });

      // 2. 准备参与排序的场景对象
      let selectedScenes: any[] = [];
      if (type === 'selectionOrder') {
        // 如果是按选择顺序排序，直接按 selectedIds 的顺序提取场景
        selectedScenes = selectedIds.map(id => allScenes.find(s => s.id === id)).filter(Boolean);
      } else {
        // 否则先按原位置提取，再进行属性排序
        selectedScenes = selectedIndices.map(index => allScenes[index]);
        if (type === 'duration') {
          selectedScenes.sort((a, b) => (a.duration || 0) - (b.duration || 0));
        } else if (type === 'textLength') {
          selectedScenes.sort((a, b) => {
            const textA = a.items.map((i: any) => i.content).join('').length;
            const textB = b.items.map((i: any) => i.content).join('').length;
            return textA - textB;
          });
        }
      }

      // 3. 将排序后的场景写回原位置
      const nextScenes = [...allScenes];
      selectedIndices.forEach((originalIndex, i) => {
        nextScenes[originalIndex] = selectedScenes[i];
      });

      setVideoConfig({ ...videoConfig, scenes: nextScenes });
      return;
    }

    // 默认逻辑：对所有场景进行全局排序（selectionOrder 在全局模式下无效）
    if (type === 'selectionOrder') return;

    if (type === 'duration') {
      allScenes.sort((a, b) => (a.duration || 0) - (b.duration || 0));
    } else if (type === 'textLength') {
      allScenes.sort((a, b) => {
        const textA = a.items.map(i => i.content).join('').length;
        const textB = b.items.map(i => i.content).join('').length;
        return textA - textB;
      });
    }
    setVideoConfig({ ...videoConfig, scenes: allScenes });
  };

  return {
    reorderScenes,
    moveSelectedToStart,
    moveSelectedToEnd,
    moveSelectedToIndex,
    sortScenes,
  };
};
