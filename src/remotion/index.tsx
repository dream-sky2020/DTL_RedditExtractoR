import React from 'react';
import { registerRoot, Composition } from 'remotion';
import { MyVideo } from './MyVideo';
import { VideoConfig } from '../types';
import { createDefaultVideoCanvasConfig, getActiveVideoCanvasSize, normalizeVideoConfig } from '../rendering/videoCanvas';

const getDslDurationInSeconds = (config: VideoConfig): number =>
  config.scenes?.reduce((acc, scene) => acc + (scene.duration || 0), 0) || 5;

const getBackgroundDurationInSeconds = (config: VideoConfig): number => {
  const background = config.backgroundVideo;
  if (!background?.enabled || !background.src || !background.durationInSeconds) {
    return 0;
  }

  const playbackRate = background.playbackRate && background.playbackRate > 0 ? background.playbackRate : 1;
  const baseDuration = Math.max(0, background.durationInSeconds - (background.startOffset || 0)) / playbackRate;
  const repeatCount = background.playbackMode === 'repeat-count'
    ? Math.max(1, Math.floor(background.repeatCount || 1))
    : 1;
  return baseDuration * repeatCount;
};

const getTotalDurationInSeconds = (config: VideoConfig): number => {
  const dslDuration = getDslDurationInSeconds(config);
  if (config.renderMode !== 'final' || config.backgroundVideo?.timelineMode !== 'wait-for-background') {
    return dslDuration;
  }
  return Math.max(dslDuration, getBackgroundDurationInSeconds(config) || dslDuration);
};

registerRoot(() => {
  return (
    <>
      <Composition
        id="MyVideo"
        component={MyVideo as React.FC<any>}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: 'Reddit Video',
          subreddit: 'interestingasfuck',
          scenes: [],
          canvas: createDefaultVideoCanvasConfig(),
        } as VideoConfig}
        calculateMetadata={({ props }) => {
          const fps = 30;
          const config = normalizeVideoConfig(props as unknown as VideoConfig);
          const activeCanvas = getActiveVideoCanvasSize(config);
          const totalDurationInSeconds = getTotalDurationInSeconds(config);
          return {
            durationInFrames: Math.max(1, Math.round(totalDurationInSeconds * fps)),
            width: activeCanvas.width,
            height: activeCanvas.height,
          };
        }}
      />
    </>
  );
});
