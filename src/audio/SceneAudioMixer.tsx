import React, { useMemo } from 'react';
import { Audio, Sequence, staticFile } from 'remotion';
import { VideoScene } from '../types';
import { ParsedAudioTrack, parseSceneAudioTracks } from './audioDslParser';

export interface SceneAudioMixerProps {
  scenes: VideoScene[];
  fps: number;
  focusedSceneId?: string;
}

const createVolumeCurve = (
  track: ParsedAudioTrack,
  durationInFrames: number,
  fps: number
) => {
  const fadeOutFrames = Math.min(durationInFrames, Math.round(track.fadeOutSeconds * fps));
  if (fadeOutFrames <= 0) return track.volume;

  const fadeStartFrame = durationInFrames - fadeOutFrames;
  const endVolume = track.volume * track.fadeOutEndVolume;
  const fadeFrameSpan = Math.max(1, fadeOutFrames - 1);

  return (frame: number) => {
    if (frame < fadeStartFrame) return track.volume;

    const progress = Math.max(0, Math.min(1, (frame - fadeStartFrame) / fadeFrameSpan));
    return track.volume + (endVolume - track.volume) * progress;
  };
};

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
      {tracks.map((track) => {
        const durationInFrames = Math.max(1, Math.ceil(track.durationSeconds * fps));
        return (
          <Sequence
            key={track.id}
            from={Math.floor(track.startSeconds * fps)}
            durationInFrames={durationInFrames}
          >
            <Audio
              src={staticFile(`audio/shortAudio/Unassigned/${track.src}`)}
              loop={track.loop}
              volume={createVolumeCurve(track, durationInFrames, fps)}
            />
          </Sequence>
        );
      })}
    </>
  );
};

