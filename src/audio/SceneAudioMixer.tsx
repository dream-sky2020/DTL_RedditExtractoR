import React, { useMemo } from 'react';
import { Audio, Sequence, staticFile } from 'remotion';
import { VideoScene } from '../types';
import { parseSceneAudioTracks } from './audioDslParser';

export interface SceneAudioMixerProps {
  scenes: VideoScene[];
  fps: number;
  focusedSceneId?: string;
}

export const SceneAudioMixer: React.FC<SceneAudioMixerProps> = ({
  scenes,
  fps,
  focusedSceneId,
}) => {
  const tracks = useMemo(
    () => parseSceneAudioTracks(scenes, focusedSceneId),
    [scenes, focusedSceneId]
  );

  return (
    <>
      {tracks.map((track) => (
        <Sequence
          key={track.id}
          from={Math.floor(track.startSeconds * fps)}
          durationInFrames={Math.max(1, Math.ceil(track.durationSeconds * fps))}
        >
          <Audio
            src={staticFile(`audio/shortAudio/Unassigned/${track.src}`)}
            volume={track.volume}
          />
        </Sequence>
      ))}
    </>
  );
};

