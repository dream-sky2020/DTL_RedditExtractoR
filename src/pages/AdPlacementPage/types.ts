import type { AdPlacementDraft } from '@/utils/adPlacementDraft';
import type { AdSubtitleSettings } from '@/utils/adSubtitleSettings';

export type AdMode = AdPlacementDraft['mode'];
export type GuideAudioMode = AdPlacementDraft['guideMode'];
export type PositionPreset = 'top-left' | 'top-right' | 'center' | 'bottom-left' | 'bottom-right';

export interface VideoItem {
  name: string;
  path: string;
  url: string;
  size?: number;
  updatedAt?: string;
}

/** Post-processing request; intentionally independent of the master VideoConfig. */
export interface AdRenderRequest {
  mode: AdMode;
  sourceVideo: string;
  adVideo: string;
  startAt: number;
  adRange: { start: number; end: number };
  pauseSource: boolean;
  placement: { x: number; y: number; width: number };
  chromaKey: { color: string; similarity: number; blend: number };
  audio: { enabled: boolean; volume: number; sourceVolumeDuringAd: number };
  leadInAudio: {
    path: string;
    mode: GuideAudioMode;
    adVideoDelay: number;
    pauseSource: boolean;
    volume: number;
    playbackRate: number;
    sourceVolume: number;
    volumeTransitionDuration: number;
    subtitles: AdSubtitleSettings;
  };
}
