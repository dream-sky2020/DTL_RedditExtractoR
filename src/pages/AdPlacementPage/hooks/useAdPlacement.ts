import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@components/Toast";
import { loadAdChromaTestSettings } from "@/utils/adChromaSettings";
import {
  loadAdPlacementDraft,
  saveAdPlacementDraft,
} from "@/utils/adPlacementDraft";
import type { AdMode, GuideAudioMode, PositionPreset } from "../types";
import { createAdRenderTask, getAudioUrl, getVideoUrl } from "../api";
import { useAdMediaLibrary } from "./useAdMediaLibrary";
import { useAdSubtitleDraft } from "./useAdSubtitleDraft";
import { calculateAdTimeline } from "../calculations/timeline";
import { useTimelinePreview } from "./useTimelinePreview";
import { useSubtitlePreview } from "./useSubtitlePreview";
import type { AdPlacementViewProps } from "../AdPlacementView";

type AudioPreviewGraph = {
  element: HTMLAudioElement;
  context: AudioContext;
  gain: GainNode;
};

const applyGuidePlaybackRate = (audio: HTMLAudioElement, rate: number) => {
  audio.playbackRate = Math.min(2, Math.max(0.5, rate));
  try {
    audio.preservesPitch = true;
  } catch {
    // Older browsers may expose only the vendor-prefixed property.
  }
  const legacyAudio = audio as HTMLAudioElement & {
    webkitPreservesPitch?: boolean;
  };
  if (typeof legacyAudio.webkitPreservesPitch === "boolean")
    legacyAudio.webkitPreservesPitch = true;
};

export function useAdPlacement(): AdPlacementViewProps {
  const [initialDraft] = useState(loadAdPlacementDraft);
  const [sourceVideo, setSourceVideo] = useState(initialDraft.sourceVideo);
  const [greenScreenVideo, setGreenScreenVideo] = useState(
    initialDraft.adVideo,
  );
  const [guideAudio, setGuideAudio] = useState(initialDraft.guideAudio);
  const [guideDuration, setGuideDuration] = useState(0);
  const [guideMode, setGuideMode] = useState<GuideAudioMode>(
    initialDraft.guideMode,
  );
  const [adVideoDelay, setAdVideoDelay] = useState(initialDraft.adVideoDelay);
  const [guidePauseSource, setGuidePauseSource] = useState(
    initialDraft.guidePauseSource,
  );
  const [guideVolume, setGuideVolume] = useState(initialDraft.guideVolume);
  const [guidePlaybackRate, setGuidePlaybackRate] = useState(
    initialDraft.guidePlaybackRate,
  );
  const [sourceVolumeDuringGuide, setSourceVolumeDuringGuide] = useState(
    initialDraft.sourceVolumeDuringGuide,
  );
  const [guideVolumeTransitionDuration, setGuideVolumeTransitionDuration] =
    useState(initialDraft.guideVolumeTransitionDuration);
  const [guideCurrentTime, setGuideCurrentTime] = useState(0);
  const [subtitlePreviewSourceAudio, setSubtitlePreviewSourceAudio] = useState(
    initialDraft.subtitlePreviewSourceAudio,
  );
  const [subtitlePreviewGuideAudio, setSubtitlePreviewGuideAudio] = useState(
    initialDraft.subtitlePreviewGuideAudio,
  );
  const [subtitlePreviewSubtitles, setSubtitlePreviewSubtitles] = useState(
    initialDraft.subtitlePreviewSubtitles,
  );
  const [subtitlePreviewAdVideo, setSubtitlePreviewAdVideo] = useState(
    initialDraft.subtitlePreviewAdVideo,
  );
  const [subtitlePreviewAdAudio, setSubtitlePreviewAdAudio] = useState(
    initialDraft.subtitlePreviewAdAudio,
  );
  const [submitting, setSubmitting] = useState(false);
  const [sourceDuration, setSourceDuration] = useState(0);
  const [sourceSize, setSourceSize] = useState({ width: 16, height: 9 });
  const [adSize, setAdSize] = useState({ width: 16, height: 9 });
  const [adDuration, setAdDuration] = useState(0);
  const [adTrimStart, setAdTrimStart] = useState(initialDraft.adTrimStart);
  const [adTrimEnd, setAdTrimEnd] = useState(initialDraft.adTrimEnd);
  const [startAt, setStartAt] = useState(initialDraft.startAt);
  const [mode, setMode] = useState<AdMode>(initialDraft.mode);
  const [pauseSource, setPauseSource] = useState(initialDraft.pauseSource);
  const [x, setX] = useState(initialDraft.x);
  const [y, setY] = useState(initialDraft.y);
  const [width, setWidth] = useState(initialDraft.width);
  const [autoCenterPlacement, setAutoCenterPlacement] = useState(
    initialDraft.autoCenterPlacement,
  );
  const [keyColor, setKeyColor] = useState(initialDraft.keyColor);
  const [similarity, setSimilarity] = useState(initialDraft.similarity);
  const [blend, setBlend] = useState(initialDraft.blend);
  const [adAudioEnabled, setAdAudioEnabled] = useState(
    initialDraft.adAudioEnabled,
  );
  const [adVolume, setAdVolume] = useState(initialDraft.adVolume);
  const [sourceVolumeDuringAd, setSourceVolumeDuringAd] = useState(
    initialDraft.sourceVolumeDuringAd,
  );
  const [lastTaskId, setLastTaskId] = useState(initialDraft.lastTaskId);
  const [timelinePreviewEnabled, setTimelinePreviewEnabled] = useState(
    initialDraft.timelinePreviewEnabled,
  );
  const [sourcePreviewPlaying, setSourcePreviewPlaying] = useState(false);
  const sourcePreviewRef = useRef<HTMLVideoElement | null>(null);
  const adPreviewRef = useRef<HTMLVideoElement | null>(null);
  const adMaterialPreviewRef = useRef<HTMLVideoElement | null>(null);
  const guidePreviewRef = useRef<HTMLAudioElement | null>(null);
  const guideAudioGraphRef = useRef<AudioPreviewGraph | null>(null);
  const subtitleVideoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const subtitleAdPreviewRef = useRef<HTMLVideoElement | null>(null);
  const subtitleAudioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const subtitleAudioGraphRef = useRef<AudioPreviewGraph | null>(null);
  const adMetadataPathRef = useRef(initialDraft.adVideo);

  const {
    renderedVideos,
    greenScreenVideos,
    guideAudios,
    loading,
    loadVideos,
    pickVideo,
    pickGuideAudio,
    changeGuideAudio,
  } = useAdMediaLibrary({
    setSourceVideo,
    setGreenScreenVideo,
    setGuideAudio,
    setGuideDuration,
  });
  const {
    subtitleSettings,
    setSubtitleSettings,
    updateSubtitleCue,
    addSubtitleCue,
    importSrt,
    exportSrt,
  } = useAdSubtitleDraft({
    guideDuration,
    getCurrentTime: () => guidePreviewRef.current?.currentTime,
  });

  const sourceUrl = getVideoUrl(sourceVideo);
  const greenScreenUrl = getVideoUrl(greenScreenVideo);
  const guideAudioUrl = getAudioUrl(guideAudio);
  const voiceoverEnabled = Boolean(guideAudio) && guideMode === "voiceover";
  const effectivePauseSource = pauseSource;
  const adNormalizedHeight =
    width *
    (sourceSize.width / Math.max(sourceSize.height, 1)) *
    (adSize.height / Math.max(adSize.width, 1));
  const timeline = calculateAdTimeline({
    sourceDuration,
    adDuration,
    adTrimStart,
    adTrimEnd: adTrimEnd > 0 ? adTrimEnd : undefined,
    startAt,
    pauseSource: effectivePauseSource,
    leadEnabled: Boolean(guideAudio),
    leadDuration: guideDuration,
    leadPlaybackRate: guidePlaybackRate,
    leadMode: guideMode,
    adVideoDelay,
    leadPauseSource: guidePauseSource,
  });
  const resolvedAdTrimEnd = timeline.adTrimEnd;
  const selectedAdDuration = timeline.adDuration;
  const guidePlaybackDuration = timeline.leadPlaybackDuration;
  const voiceoverLeadDuration = timeline.leadPlayDuration;
  const estimatedDuration = timeline.outputDuration;
  const selectedSource = useMemo(
    () => renderedVideos.find((item) => item.path === sourceVideo),
    [renderedVideos, sourceVideo],
  );
  const previewMaxWidth = Math.max(
    1,
    Math.min(
      720,
      sourceSize.width,
      Math.round((520 * sourceSize.width) / Math.max(sourceSize.height, 1)),
    ),
  );
  const getGuideDuckMultiplier = (elapsed: number) => {
    if (guidePauseSource || guidePlaybackDuration <= 0) return 1;
    const duration =
      guideMode === "voiceover" ? voiceoverLeadDuration : guidePlaybackDuration;
    if (elapsed < 0 || elapsed > duration) return 1;
    const ramp = Math.min(guideVolumeTransitionDuration, duration / 2);
    if (ramp <= 0.0001) return sourceVolumeDuringGuide;
    const duckAmount = Math.min(1, elapsed / ramp, (duration - elapsed) / ramp);
    return 1 - (1 - sourceVolumeDuringGuide) * Math.max(0, duckAmount);
  };

  const ensureAudioPreviewGain = (
    audio: HTMLAudioElement,
    graphRef: React.MutableRefObject<AudioPreviewGraph | null>,
  ) => {
    let graph = graphRef.current;
    if (graph?.element !== audio) {
      if (graph) void graph.context.close().catch(() => undefined);
      const AudioContextConstructor =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextConstructor) {
        audio.volume = Math.min(1, guideVolume);
        return;
      }
      const context = new AudioContextConstructor();
      const source = context.createMediaElementSource(audio);
      const gain = context.createGain();
      audio.volume = 1;
      source.connect(gain);
      gain.connect(context.destination);
      graph = { element: audio, context, gain };
      graphRef.current = graph;
    }
    graph.gain.gain.setValueAtTime(guideVolume, graph.context.currentTime);
    if (graph.context.state === "suspended")
      void graph.context.resume().catch(() => undefined);
  };

  const previewSettings = {
    sourceVideo,
    greenScreenVideo,
    guideAudio,
    adTrimStart,
    adTrimEnd,
    resolvedAdTrimEnd,
    startAt,
    pauseSource,
    guidePauseSource,
    guideMode,
    guidePlaybackRate,
    mode,
    voiceoverEnabled,
    sourceVolumeDuringAd,
    sourceVolumeDuringGuide,
    guideVolumeTransitionDuration,
    guidePlaybackDuration,
    voiceoverLeadDuration,
    guideDuration,
    adVideoDelay: timeline.adVideoDelay,
  };
  const timelineMedia = {
    source: sourcePreviewRef,
    ad: adPreviewRef,
    guide: guidePreviewRef,
  };
  const {
    previewPauseActive,
    previewPhase,
    startPausedAdPreviewIfNeeded,
    finishGuidePreview,
    startVoiceoverAdIfNeeded,
    finishPausedAdPreview,
    finishAdRangeIfNeeded,
    resetPreviewAfterSeek,
    stopTimelinePreview,
    restartTimelinePreview,
    handleSourcePause,
    handleSourceVolumeChange,
  } = useTimelinePreview({
    settings: previewSettings,
    media: timelineMedia,
    timelinePreviewEnabled,
    guideCurrentTime,
    getGuideDuckMultiplier,
    setSourcePreviewPlaying,
  });
  const {
    subtitlePreviewTime,
    subtitlePreviewPlaying,
    subtitlePreviewPhase,
    stopDedicatedSubtitlePreview,
    startDedicatedSubtitlePreview,
    toggleDedicatedSubtitlePreview,
    updateDedicatedSubtitleTime,
    finishDedicatedGuidePreview,
    finishDedicatedAdPreview,
  } = useSubtitlePreview({
    settings: previewSettings,
    media: {
      source: subtitleVideoPreviewRef,
      ad: subtitleAdPreviewRef,
      guide: subtitleAudioPreviewRef,
    },
    otherMedia: timelineMedia,
    layers: {
      sourceAudio: subtitlePreviewSourceAudio,
      guideAudio: subtitlePreviewGuideAudio,
      adAudio: subtitlePreviewAdAudio,
    },
    adAudioEnabled,
    adVolume,
    getGuideDuckMultiplier,
    prepareGuideAudio: (audio) => {
      applyGuidePlaybackRate(audio, guidePlaybackRate);
      ensureAudioPreviewGain(audio, subtitleAudioGraphRef);
    },
  });

  const activeSubtitleCue = subtitleSettings.enabled
    ? subtitleSettings.cues.find(
        (cue) => guideCurrentTime >= cue.start && guideCurrentTime < cue.end,
      )
    : undefined;
  const subtitlePreviewText =
    activeSubtitleCue?.text ||
    subtitleSettings.cues.find((cue) => cue.text.trim())?.text ||
    "广告引导字幕效果预览";
  const dedicatedSubtitleCue =
    subtitleSettings.enabled && subtitlePreviewSubtitles
      ? subtitleSettings.cues.find(
          (cue) =>
            subtitlePreviewTime >= cue.start && subtitlePreviewTime < cue.end,
        )
      : undefined;

  useEffect(() => {
    const ad = adPreviewRef.current;
    if (!ad) return;
    ad.muted = voiceoverEnabled || !adAudioEnabled;
    ad.volume = Math.max(0, Math.min(1, adVolume));
  }, [adAudioEnabled, adVolume, greenScreenUrl, voiceoverEnabled]);

  useEffect(() => {
    for (const [audio, graph] of [
      [guidePreviewRef.current, guideAudioGraphRef.current],
      [subtitleAudioPreviewRef.current, subtitleAudioGraphRef.current],
    ] as const) {
      if (audio) {
        if (graph?.element === audio) {
          graph.gain.gain.setValueAtTime(
            guideVolume,
            graph.context.currentTime,
          );
        } else {
          audio.volume = Math.max(0, Math.min(1, guideVolume));
        }
        applyGuidePlaybackRate(audio, guidePlaybackRate);
      }
    }
    if (guideDuration > 0) {
      setAdVideoDelay((current) =>
        Math.min(current, Math.max(0, guidePlaybackDuration - 0.01)),
      );
    }
  }, [guideVolume, guidePlaybackRate, guideAudioUrl, guidePlaybackDuration]);

  useEffect(
    () => () => {
      const graphs = [
        guideAudioGraphRef.current,
        subtitleAudioGraphRef.current,
      ];
      guideAudioGraphRef.current = null;
      subtitleAudioGraphRef.current = null;
      for (const graph of graphs) {
        if (graph) void graph.context.close().catch(() => undefined);
      }
    },
    [],
  );

  useEffect(() => {
    saveAdPlacementDraft({
      sourceVideo,
      adVideo: greenScreenVideo,
      guideAudio,
      guideMode,
      adVideoDelay,
      guidePauseSource,
      guideVolume,
      guidePlaybackRate,
      sourceVolumeDuringGuide,
      guideVolumeTransitionDuration,
      adTrimStart,
      adTrimEnd,
      startAt,
      mode,
      pauseSource,
      x,
      y,
      width,
      autoCenterPlacement,
      keyColor,
      similarity,
      blend,
      adAudioEnabled,
      adVolume,
      sourceVolumeDuringAd,
      timelinePreviewEnabled,
      subtitlePreviewSourceAudio,
      subtitlePreviewGuideAudio,
      subtitlePreviewSubtitles,
      subtitlePreviewAdVideo,
      subtitlePreviewAdAudio,
      lastTaskId,
    });
  }, [
    sourceVideo,
    greenScreenVideo,
    guideAudio,
    guideMode,
    adVideoDelay,
    guidePauseSource,
    guideVolume,
    guidePlaybackRate,
    sourceVolumeDuringGuide,
    guideVolumeTransitionDuration,
    adTrimStart,
    adTrimEnd,
    startAt,
    mode,
    pauseSource,
    x,
    y,
    width,
    autoCenterPlacement,
    keyColor,
    similarity,
    blend,
    adAudioEnabled,
    adVolume,
    sourceVolumeDuringAd,
    timelinePreviewEnabled,
    subtitlePreviewSourceAudio,
    subtitlePreviewGuideAudio,
    subtitlePreviewSubtitles,
    subtitlePreviewAdVideo,
    subtitlePreviewAdAudio,
    lastTaskId,
  ]);

  useEffect(() => {
    if (!autoCenterPlacement) return;
    setX(Math.max(-5, Math.min(1, (1 - width) / 2)));
    setY(Math.max(-5, Math.min(1, (1 - adNormalizedHeight) / 2)));
  }, [autoCenterPlacement, width, adNormalizedHeight]);

  const previewAdMaterialOnly = () => {
    const video = adMaterialPreviewRef.current;
    if (!video) return;
    if (
      video.currentTime < adTrimStart ||
      video.currentTime >= resolvedAdTrimEnd - 0.03
    ) {
      video.currentTime = adTrimStart;
    }
  };

  const stopAdMaterialAtRangeEnd = () => {
    const video = adMaterialPreviewRef.current;
    if (!video || video.currentTime + 0.03 < resolvedAdTrimEnd) return;
    video.pause();
    video.currentTime = adTrimStart;
  };

  const updateWidthKeepingCenter = (nextWidth: number) => {
    const normalizedWidth = Math.min(5, Math.max(0.05, nextWidth));
    if (autoCenterPlacement) {
      setWidth(normalizedWidth);
      return;
    }
    const heightRatio =
      (sourceSize.width / Math.max(sourceSize.height, 1)) *
      (adSize.height / Math.max(adSize.width, 1));
    const widthDelta = normalizedWidth - width;
    const heightDelta = widthDelta * heightRatio;
    setX((current) => Math.min(1, Math.max(-5, current - widthDelta / 2)));
    setY((current) => Math.min(1, Math.max(-5, current - heightDelta / 2)));
    setWidth(normalizedWidth);
  };

  const importChromaTestSettings = () => {
    const settings = loadAdChromaTestSettings();
    setKeyColor(settings.keyColor);
    setSimilarity(settings.similarity);
    setBlend(settings.blend);
    toast.success(
      `已导入抠绿参数：${settings.keyColor} / 容差 ${settings.similarity.toFixed(2)} / 融合 ${settings.blend.toFixed(2)}`,
    );
  };

  const applyPreset = (preset: PositionPreset) => {
    setAutoCenterPlacement(false);
    const margin = 0.04;
    const nextX = preset.endsWith("left")
      ? margin
      : preset.endsWith("right")
        ? 1 - margin - width
        : (1 - width) / 2;
    const nextY = preset.startsWith("top")
      ? margin
      : preset.startsWith("bottom")
        ? 1 - margin - adNormalizedHeight
        : (1 - adNormalizedHeight) / 2;
    setX(Math.max(-5, Math.min(1, nextX)));
    setY(Math.max(-5, Math.min(1, nextY)));
  };

  const submit = async () => {
    if (!sourceVideo || !greenScreenVideo) {
      toast.warning("请先选择无广告母版和广告视频");
      return;
    }
    if (sourceDuration > 0 && startAt >= sourceDuration) {
      toast.warning("广告开始时间必须小于母版时长");
      return;
    }
    if (selectedAdDuration < 0.01) {
      toast.warning("请等待广告时长读取完成，并选择有效的广告视频范围");
      return;
    }
    setSubmitting(true);
    setLastTaskId("");
    try {
      const payload = await createAdRenderTask({
        mode,
        sourceVideo,
        adVideo: greenScreenVideo,
        startAt,
        adRange: {
          start: adTrimStart,
          end: resolvedAdTrimEnd,
        },
        pauseSource: effectivePauseSource,
        placement: { x, y, width },
        chromaKey: {
          color: keyColor.replace("#", "0x"),
          similarity,
          blend,
        },
        audio: {
          enabled: voiceoverEnabled ? false : adAudioEnabled,
          volume: adVolume,
          sourceVolumeDuringAd,
        },
        leadInAudio: {
          path: guideAudio,
          mode: voiceoverEnabled ? "voiceover" : "prelude",
          adVideoDelay,
          pauseSource: guidePauseSource,
          volume: guideVolume,
          playbackRate: guidePlaybackRate,
          sourceVolume: sourceVolumeDuringGuide,
          volumeTransitionDuration: guideVolumeTransitionDuration,
          subtitles: {
            ...subtitleSettings,
            enabled: Boolean(guideAudio) && subtitleSettings.enabled,
          },
        },
      });
      setLastTaskId(payload.task?.id || "");
      toast.success(`广告合成任务已加入队列：${payload.task?.id || ""}`);
    } catch (error: any) {
      toast.error(error.message || "提交广告合成任务失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGuidePreviewOnLoadedMetadata = (
    event: React.SyntheticEvent<HTMLAudioElement>,
  ) => {
    const duration = event.currentTarget.duration;
    if (Number.isFinite(duration)) {
      setGuideDuration(duration);
      setAdVideoDelay((current) =>
        Math.min(current, Math.max(0, duration / guidePlaybackRate - 0.01)),
      );
    }
  };

  const handleGuidePreviewOnPlay = (
    event: React.SyntheticEvent<HTMLAudioElement>,
  ) => {
    ensureAudioPreviewGain(event.currentTarget, guideAudioGraphRef);
    startVoiceoverAdIfNeeded();
  };

  const handleGuidePreviewOnTimeUpdate = (
    event: React.SyntheticEvent<HTMLAudioElement>,
  ) => {
    setGuideCurrentTime(event.currentTarget.currentTime);
    startVoiceoverAdIfNeeded();
  };

  const handleGuidePreviewOnSeeked = (
    event: React.SyntheticEvent<HTMLAudioElement>,
  ) => setGuideCurrentTime(event.currentTarget.currentTime);

  const handleGuidePreviewOnEnded = () => {
    setGuideCurrentTime(0);
    finishGuidePreview();
  };

  const handleSourcePreviewOnPlay = () => {
    setSourcePreviewPlaying(true);
    if (timelinePreviewEnabled) startPausedAdPreviewIfNeeded();
  };

  const handleSourcePreviewOnTimeUpdate = () => {
    if (timelinePreviewEnabled) startPausedAdPreviewIfNeeded();
  };

  const handleSourcePreviewOnEnded = () => setSourcePreviewPlaying(false);

  const handleSourcePreviewOnVolumeChange = (
    event: React.SyntheticEvent<HTMLVideoElement>,
  ) => handleSourceVolumeChange(event.currentTarget);

  const handleSourcePreviewOnLoadedMetadata = (
    event: React.SyntheticEvent<HTMLVideoElement>,
  ) => {
    const duration = event.currentTarget.duration;
    if (Number.isFinite(duration)) setSourceDuration(duration);
    setSourceSize({
      width: event.currentTarget.videoWidth || 16,
      height: event.currentTarget.videoHeight || 9,
    });
  };

  const handleAdPreviewOnLoadedMetadata = (
    event: React.SyntheticEvent<HTMLVideoElement>,
  ) => {
    const duration = event.currentTarget.duration;
    if (Number.isFinite(duration)) {
      setAdDuration(duration);
      const restoringSameMaterial =
        adMetadataPathRef.current === greenScreenVideo;
      if (restoringSameMaterial) {
        setAdTrimStart((current) =>
          Math.min(Math.max(0, current), Math.max(0, duration - 0.01)),
        );
        setAdTrimEnd((current) =>
          current > 0 ? Math.min(duration, Math.max(0.01, current)) : duration,
        );
      } else {
        setAdTrimStart(0);
        setAdTrimEnd(duration);
      }
      adMetadataPathRef.current = greenScreenVideo;
    }
    setAdSize({
      width: event.currentTarget.videoWidth || 16,
      height: event.currentTarget.videoHeight || 9,
    });
    resetPreviewAfterSeek();
  };

  const handleSubtitleEditorGetGuideCurrentTime = () =>
    guidePreviewRef.current?.currentTime;

  const handleSubtitleEditorSeekGuideAudio = (time: number) => {
    const audio = guidePreviewRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setGuideCurrentTime(time);
    void audio.play().catch(() => undefined);
  };

  const handleSubtitleVideoPreviewOnLoadedMetadata = (
    event: React.SyntheticEvent<HTMLVideoElement>,
  ) => {
    event.currentTarget.currentTime = Math.min(
      startAt,
      Math.max(0, event.currentTarget.duration - 0.01),
    );
  };

  const handleSubtitleAdPreviewOnLoadedMetadata = (
    event: React.SyntheticEvent<HTMLVideoElement>,
  ) => {
    event.currentTarget.currentTime = adTrimStart;
  };

  const handleSubtitleAudioPreviewOnPlay = (
    event: React.SyntheticEvent<HTMLAudioElement>,
  ) => ensureAudioPreviewGain(event.currentTarget, subtitleAudioGraphRef);

  const handleSubtitleAudioPreviewOnTimeUpdate = (
    event: React.SyntheticEvent<HTMLAudioElement>,
  ) => updateDedicatedSubtitleTime(event.currentTarget);

  return {
    state: {
      loading,
      mode,
      renderedVideos,
      sourceVideo,
      selectedSource,
      greenScreenVideos,
      greenScreenVideo,
      greenScreenUrl,
      guideAudios,
      guideAudio,
      guideAudioUrl,
      guideMode,
      voiceoverEnabled,
      guidePlaybackDuration,
      adVideoDelay,
      guidePauseSource,
      sourceVolumeDuringGuide,
      guideVolumeTransitionDuration,
      guideVolume,
      guidePlaybackRate,
      sourceDuration,
      startAt,
      adDuration,
      adTrimStart,
      resolvedAdTrimEnd,
      selectedAdDuration,
      pauseSource,
      guideDuration,
      estimatedDuration,
      sourceUrl,
      timelinePreviewEnabled,
      sourcePreviewPlaying,
      previewMaxWidth,
      sourceSize,
      width,
      x,
      y,
      previewPhase,
      previewPauseActive,
      activeSubtitleCue,
      subtitleSettings,
      adNormalizedHeight,
      autoCenterPlacement,
      subtitlePreviewText,
      subtitlePreviewSourceAudio,
      subtitlePreviewGuideAudio,
      subtitlePreviewSubtitles,
      subtitlePreviewAdVideo,
      adAudioEnabled,
      subtitlePreviewAdAudio,
      subtitlePreviewPhase,
      dedicatedSubtitleCue,
      subtitlePreviewPlaying,
      subtitlePreviewTime,
      keyColor,
      similarity,
      blend,
      adVolume,
      sourceVolumeDuringAd,
      effectivePauseSource,
      submitting,
      lastTaskId,
    },
    actions: {
      loadVideos,
      setMode,
      setSourceVideo,
      pickVideo,
      setGreenScreenVideo,
      previewAdMaterialOnly,
      stopAdMaterialAtRangeEnd,
      changeGuideAudio,
      pickGuideAudio,
      handleGuidePreviewOnLoadedMetadata,
      handleGuidePreviewOnPlay,
      handleGuidePreviewOnTimeUpdate,
      handleGuidePreviewOnSeeked,
      handleGuidePreviewOnEnded,
      setGuideMode,
      setAdVideoDelay,
      setGuidePauseSource,
      setSourceVolumeDuringGuide,
      setGuideVolumeTransitionDuration,
      setGuideVolume,
      setGuidePlaybackRate,
      setStartAt,
      setAdTrimStart,
      setAdTrimEnd,
      setPauseSource,
      stopTimelinePreview,
      setTimelinePreviewEnabled,
      restartTimelinePreview,
      handleSourcePreviewOnPlay,
      handleSourcePreviewOnTimeUpdate,
      resetPreviewAfterSeek,
      handleSourcePause,
      handleSourcePreviewOnEnded,
      handleSourcePreviewOnVolumeChange,
      handleSourcePreviewOnLoadedMetadata,
      handleAdPreviewOnLoadedMetadata,
      finishAdRangeIfNeeded,
      finishPausedAdPreview,
      setAutoCenterPlacement,
      setX,
      setY,
      updateWidthKeepingCenter,
      applyPreset,
      setSubtitleSettings,
      importSrt,
      exportSrt,
      addSubtitleCue,
      updateSubtitleCue,
      handleSubtitleEditorGetGuideCurrentTime,
      handleSubtitleEditorSeekGuideAudio,
      setSubtitlePreviewSourceAudio,
      setSubtitlePreviewGuideAudio,
      setSubtitlePreviewSubtitles,
      setSubtitlePreviewAdVideo,
      setSubtitlePreviewAdAudio,
      handleSubtitleVideoPreviewOnLoadedMetadata,
      handleSubtitleAdPreviewOnLoadedMetadata,
      finishDedicatedAdPreview,
      handleSubtitleAudioPreviewOnPlay,
      handleSubtitleAudioPreviewOnTimeUpdate,
      finishDedicatedGuidePreview,
      startDedicatedSubtitlePreview,
      toggleDedicatedSubtitlePreview,
      stopDedicatedSubtitlePreview,
      importChromaTestSettings,
      setKeyColor,
      setSimilarity,
      setBlend,
      setAdAudioEnabled,
      setAdVolume,
      setSourceVolumeDuringAd,
      submit,
    },
    media: {
      adMaterialPreviewRef,
      guidePreviewRef,
      sourcePreviewRef,
      adPreviewRef,
      subtitleVideoPreviewRef,
      subtitleAdPreviewRef,
      subtitleAudioPreviewRef,
    },
  };
}
