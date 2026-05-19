import { useCallback } from 'react';
import { useVideoStore, useSettingsStore } from '@/store';
import { normalizeVideoConfig } from '@/rendering/videoCanvas';
import { interpolateColor } from '@/utils/color/interpolateColor';

export const useDslItemBgColorReplace = () => {
  const { videoConfig, setVideoConfig } = useVideoStore();
  const { 
    itemBackgroundColor, 
    itemBackgroundColorEnd, 
    itemBackgroundGradientMode 
  } = useSettingsStore();

  const applyItemBgColorReplace = useCallback((overrides?: string | {
    color?: string;
    colorEnd?: string;
    gradientMode?: boolean;
  }) => {
    const iColor = typeof overrides === 'string' ? overrides : (overrides?.color ?? itemBackgroundColor);
    const iColorEnd = typeof overrides === 'string' ? itemBackgroundColorEnd : (overrides?.colorEnd ?? itemBackgroundColorEnd);
    const iMode = typeof overrides === 'string' ? itemBackgroundGradientMode : (overrides?.gradientMode ?? itemBackgroundGradientMode);

    const total = videoConfig.scenes.length;
    const nextScenes = videoConfig.scenes.map((scene, index) => {
      const factor = total > 1 ? index / (total - 1) : 0;
      const currentBg = iMode ? interpolateColor(iColor, iColorEnd, factor) : iColor;
      return {
        ...scene,
        items: scene.items.map(item => ({ ...item, backgroundColor: currentBg }))
      };
    });

    setVideoConfig(normalizeVideoConfig({
      ...videoConfig,
      scenes: nextScenes,
      itemBackgroundColor: iColor
    }));
  }, [videoConfig, setVideoConfig, itemBackgroundColor, itemBackgroundColorEnd, itemBackgroundGradientMode]);

  return { applyItemBgColorReplace };
};
