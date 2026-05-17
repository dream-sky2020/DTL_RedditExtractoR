import { VideoConfig } from '../types';
import { toast } from '@components/Toast';

interface UseBatchLayoutActionsProps {
  selectedSceneIds: string[];
  draftConfig: VideoConfig;
  setDraftConfig: (config: VideoConfig) => void;
  batchSceneDuration: number;
  batchItemSpacing: number;
  offsetX: number;
  offsetY: number;
  stickyItemIndex: number;
  stickyValue: number | boolean;
}

export const useBatchLayoutActions = ({
  selectedSceneIds,
  draftConfig,
  setDraftConfig,
  batchSceneDuration,
  batchItemSpacing,
  offsetX,
  offsetY,
  stickyItemIndex,
  stickyValue,
}: UseBatchLayoutActionsProps) => {
  const handleBatchLayoutChange = (layout: 'top' | 'center' | 'bottom') => {
    const isAll = selectedSceneIds.length === 0;
    const targetIds = isAll ? draftConfig.scenes.map(s => s.id) : selectedSceneIds;

    const newScenes = draftConfig.scenes.map(scene => {
      if (!targetIds.includes(scene.id)) return scene;
      return { ...scene, layout };
    });

    setDraftConfig({ ...draftConfig, scenes: newScenes });
    toast.success(isAll ? `已将全部场景的布局改为 ${layout}` : `已将 ${selectedSceneIds.length} 个场景的布局改为 ${layout}`);
  };

  const handleBatchItemSpacingChange = () => {
    const isAll = selectedSceneIds.length === 0;
    const targetIds = isAll ? draftConfig.scenes.map(s => s.id) : selectedSceneIds;

    const newScenes = draftConfig.scenes.map(scene => {
      if (!targetIds.includes(scene.id)) return scene;
      return { ...scene, itemSpacing: batchItemSpacing };
    });

    setDraftConfig({ ...draftConfig, scenes: newScenes });
    toast.success(isAll ? `已将全部场景的项目间距改为 ${batchItemSpacing}` : `已将 ${selectedSceneIds.length} 个场景的项目间距改为 ${batchItemSpacing}`);
  };

  const handleBatchSceneDurationChange = () => {
    if (!Number.isFinite(batchSceneDuration) || batchSceneDuration <= 0) {
      toast.warning('请输入大于 0 的场景时长');
      return;
    }

    const isAll = selectedSceneIds.length === 0;
    const targetIds = isAll ? draftConfig.scenes.map(s => s.id) : selectedSceneIds;

    const newScenes = draftConfig.scenes.map(scene => {
      if (!targetIds.includes(scene.id)) return scene;
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
    toast.success(isAll ? `已将全部场景的时长改为 ${batchSceneDuration}s` : `已将 ${selectedSceneIds.length} 个场景的时长和 item exitAt 改为 ${batchSceneDuration}s`);
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
      items.forEach(item => { delete item.sticky; });

      let targetIdx = -1;
      if (stickyItemIndex > 0) {
        targetIdx = stickyItemIndex - 1;
      } else if (stickyItemIndex < 0) {
        targetIdx = items.length + stickyItemIndex;
      }

      if (targetIdx >= 0 && targetIdx < items.length) {
        items[targetIdx] = { ...items[targetIdx], sticky: stickyValue };
      }

      return { ...scene, items };
    });

    setDraftConfig({ ...draftConfig, scenes: newScenes });
    toast.success(`已更新 ${selectedSceneIds.length} 个场景的强制居中设置`);
  };

  return {
    handleBatchLayoutChange,
    handleBatchItemSpacingChange,
    handleBatchSceneDurationChange,
    handleBatchOffsetChange,
    handleBatchStickyChange,
  };
};
