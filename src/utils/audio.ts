export const DEFAULT_PREVIEW_VOLUME = 0.5;

export const normalizePreviewVolume = (value: unknown, fallback = DEFAULT_PREVIEW_VOLUME): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(1, Number(numeric.toFixed(3))));
};
