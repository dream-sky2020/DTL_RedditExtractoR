import type { GuideAudioMode } from '../types';

/** All times are seconds on the output timeline, except the material trim range. */
export interface AdTimelineInput {
  sourceDuration: number;
  adDuration: number;
  adTrimStart?: number;
  adTrimEnd?: number | null;
  startAt: number;
  pauseSource: boolean;
  leadEnabled: boolean;
  leadDuration: number;
  leadPlaybackRate: number;
  leadMode: GuideAudioMode;
  adVideoDelay: number;
  leadPauseSource: boolean;
}

export function calculateAdTimeline(input: AdTimelineInput) {
  const adTrimStart = Math.min(Math.max(input.adTrimStart ?? 0, 0), Math.max(input.adDuration - 0.001, 0));
  const adTrimEnd = Math.min(Math.max(input.adTrimEnd ?? input.adDuration, adTrimStart + 0.001), input.adDuration);
  const adDuration = adTrimEnd - adTrimStart;
  const startAt = Math.min(Math.max(input.startAt, 0), Math.max(input.sourceDuration - 0.001, 0));
  const leadPlaybackRate = Math.min(Math.max(input.leadPlaybackRate, 0.5), 2);
  const leadPlaybackDuration = input.leadEnabled ? input.leadDuration / leadPlaybackRate : 0;
  const adVideoDelay = Math.min(Math.max(input.adVideoDelay, 0), Math.max(leadPlaybackDuration - 0.001, 0));
  const leadPlayDuration = input.leadMode === 'voiceover'
    ? Math.min(leadPlaybackDuration, adVideoDelay + adDuration) : leadPlaybackDuration;
  const leadPausesSource = input.leadEnabled && input.leadPauseSource;
  const outputAdStart = startAt + (input.leadMode === 'voiceover' ? adVideoDelay : leadPlayDuration);
  const baseDuration = input.sourceDuration + (leadPausesSource ? leadPlayDuration : 0);
  // Add only the uncovered tail of an overlapping pause; never count it twice.
  const adPauseStart = input.pauseSource && leadPausesSource && input.leadMode === 'voiceover'
    ? Math.max(outputAdStart, startAt + leadPlayDuration) : outputAdStart;
  const adPauseDuration = input.pauseSource ? Math.max(0, outputAdStart + adDuration - adPauseStart) : 0;
  return {
    adTrimStart, adTrimEnd, adDuration, startAt, leadPlaybackRate, leadPlaybackDuration,
    adVideoDelay, leadPlayDuration, leadPausesSource, outputAdStart,
    baseDuration, adPauseStart, adPauseDuration, outputDuration: baseDuration + adPauseDuration,
  };
}
