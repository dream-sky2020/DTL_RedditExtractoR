import React from 'react';
import { registerRoot, Composition } from 'remotion';
import { MyVideo } from './MyVideo';
import { VideoConfig } from '../types';

registerRoot(() => {
  return (
    <>
      <Composition
        id="MyVideo"
        component={MyVideo as React.FC<any>}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{
          title: 'Reddit Video',
          subreddit: 'interestingasfuck',
          scenes: [],
        } as VideoConfig}
        calculateMetadata={({ props }) => {
          const fps = 30;
          const config = props as unknown as VideoConfig;
          const totalDurationInSeconds = config.scenes?.reduce((acc, scene) => acc + (scene.duration || 0), 0) || 5;
          return {
            durationInFrames: Math.max(1, Math.round(totalDurationInSeconds * fps)),
          };
        }}
      />
    </>
  );
});
