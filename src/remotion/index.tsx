import React from 'react';
import { registerRoot, Composition } from 'remotion';
import { MyVideo } from './MyVideo';
import { VideoConfig } from '../types';
import { createDefaultVideoCanvasConfig, getActiveVideoCanvasSize, normalizeVideoConfig } from '../utils/videoCanvas';

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
          const totalDurationInSeconds = config.scenes?.reduce((acc, scene) => acc + (scene.duration || 0), 0) || 5;
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
