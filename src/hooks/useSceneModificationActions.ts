import { VideoConfig, VideoScene } from '../types';
import { toast } from '@components/Toast';
import { dialogs } from '@components/Dialogs';
import { sceneToDsl } from '../rendering/sceneDsl';
import { createUniqueRandomId } from './multiSelectUtils';
import { applySplit } from '../utils/split/applySplit';

interface UseSceneModificationActionsProps {
  selectedSceneIds: string[];
  setSelectedSceneIds: (ids: string[]) => void;
  draftConfig: VideoConfig;
  setDraftConfig: (config: VideoConfig) => void;
}

export const useSceneModificationActions = ({
  selectedSceneIds,
  setSelectedSceneIds,
  draftConfig,
  setDraftConfig,
}: UseSceneModificationActionsProps) => {
  const handleOpenSplitModal = () => {
    if (selectedSceneIds.length !== 1) {
      toast.warning('请选择 1 个画面格后再进行裁剪');
      return;
    }
    const scene = draftConfig.scenes.find(s => s.id === selectedSceneIds[0]);
    if (!scene) return;

    dialogs.showSplitHelper({
      initialValue: sceneToDsl(scene),
      onOk: (dslWithSplits) => applySplit(
        dslWithSplits,
        draftConfig,
        selectedSceneIds,
        setDraftConfig,
        setSelectedSceneIds
      )
    });
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

  return {
    handleOpenSplitModal,
    handleDuplicateSelectedScene,
  };
};
