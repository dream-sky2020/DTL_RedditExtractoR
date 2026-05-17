import { VideoConfig, VideoScene } from '../types';
import { toast } from '@components/Toast';
import { dialogs } from '@components/Dialogs';
import { sceneToDsl, parseSceneDsl } from '../rendering/sceneDsl';
import { createUniqueRandomId } from './multiSelectUtils';

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
  const handleApplySplit = (dslWithSplits: string) => {
    const sourceSceneIndex = draftConfig.scenes.findIndex(scene => scene.id === selectedSceneIds[0]);
    if (sourceSceneIndex === -1) return;

    const sourceScene = draftConfig.scenes[sourceSceneIndex];

    const splitMarker = `__SPLIT_${Math.random().toString(36).slice(2, 9)}__`;
    const dslForParsing = dslWithSplits.replace(/\[split\]/g, splitMarker);

    const parseResult = parseSceneDsl(dslForParsing, sourceScene);
    if (!parseResult.ok) {
      toast.error(`解析失败: ${parseResult.error}`);
      return;
    }

    const parsedScene = parseResult.scene;

    let maxParts = 1;
    const itemPartsMap = parsedScene.items.map(item => {
      if (!item.content.includes(splitMarker)) return [item.content];

      const textTagRegex = /^([\s\S]*?<#text#>)([\s\S]*?)(<\/#text#>[\s\S]*)$/;
      const match = item.content.match(textTagRegex);

      if (match) {
        const [_, prefix, innerContent, suffix] = match;
        const segments = innerContent.split(splitMarker);
        if (segments.length > maxParts) maxParts = segments.length;
        return segments.map(seg => `${prefix}${seg}${suffix}`);
      } else {
        const segments = item.content.split(splitMarker);
        if (segments.length > maxParts) maxParts = segments.length;
        return segments;
      }
    });

    if (maxParts <= 1) {
      toast.warning('未检测到有效的 [split] 标记');
      return;
    }

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
          content: itemPartsMap[itemIdx][i] ?? itemPartsMap[itemIdx][itemPartsMap[itemIdx].length - 1]
        }))
      };
      newGeneratedScenes.push(newScene);
    }

    const newScenes = [...draftConfig.scenes];
    newScenes.splice(sourceSceneIndex, 1, ...newGeneratedScenes);

    setDraftConfig({ ...draftConfig, scenes: newScenes });
    setSelectedSceneIds(newGeneratedScenes.map(s => s.id));
    toast.success(`已成功裁剪并生成 ${newGeneratedScenes.length} 个新画面格`);
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
