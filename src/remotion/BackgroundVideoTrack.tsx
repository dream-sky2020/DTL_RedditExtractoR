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
    blurredBackgroundContain,
    containPosition,
    blurAmount,
    audioVolume,
  } = useBackgroundVideo({ backgroundVideo, fps, frame });

  if (!enabled || !src) return null;

  const objectPositionMap: Record<string, string> = {
    center: 'center center',
    top: 'center top',
    bottom: 'center bottom',
    left: 'left center',
    right: 'right center',
  };

  const objectPosition = objectPositionMap[containPosition] || 'center center';

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
        objectFit: blurredBackgroundContain ? 'fill' : 'cover',
        opacity,
        filter: `blur(${blurAmount}px)`,
        transform: blurredBackgroundContain ? 'none' : 'scale(1.08)',
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
        objectPosition: backgroundVideo?.fit === 'contain' ? objectPosition : 'center center',
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

  const finalOpacity = hasEnded ? 1 : opacity;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', zIndex: 0 }}>
      {/* 1. 底层：结束后状态（在淡出时可见） */}
      {(hasEnded || (opacity < 1)) && (
        fallbackImageSrc && backgroundVideo?.afterEndMode === 'image' ? (
          <img
            src={fallbackImageSrc}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: backgroundVideo.fit || 'cover', position: 'absolute', inset: 0 }}
          />
        ) : (
          <AbsoluteFill style={{ backgroundColor: backgroundVideo?.afterEndColor || '#000000' }} />
        )
      )}

      {/* 2. 中层：背景视频（应用动态不透明度） */}
      {!hasEnded && (
        <AbsoluteFill style={{ opacity }}>
          {backgroundVideo?.playbackMode === 'repeat-count' && (repeatCount ?? 0) > 1 && singleLoopFrames ? (
            <Loop durationInFrames={singleLoopFrames} times={repeatCount as number}>
              {media}
            </Loop>
          ) : media}
        </AbsoluteFill>
      )}

      {/* 3. 顶层：色彩遮罩 */}
      {backgroundVideo?.overlayColor && (
        <AbsoluteFill style={{ backgroundColor: backgroundVideo.overlayColor, zIndex: 2, pointerEvents: 'none' }} />
      )}
    </AbsoluteFill>
  );
};
