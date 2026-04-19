import { VideoCanvasConfig, VideoCanvasPreset, VideoCanvasPresetSize, VideoConfig } from '../types';

const MIN_CANVAS_DIMENSION = 240;

export const DEFAULT_VIDEO_CANVAS_PRESETS: Record<VideoCanvasPreset, VideoCanvasPresetSize> = {
  landscape: { width: 1920, height: 1080 },
  portrait: { width: 1080, height: 1920 },
};

const clonePresetSize = (preset: VideoCanvasPresetSize): VideoCanvasPresetSize => ({
  width: preset.width,
  height: preset.height,
});

export const createDefaultVideoCanvasConfig = (): VideoCanvasConfig => ({
  activePreset: 'landscape',
  presets: {
    landscape: clonePresetSize(DEFAULT_VIDEO_CANVAS_PRESETS.landscape),
    portrait: clonePresetSize(DEFAULT_VIDEO_CANVAS_PRESETS.portrait),
  },
});

const normalizeDimension = (value: unknown, fallback: number): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(MIN_CANVAS_DIMENSION, Math.round(parsed));
};

const normalizePresetSize = (
  preset: Partial<VideoCanvasPresetSize> | undefined,
  fallback: VideoCanvasPresetSize
): VideoCanvasPresetSize => ({
  width: normalizeDimension(preset?.width, fallback.width),
  height: normalizeDimension(preset?.height, fallback.height),
});

export const normalizeVideoCanvasConfig = (canvas?: Partial<VideoCanvasConfig> | null): VideoCanvasConfig => {
  const activePreset: VideoCanvasPreset = canvas?.activePreset === 'portrait' ? 'portrait' : 'landscape';
  const presets = canvas?.presets;

  return {
    activePreset,
    presets: {
      landscape: normalizePresetSize(presets?.landscape, DEFAULT_VIDEO_CANVAS_PRESETS.landscape),
      portrait: normalizePresetSize(presets?.portrait, DEFAULT_VIDEO_CANVAS_PRESETS.portrait),
    },
  };
};

export const normalizeVideoConfig = (config: VideoConfig): VideoConfig => ({
  ...config,
  canvas: normalizeVideoCanvasConfig(config.canvas),
});

export const getVideoCanvasConfig = (
  input?: Pick<VideoConfig, 'canvas'> | VideoCanvasConfig | null
): VideoCanvasConfig => {
  if (!input) {
    return createDefaultVideoCanvasConfig();
  }
  if ('presets' in input || 'activePreset' in input) {
    return normalizeVideoCanvasConfig(input as VideoCanvasConfig);
  }
  return normalizeVideoCanvasConfig(input.canvas);
};

export const getActiveVideoCanvasSize = (
  input?: Pick<VideoConfig, 'canvas'> | VideoCanvasConfig | null
): VideoCanvasPresetSize => {
  const canvas = getVideoCanvasConfig(input);
  return canvas.presets[canvas.activePreset];
};

const greatestCommonDivisor = (a: number, b: number): number => {
  let left = Math.abs(a);
  let right = Math.abs(b);
  while (right !== 0) {
    const rest = left % right;
    left = right;
    right = rest;
  }
  return left || 1;
};

export const getAspectRatioLabel = (width: number, height: number): string => {
  const divisor = greatestCommonDivisor(width, height);
  return `${width / divisor}:${height / divisor}`;
};

export const getVideoAspectRatio = (input?: Pick<VideoConfig, 'canvas'> | VideoCanvasConfig | null): number => {
  const active = getActiveVideoCanvasSize(input);
  return active.width / active.height;
};

