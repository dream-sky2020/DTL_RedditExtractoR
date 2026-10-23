import { useEffect, useRef, useState } from "react";
import { DEFAULT_AD_PLACEMENT_DRAFT as draft } from "@/utils/adPlacementDraft";
import { DEFAULT_AD_SUBTITLE_SETTINGS } from "@/utils/adSubtitleSettings";
import type {
  AdPlacementActions,
  AdPlacementState,
  AdPlacementViewProps,
} from "./AdPlacementView";
import { calculateAdTimeline } from "./calculations/timeline";

// In-memory preview data only; never imports the production controller.
export const emptyAdPlacementState: AdPlacementState = {
  ...draft,
  loading: false,
  mode: draft.mode,
  renderedVideos: [],
  sourceVideo: "",
  selectedSource: undefined,
  greenScreenVideos: [],
  greenScreenVideo: "",
  greenScreenUrl: "",
  guideAudios: [],
  guideAudio: "",
  guideAudioUrl: "",
  guideMode: draft.guideMode,
  voiceoverEnabled: false,
  guidePlaybackDuration: 0,
  sourceDuration: 0,
  adDuration: 0,
  resolvedAdTrimEnd: 0,
  selectedAdDuration: 0,
  guideDuration: 0,
  estimatedDuration: 0,
  sourceUrl: "",
  sourcePreviewPlaying: false,
  previewMaxWidth: 720,
  sourceSize: { width: 320, height: 180 },
  previewPhase: "idle",
  previewPauseActive: false,
  activeSubtitleCue: undefined,
  subtitleSettings: {
    ...DEFAULT_AD_SUBTITLE_SETTINGS,
    style: { ...DEFAULT_AD_SUBTITLE_SETTINGS.style },
    cues: [],
  },
  adNormalizedHeight: (0.25 * 320) / 180,
  subtitlePreviewText: "广告引导字幕效果预览",
  subtitlePreviewPhase: "idle",
  dedicatedSubtitleCue: undefined,
  subtitlePreviewPlaying: false,
  subtitlePreviewTime: 0,
  effectivePauseSource: false,
  submitting: false,
};

const master = {
  name: "示范母版.webm",
  path: "/demo-master.webm",
  url: "/demo-master.webm",
  size: 24000,
};
const ad = {
  name: "示范广告.webm",
  path: "/demo-ad.webm",
  url: "/demo-ad.webm",
  size: 4000,
};
const guide = {
  name: "示范引导音频.wav",
  path: "/demo-guide.wav",
  url: "/demo-guide.wav",
  size: 96000,
};

export const readyAdPlacementState: AdPlacementState = {
  ...emptyAdPlacementState,
  renderedVideos: [master],
  sourceVideo: master.path,
  selectedSource: master,
  sourceUrl: master.url,
  greenScreenVideos: [ad],
  greenScreenVideo: ad.path,
  greenScreenUrl: ad.url,
  guideAudios: [guide],
  sourceDuration: 8,
  adDuration: 4,
  resolvedAdTrimEnd: 4,
  selectedAdDuration: 4,
  startAt: 2,
  estimatedDuration: 8,
  subtitleSettings: {
    ...emptyAdPlacementState.subtitleSettings,
    cues: [
      {
        id: "demo-subtitle",
        start: 0,
        end: 2.5,
        text: "这是一条示范字幕\n可以调整字体、颜色和位置。",
      },
    ],
  },
  subtitlePreviewText: "这是一条示范字幕\n可以调整字体、颜色和位置。",
};

export function useAdPlacementStoryModel(
  initialState: AdPlacementState,
): AdPlacementViewProps {
  const [state, setState] = useState(initialState);
  useEffect(() => setState(initialState), [initialState]);
  const media = {
    adMaterialPreviewRef: useRef<HTMLVideoElement | null>(null),
    guidePreviewRef: useRef<HTMLAudioElement | null>(null),
    sourcePreviewRef: useRef<HTMLVideoElement | null>(null),
    adPreviewRef: useRef<HTMLVideoElement | null>(null),
    subtitleVideoPreviewRef: useRef<HTMLVideoElement | null>(null),
    subtitleAdPreviewRef: useRef<HTMLVideoElement | null>(null),
    subtitleAudioPreviewRef: useRef<HTMLAudioElement | null>(null),
  };
  const actions: AdPlacementActions = {
    loadVideos: async () => {},
    setMode: (value) =>
      setState((current) => ({
        ...current,
        mode: typeof value === "function" ? value(current.mode) : value,
      })),
    setSourceVideo: (value) =>
      setState((current) => ({
        ...current,
        sourceVideo:
          typeof value === "function" ? value(current.sourceVideo) : value,
      })),
    pickVideo: async () => {},
    setGreenScreenVideo: (value) =>
      setState((current) => ({
        ...current,
        greenScreenVideo:
          typeof value === "function" ? value(current.greenScreenVideo) : value,
      })),
    previewAdMaterialOnly: () => {},
    stopAdMaterialAtRangeEnd: () => {},
    changeGuideAudio: () => {},
    pickGuideAudio: async () => {},
    handleGuidePreviewOnLoadedMetadata: () => {},
    handleGuidePreviewOnPlay: () => {},
    handleGuidePreviewOnTimeUpdate: () => {},
    handleGuidePreviewOnSeeked: () => {},
    handleGuidePreviewOnEnded: () => {},
    setGuideMode: (value) =>
      setState((current) => ({
        ...current,
        guideMode:
          typeof value === "function" ? value(current.guideMode) : value,
      })),
    setAdVideoDelay: (value) =>
      setState((current) => ({
        ...current,
        adVideoDelay:
          typeof value === "function" ? value(current.adVideoDelay) : value,
      })),
    setGuidePauseSource: (value) =>
      setState((current) => ({
        ...current,
        guidePauseSource:
          typeof value === "function" ? value(current.guidePauseSource) : value,
      })),
    setSourceVolumeDuringGuide: (value) =>
      setState((current) => ({
        ...current,
        sourceVolumeDuringGuide:
          typeof value === "function"
            ? value(current.sourceVolumeDuringGuide)
            : value,
      })),
    setGuideVolumeTransitionDuration: (value) =>
      setState((current) => ({
        ...current,
        guideVolumeTransitionDuration:
          typeof value === "function"
            ? value(current.guideVolumeTransitionDuration)
            : value,
      })),
    setGuideVolume: (value) =>
      setState((current) => ({
        ...current,
        guideVolume:
          typeof value === "function" ? value(current.guideVolume) : value,
      })),
    setGuidePlaybackRate: (value) =>
      setState((current) => ({
        ...current,
        guidePlaybackRate:
          typeof value === "function"
            ? value(current.guidePlaybackRate)
            : value,
      })),
    setStartAt: (value) =>
      setState((current) => ({
        ...current,
        startAt: typeof value === "function" ? value(current.startAt) : value,
      })),
    setAdTrimStart: (value) =>
      setState((current) => ({
        ...current,
        adTrimStart:
          typeof value === "function" ? value(current.adTrimStart) : value,
      })),
    setAdTrimEnd: (value) =>
      setState((current) => ({
        ...current,
        resolvedAdTrimEnd:
          typeof value === "function"
            ? value(current.resolvedAdTrimEnd)
            : value,
      })),
    setPauseSource: (value) =>
      setState((current) => ({
        ...current,
        pauseSource:
          typeof value === "function" ? value(current.pauseSource) : value,
      })),
    stopTimelinePreview: () => {},
    setTimelinePreviewEnabled: (value) =>
      setState((current) => ({
        ...current,
        timelinePreviewEnabled:
          typeof value === "function"
            ? value(current.timelinePreviewEnabled)
            : value,
      })),
    restartTimelinePreview: () => {},
    handleSourcePreviewOnPlay: () => {},
    handleSourcePreviewOnTimeUpdate: () => {},
    resetPreviewAfterSeek: () => {},
    handleSourcePause: () => {},
    handleSourcePreviewOnEnded: () => {},
    handleSourcePreviewOnVolumeChange: () => {},
    handleSourcePreviewOnLoadedMetadata: () => {},
    handleAdPreviewOnLoadedMetadata: () => {},
    finishAdRangeIfNeeded: () => {},
    finishPausedAdPreview: () => {},
    setAutoCenterPlacement: (value) =>
      setState((current) => ({
        ...current,
        autoCenterPlacement:
          typeof value === "function"
            ? value(current.autoCenterPlacement)
            : value,
      })),
    setX: (value) =>
      setState((current) => ({
        ...current,
        x: typeof value === "function" ? value(current.x) : value,
      })),
    setY: (value) =>
      setState((current) => ({
        ...current,
        y: typeof value === "function" ? value(current.y) : value,
      })),
    updateWidthKeepingCenter: () => {},
    applyPreset: () => {},
    setSubtitleSettings: (value) =>
      setState((current) => ({
        ...current,
        subtitleSettings:
          typeof value === "function" ? value(current.subtitleSettings) : value,
      })),
    importSrt: async () => {},
    exportSrt: () => {},
    addSubtitleCue: () => {},
    updateSubtitleCue: () => {},
    handleSubtitleEditorGetGuideCurrentTime: () => 0,
    handleSubtitleEditorSeekGuideAudio: () => {},
    setSubtitlePreviewSourceAudio: (value) =>
      setState((current) => ({
        ...current,
        subtitlePreviewSourceAudio:
          typeof value === "function"
            ? value(current.subtitlePreviewSourceAudio)
            : value,
      })),
    setSubtitlePreviewGuideAudio: (value) =>
      setState((current) => ({
        ...current,
        subtitlePreviewGuideAudio:
          typeof value === "function"
            ? value(current.subtitlePreviewGuideAudio)
            : value,
      })),
    setSubtitlePreviewSubtitles: (value) =>
      setState((current) => ({
        ...current,
        subtitlePreviewSubtitles:
          typeof value === "function"
            ? value(current.subtitlePreviewSubtitles)
            : value,
      })),
    setSubtitlePreviewAdVideo: (value) =>
      setState((current) => ({
        ...current,
        subtitlePreviewAdVideo:
          typeof value === "function"
            ? value(current.subtitlePreviewAdVideo)
            : value,
      })),
    setSubtitlePreviewAdAudio: (value) =>
      setState((current) => ({
        ...current,
        subtitlePreviewAdAudio:
          typeof value === "function"
            ? value(current.subtitlePreviewAdAudio)
            : value,
      })),
    handleSubtitleVideoPreviewOnLoadedMetadata: () => {},
    handleSubtitleAdPreviewOnLoadedMetadata: () => {},
    finishDedicatedAdPreview: () => {},
    handleSubtitleAudioPreviewOnPlay: () => {},
    handleSubtitleAudioPreviewOnTimeUpdate: () => {},
    finishDedicatedGuidePreview: () => {},
    startDedicatedSubtitlePreview: () => {},
    toggleDedicatedSubtitlePreview: () => {},
    stopDedicatedSubtitlePreview: () => {},
    importChromaTestSettings: () => {},
    setKeyColor: (value) =>
      setState((current) => ({
        ...current,
        keyColor: typeof value === "function" ? value(current.keyColor) : value,
      })),
    setSimilarity: (value) =>
      setState((current) => ({
        ...current,
        similarity:
          typeof value === "function" ? value(current.similarity) : value,
      })),
    setBlend: (value) =>
      setState((current) => ({
        ...current,
        blend: typeof value === "function" ? value(current.blend) : value,
      })),
    setAdAudioEnabled: (value) =>
      setState((current) => ({
        ...current,
        adAudioEnabled:
          typeof value === "function" ? value(current.adAudioEnabled) : value,
      })),
    setAdVolume: (value) =>
      setState((current) => ({
        ...current,
        adVolume: typeof value === "function" ? value(current.adVolume) : value,
      })),
    setSourceVolumeDuringAd: (value) =>
      setState((current) => ({
        ...current,
        sourceVolumeDuringAd:
          typeof value === "function"
            ? value(current.sourceVolumeDuringAd)
            : value,
      })),
    submit: async () => {},
  };
  actions.changeGuideAudio = (path) =>
    setState((current) => ({
      ...current,
      guideAudio: path,
      guideDuration: path ? 3 : 0,
    }));
  actions.updateWidthKeepingCenter = (width) =>
    setState((current) => ({
      ...current,
      width,
      x: current.x - (width - current.width) / 2,
      y:
        current.y -
        ((width - current.width) * current.sourceSize.width) /
          current.sourceSize.height /
          2,
    }));
  actions.applyPreset = (preset) =>
    setState((current) => ({
      ...current,
      autoCenterPlacement: false,
      x: preset.endsWith("left") ? 0.04 : 1 - 0.04 - current.width,
      y: preset.startsWith("top")
        ? 0.04
        : 1 - 0.04 - current.adNormalizedHeight,
    }));
  actions.updateSubtitleCue = (id, patch) =>
    setState((current) => ({
      ...current,
      subtitleSettings: {
        ...current.subtitleSettings,
        cues: current.subtitleSettings.cues.map((cue) =>
          cue.id === id ? { ...cue, ...patch } : cue,
        ),
      },
    }));
  actions.addSubtitleCue = () =>
    setState((current) => ({
      ...current,
      subtitleSettings: {
        ...current.subtitleSettings,
        cues: [
          ...current.subtitleSettings.cues,
          {
            id: "demo-" + current.subtitleSettings.cues.length,
            start: 0,
            end: 2,
            text: "新字幕",
          },
        ],
      },
    }));
  actions.submit = async () =>
    setState((current) => ({ ...current, lastTaskId: "demo0001" }));
  const timeline = calculateAdTimeline({
    sourceDuration: state.sourceDuration,
    adDuration: state.adDuration,
    adTrimStart: state.adTrimStart,
    adTrimEnd: state.resolvedAdTrimEnd || undefined,
    startAt: state.startAt,
    pauseSource: state.pauseSource,
    leadEnabled: Boolean(state.guideAudio),
    leadDuration: state.guideDuration,
    leadPlaybackRate: state.guidePlaybackRate,
    leadMode: state.guideMode,
    adVideoDelay: state.adVideoDelay,
    leadPauseSource: state.guidePauseSource,
  });
  const normalizedHeight =
    (state.width * state.sourceSize.width) / state.sourceSize.height;
  return {
    actions,
    media,
    state: {
      ...state,
      sourceUrl: state.sourceVideo ? master.url : "",
      greenScreenUrl: state.greenScreenVideo ? ad.url : "",
      guideAudioUrl: state.guideAudio ? guide.url : "",
      selectedSource: state.renderedVideos.find(
        (item) => item.path === state.sourceVideo,
      ),
      voiceoverEnabled:
        Boolean(state.guideAudio) && state.guideMode === "voiceover",
      selectedAdDuration: timeline.adDuration,
      estimatedDuration: timeline.outputDuration,
      guidePlaybackDuration: timeline.leadPlaybackDuration,
      effectivePauseSource: state.pauseSource,
      adNormalizedHeight: normalizedHeight,
      ...(state.autoCenterPlacement
        ? { x: (1 - state.width) / 2, y: (1 - normalizedHeight) / 2 }
        : {}),
    },
  };
}
