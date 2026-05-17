import { useCallback } from 'react';
import { useVideoStore } from '@/store';

export const useDslItemBgColorReplace = () => {
  const { videoConfig, setVideoConfig } = useVideoStore();

  const applyItemBgColorReplace = useCallback((color: string) => {
    const nextScenes = videoConfig.scenes.map(scene => ({
      ...scene,
      items: scene.items.map(item => ({
        ...item,
        backgroundColor: color
      }))
    }));
    
    setVideoConfig({
      ...videoConfig,
      scenes: nextScenes
    });
  }, [videoConfig, setVideoConfig]);

  return { applyItemBgColorReplace };
};
