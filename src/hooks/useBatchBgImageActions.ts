import { VideoConfig } from '../types';
import { toast } from '@components/Toast';

interface UseBatchBgImageActionsProps {
  selectedSceneIds: string[];
  draftConfig: VideoConfig;
  setDraftConfig: (config: VideoConfig) => void;
  batchBgImage: string;
  batchItemBgImage: string;
}

export const useBatchBgImageActions = ({
  selectedSceneIds,
  draftConfig,
  setDraftConfig,
  batchBgImage,
  batchItemBgImage,
}: UseBatchBgImageActionsProps) => {
  const handleBatchBgImageChange = () => {
    if (selectedSceneIds.length === 0) {
      toast.warning('请先选择画面格');
      return;
    }

    const newScenes = draftConfig.scenes.map(scene => {
      if (!selectedSceneIds.includes(scene.id)) return scene;
      return { ...scene, backgroundImage: batchBgImage };
    });

    setDraftConfig({ ...draftConfig, scenes: newScenes });
    toast.success(`已为 ${selectedSceneIds.length} 个场景设置背景图片`);
  };

  const handleBatchItemBgImageChange = () => {
    if (selectedSceneIds.length === 0) {
      toast.warning('请先选择画面格');
      return;
    }

    const newScenes = draftConfig.scenes.map(scene => {
      if (!selectedSceneIds.includes(scene.id)) return scene;
      
      const newItems = scene.items.map(item => ({
        ...item,
        backgroundImage: batchItemBgImage
      }));
      
      return { ...scene, items: newItems };
    });

    setDraftConfig({ ...draftConfig, scenes: newScenes });
    toast.success(`已为 ${selectedSceneIds.length} 个场景的所有项目设置背景图片`);
  };

  const handleClearBatchBgImage = () => {
    if (selectedSceneIds.length === 0) {
      toast.warning('请先选择画面格');
      return;
    }

    const newScenes = draftConfig.scenes.map(scene => {
      if (!selectedSceneIds.includes(scene.id)) return scene;
      const { backgroundImage: _, ...rest } = scene;
      return rest;
    });

    setDraftConfig({ ...draftConfig, scenes: newScenes });
    toast.success(`已清空 ${selectedSceneIds.length} 个场景的背景图片`);
  };

  const handleClearBatchItemBgImage = () => {
    if (selectedSceneIds.length === 0) {
      toast.warning('请先选择画面格');
      return;
    }

    const newScenes = draftConfig.scenes.map(scene => {
      if (!selectedSceneIds.includes(scene.id)) return scene;
      
      const newItems = scene.items.map(item => {
        const { backgroundImage: _, ...rest } = item;
        return rest;
      });
      
      return { ...scene, items: newItems };
    });

    setDraftConfig({ ...draftConfig, scenes: newScenes });
    toast.success(`已清空 ${selectedSceneIds.length} 个场景的所有项目背景图片`);
  };

  return {
    handleBatchBgImageChange,
    handleBatchItemBgImageChange,
    handleClearBatchBgImage,
    handleClearBatchItemBgImage,
  };
};
