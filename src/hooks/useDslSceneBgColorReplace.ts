import { useCallback } from 'react';
import { useVideoStore } from '@/store';

export const useDslSceneBgColorReplace = () => {
  const { videoConfig, setVideoConfig } = useVideoStore();

  const applySceneBgColorReplace = useCallback((color: string) => {
    const nextScenes = videoConfig.scenes.map(scene => ({
      ...scene,
      backgroundColor: color
    }));
    
    setVideoConfig({
      ...videoConfig,
      scenes: nextScenes
    });
  }, [videoConfig, setVideoConfig]);

  return { applySceneBgColorReplace };
};
