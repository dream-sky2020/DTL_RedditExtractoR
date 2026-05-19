import { useCallback } from 'react';
import { useVideoStore, useSettingsStore } from '@/store';
import { normalizeVideoConfig } from '@/rendering/videoCanvas';
import { interpolateColor } from '@/utils/color/interpolateColor';

export const useDslSceneBgColorReplace = () => {
  const { videoConfig, setVideoConfig } = useVideoStore();
  const { 
    sceneBackgroundColor, 
    sceneBackgroundColorEnd, 
    sceneBackgroundGradientMode 
  } = useSettingsStore();

  const applySceneBgColorReplace = useCallback((overrides?: string | {
    color?: string;
    colorEnd?: string;
    gradientMode?: boolean;
  }) => {
    const sColor = typeof overrides === 'string' ? overrides : (overrides?.color ?? sceneBackgroundColor);
    const sColorEnd = typeof overrides === 'string' ? sceneBackgroundColorEnd : (overrides?.colorEnd ?? sceneBackgroundColorEnd);
    const sMode = typeof overrides === 'string' ? sceneBackgroundGradientMode : (overrides?.gradientMode ?? sceneBackgroundGradientMode);

    const total = videoConfig.scenes.length;
    const nextScenes = videoConfig.scenes.map((scene, index) => {
      const factor = total > 1 ? index / (total - 1) : 0;
      const currentBg = sMode ? interpolateColor(sColor, sColorEnd, factor) : sColor;
      return { ...scene, backgroundColor: currentBg };
    });

    setVideoConfig(normalizeVideoConfig({
      ...videoConfig,
      scenes: nextScenes,
      sceneBackgroundColor: sColor
    }));
  }, [videoConfig, setVideoConfig, sceneBackgroundColor, sceneBackgroundColorEnd, sceneBackgroundGradientMode]);

  return { applySceneBgColorReplace };
};
