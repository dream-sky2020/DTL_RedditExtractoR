import React from 'react';
import { AbsoluteFill, OffthreadVideo, Loop, Audio } from 'remotion';
import { BackgroundVideoConfig } from '../types';
import { useBackgroundVideo } from '../hooks/useBackgroundVideo';

interface BackgroundVideoTrackProps {
  backgroundVideo?: BackgroundVideoConfig;
  fps: number;
  frame: number;
}

export const BackgroundVideoTrack: React.FC<BackgroundVideoTrackProps> = ({ backgroundVideo, fps, frame }) => {
  const {
    enabled,
    src,
    fallbackImageSrc,
    hasEnded,
    playbackRate,
    startFrom,
    repeatCount,
    singleLoopFrames,
    opacity,
    shouldRenderBlurredBackground,
    blurAmount,
    audioVolume,
  } = useBackgroundVideo({ backgroundVideo, fps, frame });

  if (!enabled || !src) return null;

  const blurredVideo = !hasEnded && shouldRenderBlurredBackground ? (
    <OffthreadVideo
      src={src}
      muted
      startFrom={startFrom}
      playbackRate={playbackRate}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        opacity,
        filter: `blur(${blurAmount}px)`,
        transform: 'scale(1.08)',
      }}
    />
  ) : null;

  const video = hasEnded ? null : (
    <OffthreadVideo
      src={src}
      muted
      startFrom={startFrom}
      playbackRate={playbackRate}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        width: '100%',
        height: '100%',
        objectFit: backgroundVideo?.fit || 'cover',
        opacity,
      }}
    />
  );

  const audio = !hasEnded && backgroundVideo?.audioEnabled ? (
    <Audio
      src={src}
      volume={audioVolume}
      startFrom={startFrom}
      playbackRate={playbackRate}
    />
  ) : null;

  const media = (
    <>
      {blurredVideo}
      {video}
      {audio}
    </>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', zIndex: 0 }}>
      {(video || audio) && backgroundVideo?.playbackMode === 'repeat-count' && (repeatCount ?? 0) > 1 && singleLoopFrames ? (
        <Loop durationInFrames={singleLoopFrames} times={repeatCount as number}>
          {media}
        </Loop>
      ) : media}
      {hasEnded && (
        fallbackImageSrc && backgroundVideo?.afterEndMode === 'image' ? (
          <img
            src={fallbackImageSrc}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: backgroundVideo.fit || 'cover' }}
          />
        ) : (
          <AbsoluteFill style={{ backgroundColor: backgroundVideo?.afterEndColor || '#000000' }} />
        )
      )}
      {backgroundVideo?.overlayColor && (
        <AbsoluteFill style={{ backgroundColor: backgroundVideo.overlayColor, zIndex: 2 }} />
      )}
    </AbsoluteFill>
  );
};
