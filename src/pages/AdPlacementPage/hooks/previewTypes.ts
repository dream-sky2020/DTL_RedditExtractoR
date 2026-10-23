import type { RefObject } from 'react';
import type { AdMode, GuideAudioMode } from '../types';

export interface PreviewMedia {
  source: RefObject<HTMLVideoElement | null>;
  ad: RefObject<HTMLVideoElement | null>;
  guide: RefObject<HTMLAudioElement | null>;
}

export interface PreviewSettings {
  sourceVideo: string;
  greenScreenVideo: string;
  guideAudio: string;
  adTrimStart: number;
  adTrimEnd: number;
  resolvedAdTrimEnd: number;
  startAt: number;
  pauseSource: boolean;
  guidePauseSource: boolean;
  guideMode: GuideAudioMode;
  adVideoDelay: number;
  guidePlaybackRate: number;
  mode: AdMode;
  voiceoverEnabled: boolean;
  sourceVolumeDuringAd: number;
  sourceVolumeDuringGuide: number;
  guideVolumeTransitionDuration: number;
  guidePlaybackDuration: number;
  voiceoverLeadDuration: number;
  guideDuration: number;
}
