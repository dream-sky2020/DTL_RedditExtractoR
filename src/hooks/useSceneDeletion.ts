import { dialogs } from '@components/Dialogs';
import { toast } from '@components/Toast';
import { useVideoStore } from '@/store';

interface UseSceneDeletionProps {
  selectedSceneIds: string[];
  setSelectedSceneIds: (ids: string[]) => void;
}

/**
 * 场景删除逻辑 Hook
 * 集中管理单个场景删除和批量场景删除的逻辑
 */
export const useSceneDeletion = ({
  selectedSceneIds,
  setSelectedSceneIds,
}: UseSceneDeletionProps) => {
  const { videoConfig, setVideoConfig } = useVideoStore();

  /**
   * 删除单个场景
   * @param id 场景 ID
   */
  const removeScene = (id: string) => {
    dialogs.confirm({
      title: '确认删除画面格',
      content: '确认删除该画面格吗？此操作不可撤销。',
      okText: '确认删除',
      okType: 'danger',
      onOk: () => {
        const newScenes = videoConfig.scenes.filter((s) => s.id !== id);
        setVideoConfig({ ...videoConfig, scenes: newScenes });
        // 如果删除的是已选中的，也需要从选中列表中移除
        if (selectedSceneIds.includes(id)) {
          setSelectedSceneIds(selectedSceneIds.filter(sid => sid !== id));
        }
        toast.success('已删除画面格');
      },
    });
  };

  /**
   * 批量删除选中的场景
   */
  const removeSelectedScenes = () => {
    if (selectedSceneIds.length === 0) {
      toast.warning('请先选择要删除的画面格');
      return;
    }

    dialogs.confirm({
      title: '确认批量删除',
      content: `确认删除选中的 ${selectedSceneIds.length} 个画面格吗？`,
      okText: '确认删除',
      okType: 'danger',
      onOk: () => {
        const newScenes = videoConfig.scenes.filter((s) => !selectedSceneIds.includes(s.id));
        setVideoConfig({ ...videoConfig, scenes: newScenes });
        setSelectedSceneIds([]);
        toast.success(`已删除 ${selectedSceneIds.length} 个画面格`);
      },
    });
  };

  return {
    removeScene,
    removeSelectedScenes,
  };
};
