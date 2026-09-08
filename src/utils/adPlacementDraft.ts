export interface AdPlacementDraft {
  sourceVideo: string;
  adVideo: string;
  guideAudio: string;
  guideMode: 'prelude' | 'voiceover';
  adVideoDelay: number;
  guidePauseSource: boolean;
  guideVolume: number;
  guidePlaybackRate: number;
  sourceVolumeDuringGuide: number;
  guideVolumeTransitionDuration: number;
  adTrimStart: number;
  adTrimEnd: number;
  startAt: number;
  mode: 'chroma-key' | 'plain-overlay';
  pauseSource: boolean;
  x: number;
  y: number;
  width: number;
  autoCenterPlacement: boolean;
  keyColor: string;
  similarity: number;
  blend: number;
  adAudioEnabled: boolean;
  adVolume: number;
  sourceVolumeDuringAd: number;
  timelinePreviewEnabled: boolean;
  subtitlePreviewSourceAudio: boolean;
  subtitlePreviewGuideAudio: boolean;
  subtitlePreviewSubtitles: boolean;
  subtitlePreviewAdVideo: boolean;
  subtitlePreviewAdAudio: boolean;
  lastTaskId: string;
}

const STORAGE_KEY = 'redditextractor:ad-placement-draft:v1';

export const DEFAULT_AD_PLACEMENT_DRAFT: AdPlacementDraft = {
  sourceVideo: '',
  adVideo: '',
  guideAudio: '',
  guideMode: 'prelude',
  adVideoDelay: 1,
  guidePauseSource: false,
  guideVolume: 1,
  guidePlaybackRate: 1,
  sourceVolumeDuringGuide: 0.25,
  guideVolumeTransitionDuration: 0.5,
  adTrimStart: 0,
  adTrimEnd: 0,
  startAt: 0,
  mode: 'chroma-key',
  pauseSource: false,
  x: 0.71,
  y: 0.66,
  width: 0.25,
  autoCenterPlacement: false,
  keyColor: '#00ff00',
  similarity: 0.3,
  blend: 0.08,
  adAudioEnabled: true,
  adVolume: 1,
  sourceVolumeDuringAd: 0.25,
  timelinePreviewEnabled: false,
  subtitlePreviewSourceAudio: false,
  subtitlePreviewGuideAudio: true,
  subtitlePreviewSubtitles: true,
  subtitlePreviewAdVideo: false,
  subtitlePreviewAdAudio: false,
  lastTaskId: '',
};

const clamp = (value: unknown, min: number, max: number, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};

const bool = (value: unknown, fallback: boolean) => typeof value === 'boolean' ? value : fallback;
const text = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;

export const normalizeAdPlacementDraft = (value?: Partial<AdPlacementDraft> | null): AdPlacementDraft => ({
  sourceVideo: text(value?.sourceVideo),
  adVideo: text(value?.adVideo),
  guideAudio: text(value?.guideAudio),
  guideMode: value?.guideMode === 'voiceover' ? 'voiceover' : 'prelude',
  adVideoDelay: clamp(value?.adVideoDelay, 0, 3600, 1),
  guidePauseSource: bool(value?.guidePauseSource, false),
  guideVolume: clamp(value?.guideVolume, 0, 2, 1),
  guidePlaybackRate: clamp(value?.guidePlaybackRate, 0.5, 2, 1),
  sourceVolumeDuringGuide: clamp(value?.sourceVolumeDuringGuide, 0, 1, 0.25),
  guideVolumeTransitionDuration: clamp(value?.guideVolumeTransitionDuration, 0, 10, 0.5),
  adTrimStart: clamp(value?.adTrimStart, 0, 36000, 0),
  adTrimEnd: clamp(value?.adTrimEnd, 0, 36000, 0),
  startAt: clamp(value?.startAt, 0, 36000, 0),
  mode: value?.mode === 'plain-overlay' ? 'plain-overlay' : 'chroma-key',
  pauseSource: bool(value?.pauseSource, false),
  x: clamp(value?.x, -5, 1, 0.71),
  y: clamp(value?.y, -5, 1, 0.66),
  width: clamp(value?.width, 0.02, 5, 0.25),
  autoCenterPlacement: bool(value?.autoCenterPlacement, false),
  keyColor: /^#[0-9a-f]{6}$/i.test(text(value?.keyColor)) ? text(value?.keyColor) : '#00ff00',
  similarity: clamp(value?.similarity, 0.01, 1, 0.3),
  blend: clamp(value?.blend, 0, 1, 0.08),
  adAudioEnabled: bool(value?.adAudioEnabled, true),
  adVolume: clamp(value?.adVolume, 0, 2, 1),
  sourceVolumeDuringAd: clamp(value?.sourceVolumeDuringAd, 0, 1, 0.25),
  timelinePreviewEnabled: bool(value?.timelinePreviewEnabled, false),
  subtitlePreviewSourceAudio: bool(value?.subtitlePreviewSourceAudio, false),
  subtitlePreviewGuideAudio: bool(value?.subtitlePreviewGuideAudio, true),
  subtitlePreviewSubtitles: bool(value?.subtitlePreviewSubtitles, true),
  subtitlePreviewAdVideo: bool(value?.subtitlePreviewAdVideo, false),
  subtitlePreviewAdAudio: bool(value?.subtitlePreviewAdAudio, false),
  lastTaskId: text(value?.lastTaskId),
});

export const loadAdPlacementDraft = (): AdPlacementDraft => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeAdPlacementDraft(JSON.parse(raw)) : { ...DEFAULT_AD_PLACEMENT_DRAFT };
  } catch {
    return { ...DEFAULT_AD_PLACEMENT_DRAFT };
  }
};

export const saveAdPlacementDraft = (draft: AdPlacementDraft) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeAdPlacementDraft(draft)));
};
