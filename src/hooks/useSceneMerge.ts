import { useVideoStore } from '@/store';
import { mergeSelectedScenes } from '../utils/sceneMergeEngine';
import { dialogs } from '@components/Dialogs';
import { toast } from '@components/Toast';

interface UseSceneMergeProps {
  selectedSceneIds?: string[];
  setSelectedSceneIds?: (ids: string[]) => void;
}

/**
 * 场景合并逻辑 Hook
 * 集中管理场景合并逻辑，支持自动尝试智能合并和强制追加合并
 */
export const useSceneMerge = (props?: UseSceneMergeProps) => {
  const { videoConfig, setVideoConfig } = useVideoStore();
  const { selectedSceneIds = [], setSelectedSceneIds } = props || {};

  /**
   * 执行合并操作
   * @param targetIds 要合并的场景 ID 列表
   * @param options 合并选项
   */
  const mergeScenes = (
    targetIds: string[],
    options: {
      primarySceneId?: string;
      interactive?: boolean;
      onSuccess?: () => void;
    } = {}
  ) => {
    const { primarySceneId, interactive = true, onSuccess } = options;

    if (targetIds.length < 2) {
      toast.warning('至少需要选择 2 个画面格才能合并');
      return;
    }

    // 1. 优先尝试智能合并
    const result = mergeSelectedScenes({
      scenes: videoConfig.scenes,
      selectedSceneIds: targetIds,
      primarySceneId,
      strategy: 'auto',
    });

    if (result.ok) {
      setVideoConfig({ ...videoConfig, scenes: result.scenes });
      if (setSelectedSceneIds) setSelectedSceneIds([]);
      toast.success(result.message || '合并成功');
      onSuccess?.();
      return;
    }

    // 2. 智能合并未命中，处理强制合并逻辑
    const executeForceMerge = () => {
      const forceResult = mergeSelectedScenes({
        scenes: videoConfig.scenes,
        selectedSceneIds: targetIds,
        primarySceneId,
        strategy: 'force-append-merge',
      });

      if (forceResult.ok) {
        setVideoConfig({ ...videoConfig, scenes: forceResult.scenes });
        if (setSelectedSceneIds) setSelectedSceneIds([]);
        toast.success(forceResult.message || '合并成功');
        onSuccess?.();
      } else {
        toast.error(forceResult.message || '合并失败');
      }
    };

    if (interactive) {
      // 交互模式：显示确认弹窗
      dialogs.confirm({
        title: '自动合并未命中',
        content: '选中的画面格不符合自动合并规则（如引用关系等），是否要强制将它们合并（内容直接追加到主场景末尾）？',
        okText: '强制合并',
        onOk: executeForceMerge,
      });
    } else {
      // 非交互模式：直接执行强制合并（常用于拖拽合并）
      executeForceMerge();
    }
  };

  return {
    mergeScenes,
  };
};
