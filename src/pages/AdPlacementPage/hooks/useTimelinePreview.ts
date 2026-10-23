import { useEffect, useRef, useState } from 'react';
import type { PreviewMedia, PreviewSettings } from './previewTypes';

interface TimelinePreviewOptions {
  settings: PreviewSettings;
  media: PreviewMedia;
  timelinePreviewEnabled: boolean;
  guideCurrentTime: number;
  getGuideDuckMultiplier: (elapsed: number) => number;
  setSourcePreviewPlaying: (playing: boolean) => void;
}

export function useTimelinePreview({
  settings, media, timelinePreviewEnabled, guideCurrentTime,
  getGuideDuckMultiplier, setSourcePreviewPlaying,
}: TimelinePreviewOptions) {
  const { sourceVideo, greenScreenVideo, guideAudio, adTrimStart, adTrimEnd, resolvedAdTrimEnd,
    startAt, pauseSource, guidePauseSource, guideMode, guidePlaybackRate,
    mode, voiceoverEnabled, sourceVolumeDuringAd, sourceVolumeDuringGuide,
    guideVolumeTransitionDuration, guidePlaybackDuration, voiceoverLeadDuration, adVideoDelay } = settings;
  const { source: sourcePreviewRef, ad: adPreviewRef, guide: guidePreviewRef } = media;
  const [previewPauseActive, setPreviewPauseActive] = useState(false);
  const [previewPhase, setPreviewPhase] = useState<'idle' | 'lead' | 'ad' | 'done'>('idle');
  const pausePreviewActiveRef = useRef(false);
  const previewPhaseRef = useRef<'idle' | 'lead' | 'ad' | 'done'>('idle');
  const sourceBaseVolumeRef = useRef(1);
  const adStartSourceTimeRef = useRef(0);
  useEffect(() => {
    pausePreviewActiveRef.current = false;
    previewPhaseRef.current = 'idle';
    setSourcePreviewPlaying(false);
    setPreviewPhase('idle');
    setPreviewPauseActive(false);
    const ad = adPreviewRef.current;
    if (ad) {
      ad.pause();
      ad.currentTime = adTrimStart;
    }
    const guide = guidePreviewRef.current;
    if (guide) {
      guide.pause();
      guide.currentTime = 0;
    }
  }, [sourceVideo, greenScreenVideo, guideAudio, adTrimStart, adTrimEnd, startAt, pauseSource, guidePauseSource, guideMode, adVideoDelay, guidePlaybackRate, mode]);

  useEffect(() => {
    const source = sourcePreviewRef.current;
    if (!source) return;
    const guide = guidePreviewRef.current;
    const guideIsActive = Boolean(guide && !guide.ended)
      && (previewPhase === 'lead' || (previewPhase === 'ad' && voiceoverEnabled));
    const guideMultiplier = guideIsActive
      ? getGuideDuckMultiplier(guideCurrentTime / guidePlaybackRate)
      : 1;
    const adMultiplier = previewPhase === 'ad' && !pauseSource ? sourceVolumeDuringAd : 1;
    const targetVolume = sourceBaseVolumeRef.current * Math.min(guideMultiplier, adMultiplier);
    if (Math.abs(source.volume - targetVolume) > 0.01) source.volume = targetVolume;
  }, [previewPhase, pauseSource, sourceVolumeDuringAd, sourceVolumeDuringGuide,
    guideVolumeTransitionDuration, guideCurrentTime, guidePlaybackRate,
    guidePlaybackDuration, voiceoverLeadDuration, voiceoverEnabled, guidePauseSource, sourceVideo]);

  useEffect(() => {
    let animationFrame = 0;
    let disposed = false;

    const synchronizeAdVideo = () => {
      if (disposed) return;
      const source = sourcePreviewRef.current;
      const ad = adPreviewRef.current;
      if (
        source
        && ad
        && previewPhaseRef.current === 'ad'
        && !pauseSource
        && !pausePreviewActiveRef.current
        && !source.paused
      ) {
        const desiredAdTime = Math.min(
          resolvedAdTrimEnd,
          adTrimStart + Math.max(0, source.currentTime - adStartSourceTimeRef.current)
        );
        if (Math.abs(ad.currentTime - desiredAdTime) > 0.12) ad.currentTime = desiredAdTime;
      }
      animationFrame = window.requestAnimationFrame(synchronizeAdVideo);
    };

    animationFrame = window.requestAnimationFrame(synchronizeAdVideo);
    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
    };
  }, [adTrimStart, pauseSource, resolvedAdTrimEnd]);

  const setPreviewPhaseValue = (phase: 'idle' | 'lead' | 'ad' | 'done') => {
    previewPhaseRef.current = phase;
    setPreviewPhase(phase);
  };

  const beginAdPreview = () => {
    const source = sourcePreviewRef.current;
    const ad = adPreviewRef.current;
    if (!source || !ad) return;
    setPreviewPhaseValue('ad');
    adStartSourceTimeRef.current = source.currentTime;
    const guideStillPauses = guideMode === 'voiceover'
      && guidePauseSource
      && Boolean(guidePreviewRef.current && !guidePreviewRef.current.ended);
    const shouldPause = pauseSource || guideStillPauses;
    pausePreviewActiveRef.current = shouldPause;
    setPreviewPauseActive(shouldPause);
    if (shouldPause) source.pause();
    else if (source.paused) void source.play().catch(() => undefined);
    const guide = guidePreviewRef.current;
    const guideMultiplier = voiceoverEnabled && guide && !guide.ended
      ? getGuideDuckMultiplier(guide.currentTime / guidePlaybackRate)
      : 1;
    source.volume = shouldPause
      ? sourceBaseVolumeRef.current
      : sourceBaseVolumeRef.current * Math.min(sourceVolumeDuringAd, guideMultiplier);
    ad.currentTime = adTrimStart;
    void ad.play().catch(() => undefined);
  };

  const startPausedAdPreviewIfNeeded = () => {
    if (!timelinePreviewEnabled) return;
    const source = sourcePreviewRef.current;
    if (!source) return;
    if (previewPhaseRef.current === 'lead') {
      if (!guidePauseSource) void guidePreviewRef.current?.play().catch(() => undefined);
      return;
    }
    if (previewPhaseRef.current === 'ad') {
      if (!pauseSource) {
        void adPreviewRef.current?.play().catch(() => undefined);
        const guide = guidePreviewRef.current;
        if (voiceoverEnabled && guide && !guide.ended) void guide.play().catch(() => undefined);
      }
      return;
    }
    if (previewPhaseRef.current !== 'idle' || source.currentTime + 0.03 < startAt) return;
    if (!guideAudio) {
      beginAdPreview();
      return;
    }
    setPreviewPhaseValue('lead');
    pausePreviewActiveRef.current = guidePauseSource;
    setPreviewPauseActive(guidePauseSource);
    if (guidePauseSource) {
      source.pause();
      if (Math.abs(source.currentTime - startAt) > 0.03) source.currentTime = startAt;
    }
    const guide = guidePreviewRef.current;
    if (guide) {
      guide.currentTime = 0;
      void guide.play().catch(() => undefined);
    }
  };

  const finishGuidePreview = () => {
    if (previewPhaseRef.current === 'lead') {
      beginAdPreview();
      return;
    }
    if (guideMode === 'voiceover' && previewPhaseRef.current === 'ad' && !pauseSource) {
      pausePreviewActiveRef.current = false;
      setPreviewPauseActive(false);
      const source = sourcePreviewRef.current;
      if (source) void source.play().catch(() => undefined);
    }
  };

  const startVoiceoverAdIfNeeded = () => {
    const guide = guidePreviewRef.current;
    if (guideMode !== 'voiceover' || previewPhaseRef.current !== 'lead' || !guide) return;
    if (guide.currentTime / guidePlaybackRate + 0.03 >= adVideoDelay) beginAdPreview();
  };

  const finishPausedAdPreview = () => {
    if (previewPhaseRef.current !== 'ad') return;
    pausePreviewActiveRef.current = false;
    setPreviewPauseActive(false);
    setPreviewPhaseValue('done');
    const guide = guidePreviewRef.current;
    guide?.pause();
    const source = sourcePreviewRef.current;
    if (source) {
      source.volume = sourceBaseVolumeRef.current;
      void source.play().catch(() => undefined);
    }
  };

  const finishAdRangeIfNeeded = () => {
    const ad = adPreviewRef.current;
    if (previewPhaseRef.current !== 'ad' || !ad) return;
    if (ad.currentTime + 0.03 >= resolvedAdTrimEnd) finishPausedAdPreview();
  };

  const resetPreviewAfterSeek = () => {
    if (pausePreviewActiveRef.current) return;
    const source = sourcePreviewRef.current;
    const ad = adPreviewRef.current;
    const guide = guidePreviewRef.current;
    if (!source || !ad) return;
    pausePreviewActiveRef.current = false;
    setPreviewPauseActive(false);
    source.volume = sourceBaseVolumeRef.current;
    ad.pause();
    ad.currentTime = adTrimStart;
    guide?.pause();
    if (guide) guide.currentTime = 0;
    setPreviewPhaseValue(source.currentTime > startAt + 0.03 ? 'done' : 'idle');
  };

  const stopTimelinePreview = () => {
    pausePreviewActiveRef.current = false;
    setPreviewPauseActive(false);
    setPreviewPhaseValue('idle');
    const source = sourcePreviewRef.current;
    const ad = adPreviewRef.current;
    const guide = guidePreviewRef.current;
    if (source) source.volume = sourceBaseVolumeRef.current;
    ad?.pause();
    guide?.pause();
    if (ad) ad.currentTime = adTrimStart;
    if (guide) guide.currentTime = 0;
  };

  const restartTimelinePreview = () => {
    stopTimelinePreview();
    const source = sourcePreviewRef.current;
    if (!source) return;

    source.pause();
    const previewStart = Math.max(0, startAt - 0.5);
    const startPlayback = () => {
      startPausedAdPreviewIfNeeded();
      void source.play().catch(() => undefined);
    };

    if (Math.abs(source.currentTime - previewStart) <= 0.03) {
      startPlayback();
      return;
    }

    source.addEventListener('seeked', startPlayback, { once: true });
    source.currentTime = previewStart;
  };

  const handleSourcePause = () => {
    setSourcePreviewPlaying(false);
    if (timelinePreviewEnabled && !pausePreviewActiveRef.current) {
      adPreviewRef.current?.pause();
      guidePreviewRef.current?.pause();
    }
  };

  const handleSourceVolumeChange = (source: HTMLVideoElement) => {
    if (previewPhaseRef.current === 'idle' || previewPhaseRef.current === 'done') {
      sourceBaseVolumeRef.current = source.volume;
    }
  };

  return {
    previewPauseActive, previewPhase, startPausedAdPreviewIfNeeded,
    finishGuidePreview, startVoiceoverAdIfNeeded, finishPausedAdPreview,
    finishAdRangeIfNeeded, resetPreviewAfterSeek, stopTimelinePreview, restartTimelinePreview,
    handleSourcePause, handleSourceVolumeChange,
  };
}
