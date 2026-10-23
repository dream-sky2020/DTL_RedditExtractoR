import { useEffect, useRef, useState } from 'react';
import type { PreviewMedia, PreviewSettings } from './previewTypes';

import { toast } from '@components/Toast';

interface SubtitlePreviewOptions {
  settings: PreviewSettings;
  media: PreviewMedia;
  otherMedia: PreviewMedia;
  layers: { sourceAudio: boolean; guideAudio: boolean; adAudio: boolean };
  adAudioEnabled: boolean;
  adVolume: number;
  prepareGuideAudio: (audio: HTMLAudioElement) => void;
  getGuideDuckMultiplier: (elapsed: number) => number;
}

export function useSubtitlePreview({
  settings, media, otherMedia, layers, adAudioEnabled, adVolume,
  prepareGuideAudio, getGuideDuckMultiplier,
}: SubtitlePreviewOptions) {
  const { sourceVideo, guideAudio, adTrimStart, resolvedAdTrimEnd,
    startAt, pauseSource, guidePauseSource, guideMode, guidePlaybackRate,
    voiceoverEnabled, sourceVolumeDuringAd, guideDuration, adVideoDelay } = settings;
  const { source: subtitleVideoPreviewRef, ad: subtitleAdPreviewRef, guide: subtitleAudioPreviewRef } = media;
  const { source: sourcePreviewRef, ad: adPreviewRef, guide: guidePreviewRef } = otherMedia;
  const { sourceAudio: subtitlePreviewSourceAudio, guideAudio: subtitlePreviewGuideAudio, adAudio: subtitlePreviewAdAudio } = layers;
  const [subtitlePreviewTime, setSubtitlePreviewTime] = useState(0);
  const [subtitlePreviewPlaying, setSubtitlePreviewPlaying] = useState(false);
  const [subtitlePreviewPhase, setSubtitlePreviewPhase] = useState<'idle' | 'lead' | 'ad' | 'done'>('idle');
  const subtitlePreviewPhaseRef = useRef<'idle' | 'lead' | 'ad' | 'done'>('idle');
  useEffect(() => {
    subtitleAudioPreviewRef.current?.pause();
    subtitleVideoPreviewRef.current?.pause();
    subtitleAdPreviewRef.current?.pause();
    subtitlePreviewPhaseRef.current = 'idle';
    setSubtitlePreviewTime(0);
    setSubtitlePreviewPlaying(false);
    setSubtitlePreviewPhase('idle');
  }, [sourceVideo, guideAudio]);

  useEffect(() => {
    const source = subtitleVideoPreviewRef.current;
    const audio = subtitleAudioPreviewRef.current;
    const ad = subtitleAdPreviewRef.current;
    if (source) source.muted = !subtitlePreviewSourceAudio;
    if (audio) audio.muted = !subtitlePreviewGuideAudio;
    if (ad) ad.muted = !subtitlePreviewAdAudio || voiceoverEnabled || !adAudioEnabled;
  }, [subtitlePreviewSourceAudio, subtitlePreviewGuideAudio, subtitlePreviewAdAudio, voiceoverEnabled, adAudioEnabled]);

  const setDedicatedPreviewPhase = (phase: 'idle' | 'lead' | 'ad' | 'done') => {
    subtitlePreviewPhaseRef.current = phase;
    setSubtitlePreviewPhase(phase);
  };

  const stopDedicatedSubtitlePreview = () => {
    const source = subtitleVideoPreviewRef.current;
    const ad = subtitleAdPreviewRef.current;
    const audio = subtitleAudioPreviewRef.current;
    source?.pause();
    ad?.pause();
    audio?.pause();
    if (source && Number.isFinite(source.duration)) source.currentTime = Math.min(startAt, Math.max(0, source.duration - 0.01));
    if (ad) ad.currentTime = adTrimStart;
    if (audio) audio.currentTime = 0;
    setSubtitlePreviewTime(0);
    setSubtitlePreviewPlaying(false);
    setDedicatedPreviewPhase('idle');
  };

  const beginDedicatedAdPreview = () => {
    const source = subtitleVideoPreviewRef.current;
    const ad = subtitleAdPreviewRef.current;
    const audio = subtitleAudioPreviewRef.current;
    setDedicatedPreviewPhase('ad');
    if (ad) {
      ad.currentTime = adTrimStart;
      ad.muted = !subtitlePreviewAdAudio || voiceoverEnabled || !adAudioEnabled;
      ad.volume = Math.max(0, Math.min(1, adVolume));
      void ad.play().catch(() => undefined);
    }
    const guideStillPlaying = voiceoverEnabled && Boolean(audio && !audio.ended);
    const shouldPauseSource = pauseSource || (guidePauseSource && guideStillPlaying);
    if (source) {
      source.muted = !subtitlePreviewSourceAudio;
      const guideMultiplier = guideStillPlaying && audio
        ? getGuideDuckMultiplier(audio.currentTime / guidePlaybackRate)
        : 1;
      source.volume = shouldPauseSource ? 1 : Math.min(sourceVolumeDuringAd, guideMultiplier);
      if (shouldPauseSource) source.pause();
      else void source.play().catch(() => undefined);
    }
  };

  const startDedicatedSubtitlePreview = () => {
    const source = subtitleVideoPreviewRef.current;
    const audio = subtitleAudioPreviewRef.current;
    if (!sourceVideo || !guideAudio || !source || !audio) {
      toast.warning('请先选择母片和广告引导音频');
      return;
    }
    sourcePreviewRef.current?.pause();
    adPreviewRef.current?.pause();
    guidePreviewRef.current?.pause();
    subtitleAdPreviewRef.current?.pause();
    const sourceEnd = Number.isFinite(source.duration) ? Math.max(0, source.duration - 0.01) : startAt;
    source.currentTime = Math.min(startAt, sourceEnd);
    source.muted = !subtitlePreviewSourceAudio;
    source.volume = 1;
    audio.currentTime = 0;
    audio.muted = !subtitlePreviewGuideAudio;
    prepareGuideAudio(audio);
    setSubtitlePreviewTime(0);
    setSubtitlePreviewPlaying(true);
    setDedicatedPreviewPhase('lead');
    if (guidePauseSource) source.pause();
    else void source.play().catch(() => undefined);
    void audio.play().catch(() => {
      setSubtitlePreviewPlaying(false);
    });
  };

  const toggleDedicatedSubtitlePreview = () => {
    const source = subtitleVideoPreviewRef.current;
    const ad = subtitleAdPreviewRef.current;
    const audio = subtitleAudioPreviewRef.current;
    if (subtitlePreviewPhaseRef.current === 'idle' || subtitlePreviewPhaseRef.current === 'done') {
      startDedicatedSubtitlePreview();
      return;
    }
    if (subtitlePreviewPlaying) {
      source?.pause();
      ad?.pause();
      audio?.pause();
      setSubtitlePreviewPlaying(false);
      return;
    }
    const phase = subtitlePreviewPhaseRef.current;
    if (phase === 'lead' || (phase === 'ad' && voiceoverEnabled && audio && !audio.ended)) {
      void audio?.play().catch(() => undefined);
    }
    if (phase === 'ad') void ad?.play().catch(() => undefined);
    const sourceShouldPause = phase === 'lead'
      ? guidePauseSource
      : pauseSource || (guidePauseSource && voiceoverEnabled && Boolean(audio && !audio.ended));
    if (!sourceShouldPause) void source?.play().catch(() => undefined);
    setSubtitlePreviewPlaying(true);
  };

  const updateDedicatedSubtitleTime = (audio: HTMLAudioElement) => {
    setSubtitlePreviewTime(audio.currentTime);
    const source = subtitleVideoPreviewRef.current;
    if (source && subtitlePreviewSourceAudio && !guidePauseSource) {
      const adMultiplier = subtitlePreviewPhaseRef.current === 'ad' && !pauseSource
        ? sourceVolumeDuringAd
        : 1;
      source.volume = Math.min(
        adMultiplier,
        getGuideDuckMultiplier(audio.currentTime / guidePlaybackRate),
      );
    }
    if (
      guideMode === 'voiceover'
      && subtitlePreviewPhaseRef.current === 'lead'
      && audio.currentTime / guidePlaybackRate + 0.03 >= adVideoDelay
    ) {
      beginDedicatedAdPreview();
    }
  };

  const finishDedicatedGuidePreview = () => {
    setSubtitlePreviewTime(guideDuration);
    const source = subtitleVideoPreviewRef.current;
    if (source) {
      source.volume = subtitlePreviewPhaseRef.current === 'ad' && !pauseSource
        ? sourceVolumeDuringAd
        : 1;
    }
    if (subtitlePreviewPhaseRef.current === 'lead') {
      beginDedicatedAdPreview();
      return;
    }
    if (subtitlePreviewPhaseRef.current === 'ad' && !pauseSource) {
      void subtitleVideoPreviewRef.current?.play().catch(() => undefined);
    }
  };

  const finishDedicatedAdPreview = () => {
    const ad = subtitleAdPreviewRef.current;
    if (!ad || subtitlePreviewPhaseRef.current !== 'ad' || ad.currentTime + 0.03 < resolvedAdTrimEnd) return;
    ad.pause();
    subtitleAudioPreviewRef.current?.pause();
    subtitleVideoPreviewRef.current?.pause();
    setSubtitlePreviewPlaying(false);
    setDedicatedPreviewPhase('done');
  };

  return {
    subtitlePreviewTime, subtitlePreviewPlaying, subtitlePreviewPhase,
    stopDedicatedSubtitlePreview, startDedicatedSubtitlePreview, toggleDedicatedSubtitlePreview,
    updateDedicatedSubtitleTime, finishDedicatedGuidePreview, finishDedicatedAdPreview,
  };
}
