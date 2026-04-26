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
   */
  const sortScenes = (type: 'duration' | 'textLength') => {
    const newScenes = [...videoConfig.scenes];
    if (type === 'duration') {
      newScenes.sort((a, b) => (a.duration || 0) - (b.duration || 0));
    } else if (type === 'textLength') {
      newScenes.sort((a, b) => {
        const textA = a.items.map(i => i.content).join('').length;
        const textB = b.items.map(i => i.content).join('').length;
        return textA - textB;
      });
    }
    setVideoConfig({ ...videoConfig, scenes: newScenes });
  };

  return {
    reorderScenes,
    moveSelectedToStart,
    moveSelectedToEnd,
    moveSelectedToIndex,
    sortScenes,
  };
};
