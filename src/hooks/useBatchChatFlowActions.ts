import { VideoConfig } from '../types';
import { toast } from '@components/Toast';

interface UseBatchChatFlowActionsProps {
  selectedSceneIds: string[];
  draftConfig: VideoConfig;
  setDraftConfig: (config: VideoConfig) => void;
  historyLimit: number;
}

export const useBatchChatFlowActions = ({
  selectedSceneIds,
  draftConfig,
  setDraftConfig,
  historyLimit,
}: UseBatchChatFlowActionsProps) => {
  const handleChatFlow = (direction: 'top' | 'bottom') => {
    if (selectedSceneIds.length === 0) return;

    const selectedScenes = draftConfig.scenes.filter(s => selectedSceneIds.includes(s.id));
    const messageBlocks = selectedScenes.map(s => s.items);

    const newScenes = draftConfig.scenes.map(scene => {
      const selectedIdx = selectedScenes.findIndex(s => s.id === scene.id);
      if (selectedIdx === -1) return scene;

      const startIdx = Math.max(0, selectedIdx - historyLimit + 1);
      const blocksToShow = messageBlocks.slice(startIdx, selectedIdx + 1);

      let finalItems: any[] = [];
      if (direction === 'top') {
        for (let i = blocksToShow.length - 1; i >= 0; i--) {
          finalItems = [...finalItems, ...blocksToShow[i]];
        }
      } else {
        for (let i = 0; i < blocksToShow.length; i++) {
          finalItems = [...finalItems, ...blocksToShow[i]];
        }
      }

      return { ...scene, items: finalItems };
    });

    setDraftConfig({ ...draftConfig, scenes: newScenes });
    toast.success(`聊天流处理完成（${direction === 'top' ? '最新在上' : '最新在下'}，K=${historyLimit}）`);
  };

  return {
    handleChatFlow,
  };
};
