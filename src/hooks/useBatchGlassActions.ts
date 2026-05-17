import { VideoConfig } from '../types';
import { toast } from '@components/Toast';

interface UseBatchGlassActionsProps {
  selectedSceneIds: string[];
  draftConfig: VideoConfig;
  setDraftConfig: (config: VideoConfig) => void;
  batchGlassBlur: number;
  batchGlassOpacity: number;
  batchGlassBorder: string;
  batchGlassShadow: string;
  batchGlassDistort: number;
  batchGlassAberration: number;
  batchGlassEdgeGlow: string;
  batchGlassFresnel: number;
  batchGlassGrain: number;
  batchGlassRefraction: number;
}

export const useBatchGlassActions = ({
  selectedSceneIds,
  draftConfig,
  setDraftConfig,
  batchGlassBlur,
  batchGlassOpacity,
  batchGlassBorder,
  batchGlassShadow,
  batchGlassDistort,
  batchGlassAberration,
  batchGlassEdgeGlow,
  batchGlassFresnel,
  batchGlassGrain,
  batchGlassRefraction,
}: UseBatchGlassActionsProps) => {
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
            glassBlur: batchGlassBlur,
            glassOpacity: batchGlassOpacity,
            glassBorderColor: batchGlassBorder,
            glassShadow: batchGlassShadow,
            glassDistort: batchGlassDistort,
            glassAberration: batchGlassAberration,
            glassEdgeGlow: batchGlassEdgeGlow,
            glassFresnel: batchGlassFresnel,
            glassGrain: batchGlassGrain,
            glassRefraction: batchGlassRefraction,
          };
        }),
      };
    });

    setDraftConfig({ ...draftConfig, scenes: newScenes });
    toast.success(`已将 ${affectedItemCount} 个 item 改为玻璃效果`);
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
            nextItem.glassBorderColor !== undefined ||
            nextItem.glassShadow !== undefined ||
            nextItem.glassDistort !== undefined ||
            nextItem.glassAberration !== undefined ||
            nextItem.glassEdgeGlow !== undefined ||
            nextItem.glassFresnel !== undefined ||
            nextItem.glassGrain !== undefined ||
            nextItem.glassRefraction !== undefined
          ) {
            affectedItemCount += 1;
          }
          delete nextItem.glass;
          delete nextItem.glassBlur;
          delete nextItem.glassOpacity;
          delete nextItem.glassBorderColor;
          delete nextItem.glassShadow;
          delete nextItem.glassDistort;
          delete nextItem.glassAberration;
          delete nextItem.glassEdgeGlow;
          delete nextItem.glassFresnel;
          delete nextItem.glassGrain;
          delete nextItem.glassRefraction;
          return nextItem;
        }),
      };
    });

    setDraftConfig({ ...draftConfig, scenes: newScenes });
    if (affectedItemCount > 0) {
      toast.success(`已取消 ${affectedItemCount} 个 item 的玻璃属性`);
      return;
    }
    toast.warning('选中的画面格中没有找到玻璃属性');
  };

  return {
    handleEnableGlassForSelectedItems,
    handleDisableGlassForSelectedItems,
  };
};
