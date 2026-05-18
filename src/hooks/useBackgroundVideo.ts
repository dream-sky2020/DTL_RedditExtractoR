import { staticFile, interpolate } from 'remotion';
import { BackgroundVideoConfig } from '../types';

export const BACKGROUND_VIDEO_PUBLIC_DIR = 'background-videos/';

export const clamp01 = (value: number | undefined, fallback: number): number => {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(1, value as number));
};

export const clampAudioVolume = (value: number | undefined, fallback: number): number => {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, value as number);
};

export const normalizeBackgroundVideoSrc = (src?: string): string | null => {
  const raw = (src || '').trim().replace(/\\/g, '/');
  if (!raw) return null;
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  if (/^[a-z]:\//i.test(raw) || raw.includes('..')) return null;

  const withoutLeadingSlash = raw.replace(/^\/+/, '');
  const publicRelative = withoutLeadingSlash.startsWith('public/')
    ? withoutLeadingSlash.slice('public/'.length)
    : withoutLeadingSlash;

  if (!publicRelative.startsWith(BACKGROUND_VIDEO_PUBLIC_DIR)) return null;
  return publicRelative;
};

export const resolveBackgroundVideoSrc = (src?: string): string | null => {
  const normalized = normalizeBackgroundVideoSrc(src);
  if (!normalized) return null;
  if (/^(https?:|data:|blob:)/i.test(normalized)) return normalized;
  return staticFile(normalized);
};

export const getBackgroundPlayFrames = (backgroundVideo: BackgroundVideoConfig, fps: number): number | null => {
  if (!backgroundVideo.durationInSeconds) return null;
  const playbackRate = backgroundVideo.playbackRate && backgroundVideo.playbackRate > 0 ? backgroundVideo.playbackRate : 1;
  const baseDuration = Math.max(0, backgroundVideo.durationInSeconds - (backgroundVideo.startOffset || 0)) / playbackRate;
  const repeatCount = backgroundVideo.playbackMode === 'repeat-count'
    ? Math.max(1, Math.floor(backgroundVideo.repeatCount || 1))
    : 1;
  return Math.max(1, Math.round(baseDuration * repeatCount * fps));
};

interface UseBackgroundVideoProps {
  backgroundVideo?: BackgroundVideoConfig;
  fps: number;
  frame: number;
}

export const useBackgroundVideo = ({ backgroundVideo, fps, frame }: UseBackgroundVideoProps) => {
  if (!backgroundVideo?.enabled) {
    return { enabled: false };
  }

  const src = resolveBackgroundVideoSrc(backgroundVideo.src);
  const fallbackImageSrc = resolveBackgroundVideoSrc(backgroundVideo.afterEndImageSrc);
  const playFrames = getBackgroundPlayFrames(backgroundVideo, fps);
  const hasEnded = playFrames !== null && frame >= playFrames;

  const playbackRate = Number.isFinite(backgroundVideo.playbackRate) && (backgroundVideo.playbackRate as number) > 0
    ? (backgroundVideo.playbackRate as number)
    : 1;
    
  const startFrom = Math.max(0, Math.round((backgroundVideo.startOffset || 0) * fps));
  
  const repeatCount = backgroundVideo.playbackMode === 'repeat-count'
    ? Math.max(1, Math.floor(backgroundVideo.repeatCount || 1))
    : 1;
    
  const singleLoopFrames = backgroundVideo.durationInSeconds
    ? Math.max(1, Math.round(Math.max(0, backgroundVideo.durationInSeconds - (backgroundVideo.startOffset || 0)) / playbackRate * fps))
    : null;
    
  const baseOpacity = clamp01(backgroundVideo.opacity, 1);
  const fadeOutDuration = Math.max(0, backgroundVideo.fadeOutDuration ?? 0);
  
  let opacity = baseOpacity;
  if (fadeOutDuration > 0 && playFrames !== null) {
    const fadeOutFrames = fadeOutDuration * fps;
    opacity = interpolate(
      frame,
      [playFrames - fadeOutFrames, playFrames],
      [baseOpacity, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
  }

  const shouldRenderBlurredBackground = backgroundVideo.fit === 'contain' && backgroundVideo.blurredBackgroundEnabled;
  const blurAmount = Math.max(0, backgroundVideo.blurredBackgroundBlur ?? 24);
  const audioVolume = clampAudioVolume(backgroundVideo.audioVolume, 0.35);

  return {
    enabled: true,
    src,
    fallbackImageSrc,
    playFrames,
    hasEnded,
    playbackRate,
    startFrom,
    repeatCount,
    singleLoopFrames,
    opacity,
    shouldRenderBlurredBackground,
    blurAmount,
    audioVolume,
  };
};
