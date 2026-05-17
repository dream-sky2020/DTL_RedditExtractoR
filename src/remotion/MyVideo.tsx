import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { VideoConfig, VideoScene } from '../types';
import { SceneAudioMixer } from '../audio/SceneAudioMixer';
import { BackgroundVideoTrack } from './BackgroundVideoTrack';
import { SceneRenderer } from './SceneRenderer';

export interface MyVideoProps extends VideoConfig {
  focusedSceneId?: string; // 可选：只渲染特定画面格用于预览
  disableAudio?: boolean;
  disableSceneAudio?: boolean;
}

export const MyVideo: React.FC<MyVideoProps> = (props) => {
  const { scenes = [] } = props;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const shouldRenderBackgroundVideo = props.renderMode === 'final' && Boolean(props.backgroundVideo?.enabled);
  const shouldDisableSceneAudio = props.disableSceneAudio ?? props.disableAudio;

  // 计算每个分段的起止帧
  let currentStartFrame = 0;
  const sceneFrames = scenes.map((scene) => {
    const start = currentStartFrame;
    const end = start + scene.duration * fps;
    currentStartFrame = end;
    return { start, end, ...scene };
  });

  // 如果提供了 focusedSceneId，则只渲染该画面格（从第 0 帧开始）
  let activeScene: (VideoScene & { start: number; end: number }) | undefined;
  let relativeFrame: number;

  if (props.focusedSceneId) {
    activeScene = sceneFrames.find(s => s.id === props.focusedSceneId);
    relativeFrame = frame;
  } else {
    activeScene = sceneFrames.find(
      (s) => frame >= s.start && frame < s.end
    );
    relativeFrame = frame - (activeScene?.start || 0);
  }

  if (!activeScene) {
    return (
      <AbsoluteFill style={{ backgroundColor: '#000' }}>
        {shouldRenderBackgroundVideo && (
          <BackgroundVideoTrack
            backgroundVideo={props.backgroundVideo}
            fps={fps}
            frame={frame}
          />
        )}
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill>
      {shouldRenderBackgroundVideo && (
        <BackgroundVideoTrack
          backgroundVideo={props.backgroundVideo}
          fps={fps}
          frame={frame}
        />
      )}
      {!shouldDisableSceneAudio && (
        <SceneAudioMixer
          scenes={scenes}
          fps={fps}
          focusedSceneId={props.focusedSceneId}
        />
      )}
      <SceneRenderer
        scene={activeScene}
        frame={relativeFrame}
        fps={fps}
        config={props}
      />
    </AbsoluteFill>
  );
};
