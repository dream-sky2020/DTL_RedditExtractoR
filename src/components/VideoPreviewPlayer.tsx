import React from 'react';
import { Player } from '@remotion/player';
import { MyVideo, MyVideoProps } from '../remotion/MyVideo';
import { VideoConfig } from '../types';

export const DEFAULT_PREVIEW_FPS = 30;

export const getTotalFrames = (videoConfig: VideoConfig, fps: number = DEFAULT_PREVIEW_FPS): number => {
  const totalDurationInSeconds = videoConfig.scenes.reduce((acc, scene) => acc + scene.duration, 0);
  return Math.max(1, totalDurationInSeconds * fps);
};

export const getSceneStartFrame = (
  videoConfig: VideoConfig,
  sceneIndex: number,
  fps: number = DEFAULT_PREVIEW_FPS
): number => {
  let startFrame = 0;
  for (let i = 0; i < sceneIndex; i += 1) {
    startFrame += videoConfig.scenes[i]?.duration ? videoConfig.scenes[i].duration * fps : 0;
  }
  return startFrame;
};

interface VideoPreviewPlayerProps {
  videoConfig: VideoConfig;
  focusedSceneId?: string;
  durationInFrames?: number;
  compositionWidth?: number;
  compositionHeight?: number;
  fps?: number;
  initialFrame?: number;
  controls?: boolean;
  loop?: boolean;
  autoPlay?: boolean;
  style?: React.CSSProperties;
  playerKey?: string;
}

export const VideoPreviewPlayer: React.FC<VideoPreviewPlayerProps> = ({
  videoConfig,
  focusedSceneId,
  durationInFrames,
  compositionWidth = 1920,
  compositionHeight = 1080,
  fps = DEFAULT_PREVIEW_FPS,
  initialFrame,
  controls = true,
  loop = false,
  autoPlay = false,
  style,
  playerKey,
}) => {
  const resolvedDuration = durationInFrames ?? getTotalFrames(videoConfig, fps);
  const inputProps: MyVideoProps = focusedSceneId ? { ...videoConfig, focusedSceneId } : videoConfig;

  return (
    <Player
      component={MyVideo as React.FC<any>}
      durationInFrames={resolvedDuration}
      compositionWidth={compositionWidth}
      compositionHeight={compositionHeight}
      fps={fps}
      initialFrame={initialFrame}
      style={style}
      inputProps={inputProps}
      controls={controls}
      loop={loop}
      autoPlay={autoPlay}
      key={playerKey}
    />
  );
};
