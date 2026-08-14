import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  ColorPicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Radio,
  Row,
  Select,
  Slider,
  Space,
  Switch,
  Tag,
  Typography,
} from 'antd';
import {
  AimOutlined,
  FolderOpenOutlined,
  ReloadOutlined,
  RocketOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { toast } from '@components/Toast';
import { loadAdChromaTestSettings } from '@/utils/adChromaSettings';
import {
  AdSubtitleCue,
  AdSubtitleSettings,
  createAdSubtitleCue,
  loadAdSubtitleSettings,
  parseSrt,
  saveAdSubtitleSettings,
  serializeSrt,
} from '@/utils/adSubtitleSettings';

const { Paragraph, Text, Title } = Typography;
const API_BASE = 'http://localhost:5000';

interface VideoItem {
  name: string;
  path: string;
  url: string;
  size?: number;
  updatedAt?: string;
}

type PositionPreset = 'top-left' | 'top-right' | 'center' | 'bottom-left' | 'bottom-right';
type AdMode = 'chroma-key' | 'plain-overlay';
type GuideAudioMode = 'prelude' | 'voiceover';
type AudioPreviewGraph = {
  element: HTMLAudioElement;
  context: AudioContext;
  gain: GainNode;
};

const getVideoUrl = (path?: string) =>
  path ? `${API_BASE}/proxy_local_video?path=${encodeURIComponent(path)}` : '';
const getAudioUrl = (path?: string) =>
  path ? `${API_BASE}/proxy_local_audio?path=${encodeURIComponent(path)}` : '';
const isGeneratedAdComposite = (path: string) => /-ad-[0-9a-f]{8}/i.test(path);

const applyGuidePlaybackRate = (audio: HTMLAudioElement, rate: number) => {
  audio.playbackRate = Math.min(2, Math.max(0.5, rate));
  try {
    audio.preservesPitch = true;
  } catch {
    // Older browsers may expose only the vendor-prefixed property.
  }
  const legacyAudio = audio as HTMLAudioElement & { webkitPreservesPitch?: boolean };
  if (typeof legacyAudio.webkitPreservesPitch === 'boolean') legacyAudio.webkitPreservesPitch = true;
};

const formatBytes = (size?: number) => {
  if (!size) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = size;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
};

export const AdPlacementPage: React.FC = () => {
  const [renderedVideos, setRenderedVideos] = useState<VideoItem[]>([]);
  const [greenScreenVideos, setGreenScreenVideos] = useState<VideoItem[]>([]);
  const [guideAudios, setGuideAudios] = useState<VideoItem[]>([]);
  const [sourceVideo, setSourceVideo] = useState('');
  const [greenScreenVideo, setGreenScreenVideo] = useState('');
  const [guideAudio, setGuideAudio] = useState('');
  const [guideDuration, setGuideDuration] = useState(0);
  const [guideMode, setGuideMode] = useState<GuideAudioMode>('prelude');
  const [adVideoDelay, setAdVideoDelay] = useState(1);
  const [guidePauseSource, setGuidePauseSource] = useState(false);
  const [guideVolume, setGuideVolume] = useState(1);
  const [guidePlaybackRate, setGuidePlaybackRate] = useState(1);
  const [subtitleSettings, setSubtitleSettings] = useState<AdSubtitleSettings>(() => loadAdSubtitleSettings());
  const [guideCurrentTime, setGuideCurrentTime] = useState(0);
  const [subtitlePreviewTime, setSubtitlePreviewTime] = useState(0);
  const [subtitlePreviewPlaying, setSubtitlePreviewPlaying] = useState(false);
  const [subtitlePreviewPhase, setSubtitlePreviewPhase] = useState<'idle' | 'lead' | 'ad' | 'done'>('idle');
  const [subtitlePreviewSourceAudio, setSubtitlePreviewSourceAudio] = useState(false);
  const [subtitlePreviewGuideAudio, setSubtitlePreviewGuideAudio] = useState(true);
  const [subtitlePreviewSubtitles, setSubtitlePreviewSubtitles] = useState(true);
  const [subtitlePreviewAdVideo, setSubtitlePreviewAdVideo] = useState(false);
  const [subtitlePreviewAdAudio, setSubtitlePreviewAdAudio] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sourceDuration, setSourceDuration] = useState(0);
  const [sourceSize, setSourceSize] = useState({ width: 16, height: 9 });
  const [adSize, setAdSize] = useState({ width: 16, height: 9 });
  const [adDuration, setAdDuration] = useState(0);
  const [adTrimStart, setAdTrimStart] = useState(0);
  const [adTrimEnd, setAdTrimEnd] = useState(0);
  const [startAt, setStartAt] = useState(0);
  const [mode, setMode] = useState<AdMode>('chroma-key');
  const [pauseSource, setPauseSource] = useState(false);
  const [x, setX] = useState(0.71);
  const [y, setY] = useState(0.66);
  const [width, setWidth] = useState(0.25);
  const [autoCenterPlacement, setAutoCenterPlacement] = useState(false);
  const [keyColor, setKeyColor] = useState('#00ff00');
  const [similarity, setSimilarity] = useState(0.3);
  const [blend, setBlend] = useState(0.08);
  const [adAudioEnabled, setAdAudioEnabled] = useState(true);
  const [adVolume, setAdVolume] = useState(1);
  const [sourceVolumeDuringAd, setSourceVolumeDuringAd] = useState(0.25);
  const [lastTaskId, setLastTaskId] = useState('');
  const [previewPauseActive, setPreviewPauseActive] = useState(false);
  const [timelinePreviewEnabled, setTimelinePreviewEnabled] = useState(false);
  const [sourcePreviewPlaying, setSourcePreviewPlaying] = useState(false);
  const [previewPhase, setPreviewPhase] = useState<'idle' | 'lead' | 'ad' | 'done'>('idle');
  const sourcePreviewRef = useRef<HTMLVideoElement | null>(null);
  const adPreviewRef = useRef<HTMLVideoElement | null>(null);
  const adMaterialPreviewRef = useRef<HTMLVideoElement | null>(null);
  const guidePreviewRef = useRef<HTMLAudioElement | null>(null);
  const guideAudioGraphRef = useRef<AudioPreviewGraph | null>(null);
  const subtitleVideoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const subtitleAdPreviewRef = useRef<HTMLVideoElement | null>(null);
  const subtitleAudioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const subtitleAudioGraphRef = useRef<AudioPreviewGraph | null>(null);
  const subtitlePreviewPhaseRef = useRef<'idle' | 'lead' | 'ad' | 'done'>('idle');
  const pausePreviewActiveRef = useRef(false);
  const pausePreviewCompletedRef = useRef(false);
  const previewPhaseRef = useRef<'idle' | 'lead' | 'ad' | 'done'>('idle');
  const sourceBaseVolumeRef = useRef(1);
  const adStartSourceTimeRef = useRef(0);

  const sourceUrl = getVideoUrl(sourceVideo);
  const greenScreenUrl = getVideoUrl(greenScreenVideo);
  const guideAudioUrl = getAudioUrl(guideAudio);
  const voiceoverEnabled = Boolean(guideAudio) && guideMode === 'voiceover';
  const effectivePauseSource = pauseSource;
  const adNormalizedHeight = width
    * (sourceSize.width / Math.max(sourceSize.height, 1))
    * (adSize.height / Math.max(adSize.width, 1));
  const resolvedAdTrimEnd = adTrimEnd > 0 ? Math.min(adTrimEnd, adDuration) : adDuration;
  const selectedAdDuration = Math.max(0, resolvedAdTrimEnd - adTrimStart);
  const guidePlaybackDuration = guideDuration / guidePlaybackRate;
  const voiceoverLeadDuration = Math.min(guidePlaybackDuration, adVideoDelay + selectedAdDuration);
  const pausedVoiceoverDuration = guidePauseSource && effectivePauseSource
    ? Math.max(voiceoverLeadDuration, adVideoDelay + selectedAdDuration)
    : (guidePauseSource ? voiceoverLeadDuration : 0) + (effectivePauseSource ? selectedAdDuration : 0);
  const estimatedDuration = sourceDuration + (guideAudio
    ? guideMode === 'voiceover'
      ? pausedVoiceoverDuration
      : (guidePauseSource ? guidePlaybackDuration : 0) + (effectivePauseSource ? selectedAdDuration : 0)
    : (effectivePauseSource ? selectedAdDuration : 0));
  const selectedSource = useMemo(
    () => renderedVideos.find((item) => item.path === sourceVideo),
    [renderedVideos, sourceVideo]
  );
  const previewMaxWidth = Math.max(1, Math.min(
    720,
    sourceSize.width,
    Math.round(520 * sourceSize.width / Math.max(sourceSize.height, 1)),
  ));
  const activeSubtitleCue = subtitleSettings.enabled
    ? subtitleSettings.cues.find((cue) => guideCurrentTime >= cue.start && guideCurrentTime < cue.end)
    : undefined;
  const subtitlePreviewText = activeSubtitleCue?.text
    || subtitleSettings.cues.find((cue) => cue.text.trim())?.text
    || '广告引导字幕效果预览';
  const dedicatedSubtitleCue = subtitleSettings.enabled && subtitlePreviewSubtitles
    ? subtitleSettings.cues.find((cue) => subtitlePreviewTime >= cue.start && subtitlePreviewTime < cue.end)
    : undefined;

  const ensureAudioPreviewGain = (
    audio: HTMLAudioElement,
    graphRef: React.MutableRefObject<AudioPreviewGraph | null>,
  ) => {
    let graph = graphRef.current;
    if (graph?.element !== audio) {
      if (graph) void graph.context.close().catch(() => undefined);
      const AudioContextConstructor = window.AudioContext
        || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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
    if (graph.context.state === 'suspended') void graph.context.resume().catch(() => undefined);
  };

  const loadVideos = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/ad/videos`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) {
        throw new Error(
          payload.message ||
          `广告素材接口返回 HTTP ${response.status}。请停止旧服务并重新启动本项目的 scripts/server.py。`
        );
      }
      const rendered = (Array.isArray(payload.rendered) ? payload.rendered : [])
        .filter((item: VideoItem) => !isGeneratedAdComposite(item.path));
      const greenScreens = Array.isArray(payload.adVideos)
        ? payload.adVideos
        : Array.isArray(payload.greenScreens) ? payload.greenScreens : [];
      const audios = Array.isArray(payload.guideAudios) ? payload.guideAudios : [];
      setRenderedVideos(rendered);
      setGreenScreenVideos(greenScreens);
      setGuideAudios(audios);
      setSourceVideo((current) => current || rendered[0]?.path || '');
      setGreenScreenVideo((current) => current || greenScreens[0]?.path || '');
    } catch (error: any) {
      toast.warning(error.message || '无法连接本地渲染服务');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadVideos();
  }, []);

  useEffect(() => {
    pausePreviewActiveRef.current = false;
    pausePreviewCompletedRef.current = false;
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
          graph.gain.gain.setValueAtTime(guideVolume, graph.context.currentTime);
        } else {
          audio.volume = Math.max(0, Math.min(1, guideVolume));
        }
        applyGuidePlaybackRate(audio, guidePlaybackRate);
      }
    }
    setAdVideoDelay((current) => Math.min(current, Math.max(0, guidePlaybackDuration - 0.01)));
  }, [guideVolume, guidePlaybackRate, guideAudioUrl, guidePlaybackDuration]);

  useEffect(() => () => {
    const graphs = [guideAudioGraphRef.current, subtitleAudioGraphRef.current];
    guideAudioGraphRef.current = null;
    subtitleAudioGraphRef.current = null;
    for (const graph of graphs) {
      if (graph) void graph.context.close().catch(() => undefined);
    }
  }, []);

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

  useEffect(() => {
    saveAdSubtitleSettings(subtitleSettings);
  }, [subtitleSettings]);

  const updateSubtitleCue = (id: string, patch: Partial<AdSubtitleCue>) => {
    setSubtitleSettings((current) => ({
      ...current,
      cues: current.cues.map((cue) => cue.id === id ? { ...cue, ...patch } : cue),
    }));
  };

  const addSubtitleCue = () => {
    const start = Math.max(0, guidePreviewRef.current?.currentTime ?? 0);
    const end = guideDuration > 0 ? Math.min(guideDuration, start + 2) : start + 2;
    setSubtitleSettings((current) => ({
      ...current,
      cues: [...current.cues, createAdSubtitleCue(start, Math.max(start + 0.01, end))],
    }));
  };

  const importSrt = async () => {
    try {
      const response = await fetch(`${API_BASE}/pick_srt_file`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || '读取 SRT 字幕失败');
      if (!payload.path) return;
      const cues = parseSrt(String(payload.content || ''));
      if (!cues.length) throw new Error('没有识别到有效字幕段，请检查 SRT 时间格式');
      setSubtitleSettings((current) => ({ ...current, enabled: true, cues }));
      toast.success(`已导入 ${cues.length} 条字幕，可继续在面板中编辑`);
    } catch (error: any) {
      toast.warning(error.message || '导入 SRT 字幕失败');
    }
  };

  const exportSrt = () => {
    const validCues = subtitleSettings.cues.filter((cue) => cue.text.trim() && cue.end > cue.start);
    if (!validCues.length) {
      toast.warning('请先添加至少一条有效字幕');
      return;
    }
    const blob = new Blob([`\uFEFF${serializeSrt(validCues)}`], { type: 'application/x-subrip;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ad-guide-subtitles.srt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success('SRT 字幕已导出');
  };

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
    audio.currentTime = 0;
    audio.muted = !subtitlePreviewGuideAudio;
    applyGuidePlaybackRate(audio, guidePlaybackRate);
    ensureAudioPreviewGain(audio, subtitleAudioGraphRef);
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

  useEffect(() => {
    const source = sourcePreviewRef.current;
    if (!source) return;
    const targetVolume = previewPhase === 'ad' && !pauseSource
      ? sourceBaseVolumeRef.current * sourceVolumeDuringAd
      : sourceBaseVolumeRef.current;
    if (Math.abs(source.volume - targetVolume) > 0.01) source.volume = targetVolume;
  }, [previewPhase, pauseSource, sourceVolumeDuringAd, sourceVideo]);

  useEffect(() => {
    if (!autoCenterPlacement) return;
    setX(Math.max(-5, Math.min(1, (1 - width) / 2)));
    setY(Math.max(-5, Math.min(1, (1 - adNormalizedHeight) / 2)));
  }, [autoCenterPlacement, width, adNormalizedHeight]);

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
    source.volume = pauseSource ? sourceBaseVolumeRef.current : sourceBaseVolumeRef.current * sourceVolumeDuringAd;
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
    pausePreviewCompletedRef.current = true;
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
    pausePreviewCompletedRef.current = source.currentTime > startAt + 0.03;
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
    pausePreviewCompletedRef.current = false;
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

  const previewAdMaterialOnly = () => {
    const video = adMaterialPreviewRef.current;
    if (!video) return;
    if (video.currentTime < adTrimStart || video.currentTime >= resolvedAdTrimEnd - 0.03) {
      video.currentTime = adTrimStart;
    }
  };

  const stopAdMaterialAtRangeEnd = () => {
    const video = adMaterialPreviewRef.current;
    if (!video || video.currentTime + 0.03 < resolvedAdTrimEnd) return;
    video.pause();
    video.currentTime = adTrimStart;
  };

  const pickVideo = async (kind: 'source' | 'green') => {
    try {
      const response = await fetch(`${API_BASE}/pick_video_file`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) {
        throw new Error(
          payload.message ||
          `文件选择接口返回 HTTP ${response.status}。请停止旧服务并重新启动本项目的 scripts/server.py。`
        );
      }
      if (!payload.path) return;
      const item = payload.item as VideoItem;
      if (kind === 'source') {
        if (isGeneratedAdComposite(item.path)) {
          toast.warning('这个文件已经是广告合成成片，不能再次作为无广告母版，否则预览和成片都会出现两个广告。');
          return;
        }
        setRenderedVideos((items) => [item, ...items.filter((entry) => entry.path !== item.path)]);
        setSourceVideo(payload.path);
      } else {
        setGreenScreenVideos((items) => [item, ...items.filter((entry) => entry.path !== item.path)]);
        setGreenScreenVideo(payload.path);
      }
    } catch (error: any) {
      toast.error(error.message || '选择视频失败');
    }
  };

  const pickGuideAudio = async () => {
    try {
      const response = await fetch(`${API_BASE}/pick_audio_file`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || `音频文件选择接口返回 HTTP ${response.status}`);
      }
      if (!payload.path) return;
      const item = payload.item as VideoItem;
      setGuideAudios((items) => [item, ...items.filter((entry) => entry.path !== item.path)]);
      setGuideAudio(payload.path);
    } catch (error: any) {
      toast.error(error.message || '选择引导音频失败');
    }
  };

  const updateWidthKeepingCenter = (nextWidth: number) => {
    const normalizedWidth = Math.min(5, Math.max(0.05, nextWidth));
    if (autoCenterPlacement) {
      setWidth(normalizedWidth);
      return;
    }
    const heightRatio = (sourceSize.width / Math.max(sourceSize.height, 1))
      * (adSize.height / Math.max(adSize.width, 1));
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
    toast.success(`已导入抠绿参数：${settings.keyColor} / 容差 ${settings.similarity.toFixed(2)} / 融合 ${settings.blend.toFixed(2)}`);
  };

  const applyPreset = (preset: PositionPreset) => {
    setAutoCenterPlacement(false);
    const margin = 0.04;
    const nextX = preset.endsWith('left')
      ? margin
      : preset.endsWith('right')
        ? 1 - margin - width
        : (1 - width) / 2;
    const nextY = preset.startsWith('top')
      ? margin
      : preset.startsWith('bottom')
        ? 1 - margin - adNormalizedHeight
        : (1 - adNormalizedHeight) / 2;
    setX(Math.max(-5, Math.min(1, nextX)));
    setY(Math.max(-5, Math.min(1, nextY)));
  };

  const submit = async () => {
    if (!sourceVideo || !greenScreenVideo) {
      toast.warning('请先选择无广告母版和广告视频');
      return;
    }
    if (sourceDuration > 0 && startAt >= sourceDuration) {
      toast.warning('广告开始时间必须小于母版时长');
      return;
    }
    if (selectedAdDuration < 0.01) {
      toast.warning('请等待广告时长读取完成，并选择有效的广告视频范围');
      return;
    }
    setSubmitting(true);
    setLastTaskId('');
    try {
      const response = await fetch(`${API_BASE}/ad/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
            color: keyColor.replace('#', '0x'),
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
            mode: voiceoverEnabled ? 'voiceover' : 'prelude',
            adVideoDelay,
            pauseSource: guidePauseSource,
            volume: guideVolume,
            playbackRate: guidePlaybackRate,
            subtitles: {
              ...subtitleSettings,
              enabled: Boolean(guideAudio) && subtitleSettings.enabled,
            },
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || '创建广告合成任务失败');
      }
      setLastTaskId(payload.task?.id || '');
      toast.success(`广告合成任务已加入队列：${payload.task?.id || ''}`);
    } catch (error: any) {
      toast.error(error.message || '提交广告合成任务失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2}>植入广告</Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            在已经渲染好的无广告母版上覆盖绿幕或普通广告视频。两种模式都支持位置、大小和暂停设置，并且绝不会覆盖母版。
          </Paragraph>
        </div>

        <Alert
          type="success"
          showIcon
          message="无广告母版始终保留"
          description="母版默认从 out/ 读取；普通广告可放入 public/ad-videos/，绿幕素材可放入 public/green-screen-videos/，也可以直接选择其他本地视频。"
        />

        <Row gutter={[24, 24]}>
          <Col xs={24} xl={10}>
            <Card
              title="1. 选择视频"
              extra={<Button icon={<ReloadOutlined />} loading={loading} onClick={() => void loadVideos()}>刷新</Button>}
            >
              <Form layout="vertical">
                <Form.Item label="处理方式">
                  <Radio.Group value={mode} onChange={(event) => setMode(event.target.value)}>
                    <Radio.Button value="chroma-key">绿幕融合</Radio.Button>
                    <Radio.Button value="plain-overlay">普通视频覆盖</Radio.Button>
                  </Radio.Group>
                </Form.Item>
                <Form.Item label="无广告母版">
                  <Space.Compact style={{ width: '100%' }}>
                    <Select
                      showSearch
                      value={sourceVideo || undefined}
                      placeholder="选择 out/ 中已经渲染的视频"
                      style={{ flex: 1 }}
                      optionFilterProp="label"
                      onChange={setSourceVideo}
                      options={renderedVideos.map((item) => ({
                        value: item.path,
                        label: `${item.name}${item.size ? ` · ${formatBytes(item.size)}` : ''}`,
                      }))}
                      notFoundContent={<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="out/ 中没有视频" />}
                    />
                    <Button icon={<FolderOpenOutlined />} onClick={() => void pickVideo('source')}>选择文件</Button>
                  </Space.Compact>
                  {selectedSource && <Text type="secondary">{selectedSource.path}</Text>}
                </Form.Item>

                <Form.Item label={mode === 'plain-overlay' ? '普通广告视频' : '绿幕广告视频'}>
                  <Space.Compact style={{ width: '100%' }}>
                    <Select
                      showSearch
                      value={greenScreenVideo || undefined}
                      placeholder={mode === 'plain-overlay' ? '选择要覆盖显示的普通视频' : '选择绿幕广告素材'}
                      style={{ flex: 1 }}
                      optionFilterProp="label"
                      onChange={setGreenScreenVideo}
                      options={greenScreenVideos.map((item) => ({
                        value: item.path,
                        label: `${item.name}${item.size ? ` · ${formatBytes(item.size)}` : ''}`,
                      }))}
                      notFoundContent={(
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description={mode === 'plain-overlay' ? '请把素材放入 public/ad-videos/' : '请把素材放入 public/green-screen-videos/'}
                        />
                      )}
                    />
                    <Button icon={<FolderOpenOutlined />} onClick={() => void pickVideo('green')}>选择文件</Button>
                  </Space.Compact>
                </Form.Item>
                {greenScreenUrl && (
                  <Form.Item label="广告片段预览（仅广告素材）">
                    <video
                      ref={adMaterialPreviewRef}
                      key={`material-${greenScreenUrl}`}
                      src={greenScreenUrl}
                      controls
                      playsInline
                      preload="metadata"
                      style={{ width: '100%', maxHeight: 240, background: '#000', borderRadius: 8 }}
                      onPlay={previewAdMaterialOnly}
                      onTimeUpdate={stopAdMaterialAtRangeEnd}
                      onSeeked={stopAdMaterialAtRangeEnd}
                    />
                    <Text type="secondary">
                      此播放器只试听所选广告片段及其原声，不会触发引导音频，也不会执行抠绿。
                    </Text>
                  </Form.Item>
                )}

                <Form.Item label="广告引导音频（可选）">
                  <Space.Compact style={{ width: '100%' }}>
                    <Select
                      allowClear
                      showSearch
                      value={guideAudio || undefined}
                      placeholder="先播放一段音频，再引出广告视频"
                      style={{ flex: 1 }}
                      optionFilterProp="label"
                      onChange={(value) => {
                        setGuideAudio(value || '');
                        if (!value) setGuideDuration(0);
                      }}
                      options={guideAudios.map((item) => ({
                        value: item.path,
                        label: `${item.name}${item.size ? ` · ${formatBytes(item.size)}` : ''}`,
                      }))}
                    />
                    <Button icon={<FolderOpenOutlined />} onClick={() => void pickGuideAudio()}>选择音频</Button>
                  </Space.Compact>
                </Form.Item>
                {guideAudioUrl && (
                  <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
                    <audio
                      ref={guidePreviewRef}
                      key={guideAudioUrl}
                      src={guideAudioUrl}
                      crossOrigin="anonymous"
                      controls
                      preload="metadata"
                      style={{ width: '100%' }}
                      onLoadedMetadata={(event) => {
                        const duration = event.currentTarget.duration;
                        if (Number.isFinite(duration)) {
                          setGuideDuration(duration);
                          setAdVideoDelay((current) => Math.min(current, Math.max(0, duration - 0.01)));
                        }
                      }}
                      onPlay={(event) => {
                        ensureAudioPreviewGain(event.currentTarget, guideAudioGraphRef);
                        startVoiceoverAdIfNeeded();
                      }}
                      onTimeUpdate={(event) => {
                        setGuideCurrentTime(event.currentTarget.currentTime);
                        startVoiceoverAdIfNeeded();
                      }}
                      onSeeked={(event) => setGuideCurrentTime(event.currentTarget.currentTime)}
                      onEnded={() => {
                        setGuideCurrentTime(0);
                        finishGuidePreview();
                      }}
                    />
                    <div>
                      <Text>引导音频用途</Text>
                      <Radio.Group
                        value={guideMode}
                        onChange={(event) => setGuideMode(event.target.value)}
                        style={{ display: 'flex', marginTop: 8 }}
                      >
                        <Radio.Button value="prelude">前奏：播完后显示广告</Radio.Button>
                        <Radio.Button value="voiceover">总配音：替代广告原声</Radio.Button>
                      </Radio.Group>
                    </div>
                    {voiceoverEnabled && (
                      <Form.Item label="广告画面进入延迟（秒）" style={{ width: '100%', marginBottom: 0 }}>
                        <InputNumber
                          min={0}
                          max={guidePlaybackDuration > 0 ? Math.max(0, guidePlaybackDuration - 0.01) : undefined}
                          step={0.1}
                          precision={2}
                          value={adVideoDelay}
                          onChange={(value) => setAdVideoDelay(value ?? 0)}
                          style={{ width: '100%' }}
                        />
                        <Text type="secondary">
                          引导音频开始后经过这段时间显示广告画面；引导音频将继续播放并替代广告视频原声。
                        </Text>
                      </Form.Item>
                    )}
                    <Space wrap>
                      <Text>播放引导音频时暂停母片</Text>
                      <Switch checked={guidePauseSource} onChange={setGuidePauseSource} />
                    </Space>
                    <div>
                      <Text>引导音频音量：{Math.round(guideVolume * 100)}%</Text>
                      <Slider min={0} max={2} step={0.05} value={guideVolume} onChange={setGuideVolume} />
                    </div>
                    <div style={{ width: '100%' }}>
                      <Text>引导音频速度：{guidePlaybackRate.toFixed(2)}×</Text>
                      <Space.Compact style={{ width: '100%', marginTop: 8 }}>
                        <Slider
                          min={0.5}
                          max={2}
                          step={0.05}
                          value={guidePlaybackRate}
                          onChange={setGuidePlaybackRate}
                          style={{ flex: 1, marginInline: 10 }}
                        />
                        <InputNumber
                          min={0.5}
                          max={2}
                          step={0.05}
                          precision={2}
                          value={guidePlaybackRate}
                          formatter={(value) => `${value ?? 1}×`}
                          parser={(value) => Number((value || '1').replace('×', ''))}
                          onChange={(value) => setGuidePlaybackRate(value ?? 1)}
                          style={{ width: 92 }}
                        />
                      </Space.Compact>
                      <Text type="secondary">预览使用浏览器保音调播放，最终成片使用 FFmpeg atempo，音高保持不变。</Text>
                    </div>
                  </Space>
                )}
              </Form>
            </Card>

            <Card title="2. 时间线" style={{ marginTop: 24 }}>
              <Form layout="vertical">
                <Form.Item label={guideAudio ? '引导音频开始时间（秒）' : '广告开始时间（秒）'}>
                  <InputNumber
                    min={0}
                    max={sourceDuration > 0 ? Math.max(0, sourceDuration - 0.01) : undefined}
                    step={0.1}
                    precision={2}
                    value={startAt}
                    onChange={(value) => setStartAt(value ?? 0)}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
                <Form.Item label="广告视频使用范围">
                  <Slider
                    range
                    min={0}
                    max={Math.max(adDuration, 0.01)}
                    step={0.01}
                    value={[adTrimStart, resolvedAdTrimEnd]}
                    onChange={(value) => {
                      const [nextStart, nextEnd] = value as number[];
                      if (nextEnd - nextStart >= 0.01) {
                        setAdTrimStart(nextStart);
                        setAdTrimEnd(nextEnd);
                      }
                    }}
                    disabled={adDuration <= 0}
                  />
                  <Row gutter={12}>
                    <Col span={12}>
                      <Text type="secondary">素材开始（秒）</Text>
                      <InputNumber
                        min={0}
                        max={Math.max(0, resolvedAdTrimEnd - 0.01)}
                        step={0.1}
                        precision={2}
                        value={adTrimStart}
                        onChange={(value) => setAdTrimStart(Math.max(0, Math.min(value ?? 0, resolvedAdTrimEnd - 0.01)))}
                        style={{ width: '100%' }}
                      />
                    </Col>
                    <Col span={12}>
                      <Text type="secondary">素材结束（秒）</Text>
                      <InputNumber
                        min={adTrimStart + 0.01}
                        max={adDuration || undefined}
                        step={0.1}
                        precision={2}
                        value={resolvedAdTrimEnd}
                        onChange={(value) => setAdTrimEnd(Math.min(adDuration, Math.max(value ?? adDuration, adTrimStart + 0.01)))}
                        style={{ width: '100%' }}
                      />
                    </Col>
                  </Row>
                  <Text type="secondary">
                    将使用 {adTrimStart.toFixed(2)} 秒至 {resolvedAdTrimEnd.toFixed(2)} 秒，片段时长 {selectedAdDuration.toFixed(2)} 秒。
                  </Text>
                </Form.Item>
                <Form.Item label="播放模式">
                  <Radio.Group value={pauseSource} onChange={(event) => setPauseSource(event.target.value)}>
                    <Radio.Button value={false}>覆盖播放，不暂停母片</Radio.Button>
                    <Radio.Button value={true}>暂停母片再播放广告</Radio.Button>
                  </Radio.Group>
                </Form.Item>
                <Space wrap>
                  <Tag>母版：{sourceDuration ? `${sourceDuration.toFixed(2)} 秒` : '等待读取'}</Tag>
                  <Tag>广告素材：{adDuration ? `${adDuration.toFixed(2)} 秒` : '等待读取'}</Tag>
                  {adDuration > 0 && <Tag color="cyan">使用片段：{selectedAdDuration.toFixed(2)} 秒</Tag>}
                  {guideAudio && (
                    <Tag>
                      引导：{guideDuration ? `${guidePlaybackDuration.toFixed(2)} 秒 · ${guidePlaybackRate.toFixed(2)}×` : '等待读取'}
                    </Tag>
                  )}
                  {voiceoverEnabled && <Tag color="purple">广告画面：引导后 {adVideoDelay.toFixed(2)} 秒进入</Tag>}
                  <Tag color="blue">预计成片：{estimatedDuration ? `${estimatedDuration.toFixed(2)} 秒` : '--'}</Tag>
                </Space>
              </Form>
            </Card>
          </Col>

          <Col xs={24} xl={14}>
            <Card title="最终合成时间线预览">
              {sourceUrl ? (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space wrap>
                    <Text>启用引导音频和广告联动预览</Text>
                    <Switch
                      checked={timelinePreviewEnabled}
                      onChange={(enabled) => {
                        stopTimelinePreview();
                        setTimelinePreviewEnabled(enabled);
                      }}
                    />
                    <Button
                      disabled={!timelinePreviewEnabled}
                      onClick={restartTimelinePreview}
                    >
                      从广告前开始预览
                    </Button>
                    {!sourcePreviewPlaying && <Text type="secondary">母片暂停时会始终显示静态广告定位层，调整位置和大小会立即反馈。</Text>}
                  </Space>
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      maxWidth: previewMaxWidth,
                      maxHeight: 520,
                      margin: '0 auto',
                      aspectRatio: `${sourceSize.width} / ${sourceSize.height}`,
                      overflow: 'hidden',
                      borderRadius: 10,
                      background: '#000',
                      boxShadow: '0 14px 40px rgba(0,0,0,.28)',
                      containerType: 'inline-size',
                    }}
                  >
                    <video
                      ref={sourcePreviewRef}
                      key={sourceUrl}
                      src={sourceUrl}
                      crossOrigin="anonymous"
                      controls
                      style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                      onPlay={() => {
                        setSourcePreviewPlaying(true);
                        if (timelinePreviewEnabled) startPausedAdPreviewIfNeeded();
                      }}
                      onTimeUpdate={() => {
                        if (timelinePreviewEnabled) startPausedAdPreviewIfNeeded();
                      }}
                      onSeeked={resetPreviewAfterSeek}
                      onPause={() => {
                        setSourcePreviewPlaying(false);
                        if (timelinePreviewEnabled && !pausePreviewActiveRef.current) {
                          adPreviewRef.current?.pause();
                          guidePreviewRef.current?.pause();
                        }
                      }}
                      onEnded={() => setSourcePreviewPlaying(false)}
                      onVolumeChange={(event) => {
                        if (previewPhaseRef.current === 'idle' || previewPhaseRef.current === 'done') {
                          sourceBaseVolumeRef.current = event.currentTarget.volume;
                        }
                      }}
                      onLoadedMetadata={(event) => {
                        const duration = event.currentTarget.duration;
                        if (Number.isFinite(duration)) setSourceDuration(duration);
                        setSourceSize({
                          width: event.currentTarget.videoWidth || 16,
                          height: event.currentTarget.videoHeight || 9,
                        });
                      }}
                    />
                    {greenScreenUrl && (
                      <video
                        ref={adPreviewRef}
                        key={greenScreenUrl}
                        src={greenScreenUrl}
                        crossOrigin="anonymous"
                        playsInline
                        preload="auto"
                        style={{
                          position: 'absolute',
                          left: `${x * 100}%`,
                          top: `${y * 100}%`,
                          width: `${width * 100}%`,
                          height: 'auto',
                          maxWidth: 'none',
                          display: previewPhase === 'ad' || (!sourcePreviewPlaying && previewPhase !== 'lead') ? 'block' : 'none',
                          pointerEvents: 'none',
                          zIndex: 2,
                          willChange: 'left, top, width',
                        }}
                        onLoadedMetadata={(event) => {
                          const duration = event.currentTarget.duration;
                          if (Number.isFinite(duration)) {
                            setAdDuration(duration);
                            setAdTrimStart(0);
                            setAdTrimEnd(duration);
                          }
                          setAdSize({
                            width: event.currentTarget.videoWidth || 16,
                            height: event.currentTarget.videoHeight || 9,
                          });
                          resetPreviewAfterSeek();
                        }}
                        onTimeUpdate={finishAdRangeIfNeeded}
                        onEnded={finishPausedAdPreview}
                      />
                    )}
                    {previewPhase === 'lead' && (
                      <Tag color={guidePauseSource ? 'blue' : 'gold'} style={{ position: 'absolute', top: 12, right: 12, zIndex: 3 }}>
                        正在播放广告引导音频{guidePauseSource ? ' · 母片已暂停' : ''}
                      </Tag>
                    )}
                    {previewPhase === 'ad' && (
                      <Tag color={voiceoverEnabled ? 'purple' : 'blue'} style={{ position: 'absolute', top: 12, right: 12, zIndex: 3 }}>
                        {voiceoverEnabled ? '广告总配音 · 正在显示广告画面' : '正在预览广告'}{previewPauseActive ? ' · 母片已暂停' : ''}
                      </Tag>
                    )}
                    {!sourcePreviewPlaying && previewPhase !== 'lead' && previewPhase !== 'ad' && greenScreenUrl && (
                      <Tag color="cyan" style={{ position: 'absolute', top: 12, right: 12, zIndex: 3 }}>
                        位置调整预览 · X {Math.round(x * 100)}% · Y {Math.round(y * 100)}% · 宽度 {Math.round(width * 100)}%
                      </Tag>
                    )}
                    {activeSubtitleCue && (previewPhase === 'lead' || previewPhase === 'ad') && (
                      <div
                        style={{
                          position: 'absolute',
                          zIndex: 4,
                          pointerEvents: 'none',
                          left: '5%',
                          right: '5%',
                          top: subtitleSettings.style.position === 'top'
                            ? `${subtitleSettings.style.verticalMargin}%`
                            : subtitleSettings.style.position === 'center' ? '50%' : undefined,
                          bottom: subtitleSettings.style.position === 'bottom'
                            ? `${subtitleSettings.style.verticalMargin}%`
                            : undefined,
                          transform: subtitleSettings.style.position === 'center' ? 'translateY(-50%)' : undefined,
                          textAlign: 'center',
                          whiteSpace: 'pre-line',
                          fontFamily: subtitleSettings.style.fontFamily,
                          fontSize: `${subtitleSettings.style.fontSize / Math.max(sourceSize.width, 1) * 100}cqw`,
                          lineHeight: 1.28,
                          color: subtitleSettings.style.color,
                          WebkitTextStroke: `${subtitleSettings.style.outlineWidth / Math.max(sourceSize.width, 1) * 100}cqw ${subtitleSettings.style.outlineColor}`,
                          paintOrder: 'stroke fill',
                        }}
                      >
                        <span style={{
                          padding: subtitleSettings.style.backgroundOpacity > 0 ? '.1em .28em' : 0,
                          borderRadius: 4,
                          background: subtitleSettings.style.backgroundOpacity > 0
                            ? `${subtitleSettings.style.backgroundColor}${Math.round(subtitleSettings.style.backgroundOpacity * 255).toString(16).padStart(2, '0')}`
                            : 'transparent',
                        }}>
                          {activeSubtitleCue.text}
                        </span>
                      </div>
                    )}
                  </div>
                  <Text type="secondary">
                    此处使用两个原生视频直接叠加，保持素材画质并准确预览时间、位置、大小和裁剪；绿幕模式也不会在这里实时抠绿，抠绿参数请在“抠绿参数测试”页面用静态截图检查。
                  </Text>
                </Space>
              ) : (
                <Empty description="请先选择无广告母版" />
              )}
            </Card>

            <Card title="3. 位置和大小" style={{ marginTop: 24 }}>
              <Alert
                type="info"
                showIcon
                message="最终画布始终保持母片尺寸"
                description="广告可以放大到 500%；超出母片显示范围的部分会直接裁掉，不会扩大成片分辨率。"
                style={{ marginBottom: 20 }}
              />
              <Space direction="vertical" style={{ width: '100%', marginBottom: 20 }}>
                <Space wrap>
                  <Text><AimOutlined /> 自动居中模式</Text>
                  <Switch
                    checked={autoCenterPlacement}
                    onChange={setAutoCenterPlacement}
                    checkedChildren="已开启"
                    unCheckedChildren="已关闭"
                  />
                </Space>
                <Text type="secondary">
                  开启后持续按当前广告宽高计算 X {Math.round((1 - width) / 2 * 100)}%、Y {Math.round((1 - adNormalizedHeight) / 2 * 100)}%；调整宽度或更换素材后也会自动重新居中。负数表示对称裁剪。
                </Text>
              </Space>
              <Space wrap style={{ marginBottom: 20 }}>
                <Text>其他快速位置：</Text>
                <Button onClick={() => applyPreset('top-left')}>左上</Button>
                <Button onClick={() => applyPreset('top-right')}>右上</Button>
                <Button onClick={() => applyPreset('bottom-left')}>左下</Button>
                <Button onClick={() => applyPreset('bottom-right')}>右下</Button>
              </Space>
              <Row gutter={20}>
                <Col xs={24} md={8}>
                  <Text>横向位置：{Math.round(x * 100)}%</Text>
                  <Space.Compact style={{ width: '100%', marginTop: 8 }}>
                    <Slider
                      disabled={autoCenterPlacement}
                      min={-5}
                      max={1}
                      step={0.01}
                      value={x}
                      onChange={setX}
                      style={{ flex: 1, marginInline: 10 }}
                    />
                    <InputNumber<number>
                      disabled={autoCenterPlacement}
                      min={-500}
                      max={100}
                      step={1}
                      value={Math.round(x * 100)}
                      formatter={(value) => `${value ?? 0}%`}
                      parser={(value) => {
                        const parsed = Number((value || '').replace(/[^\d.-]/g, ''));
                        return Number.isFinite(parsed) ? parsed : 0;
                      }}
                      onChange={(value) => setX((value ?? 0) / 100)}
                      style={{ width: 100 }}
                    />
                  </Space.Compact>
                </Col>
                <Col xs={24} md={8}>
                  <Text>纵向位置：{Math.round(y * 100)}%</Text>
                  <Space.Compact style={{ width: '100%', marginTop: 8 }}>
                    <Slider
                      disabled={autoCenterPlacement}
                      min={-5}
                      max={1}
                      step={0.01}
                      value={y}
                      onChange={setY}
                      style={{ flex: 1, marginInline: 10 }}
                    />
                    <InputNumber<number>
                      disabled={autoCenterPlacement}
                      min={-500}
                      max={100}
                      step={1}
                      value={Math.round(y * 100)}
                      formatter={(value) => `${value ?? 0}%`}
                      parser={(value) => {
                        const parsed = Number((value || '').replace(/[^\d.-]/g, ''));
                        return Number.isFinite(parsed) ? parsed : 0;
                      }}
                      onChange={(value) => setY((value ?? 0) / 100)}
                      style={{ width: 100 }}
                    />
                  </Space.Compact>
                </Col>
                <Col xs={24} md={8}>
                  <Text>广告宽度：{Math.round(width * 100)}%</Text>
                  <Space.Compact style={{ width: '100%', marginTop: 8 }}>
                    <Slider
                      min={0.05}
                      max={5}
                      step={0.01}
                      value={width}
                      onChange={updateWidthKeepingCenter}
                      style={{ flex: 1, marginInline: 10 }}
                    />
                    <InputNumber<number>
                      min={5}
                      max={500}
                      step={1}
                      value={Math.round(width * 100)}
                      formatter={(value) => `${value ?? 5}%`}
                      parser={(value) => {
                        const parsed = Number((value || '').replace(/[^\d.]/g, ''));
                        return Number.isFinite(parsed) ? parsed : 5;
                      }}
                      onChange={(value) => updateWidthKeepingCenter((value ?? 5) / 100)}
                      style={{ width: 100 }}
                    />
                  </Space.Compact>
                  <Text type="secondary">调整宽度时保持广告中心位置不变，超出母片的部分仍会裁掉。</Text>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        <Card title="4. 引导音频字幕">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Alert
              type="info"
              showIcon
              message="字幕时间以引导音频的原始时间为准"
              description="调整引导音频速度后，预览和最终成片会自动换算时间并保持同步。字幕草稿与样式会自动保存，刷新或切换页面后仍会保留。"
            />
            <Space wrap>
              <Text>启用引导字幕</Text>
              <Switch
                checked={subtitleSettings.enabled}
                onChange={(enabled) => setSubtitleSettings((current) => ({ ...current, enabled }))}
              />
              <Button onClick={() => void importSrt()}>导入 .srt</Button>
              <Button onClick={addSubtitleCue}>手动添加字幕段</Button>
              <Button onClick={exportSrt}>导出保存 .srt</Button>
              <Tag color="blue">已自动保存 {subtitleSettings.cues.length} 条</Tag>
            </Space>

            <Row gutter={20}>
              <Col xs={24} xl={14}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {!subtitleSettings.cues.length && (
                    <Empty description="可导入 SRT，或手动添加第一条字幕" />
                  )}
                  {subtitleSettings.cues.map((cue, index) => (
                    <Card
                      key={cue.id}
                      size="small"
                      title={`字幕 ${index + 1}`}
                      extra={(
                        <Space>
                          <Button
                            size="small"
                            disabled={!guideAudioUrl}
                            onClick={() => {
                              const audio = guidePreviewRef.current;
                              if (!audio) return;
                              audio.currentTime = cue.start;
                              setGuideCurrentTime(cue.start);
                              void audio.play().catch(() => undefined);
                            }}
                          >
                            跳转试听
                          </Button>
                          <Button
                            size="small"
                            danger
                            onClick={() => setSubtitleSettings((current) => ({
                              ...current,
                              cues: current.cues.filter((item) => item.id !== cue.id),
                            }))}
                          >
                            删除
                          </Button>
                        </Space>
                      )}
                    >
                      <Row gutter={12}>
                        <Col xs={24} md={12}>
                          <Text type="secondary">开始（秒）</Text>
                          <Space.Compact style={{ width: '100%', marginTop: 6 }}>
                            <InputNumber
                              min={0}
                              max={Math.max(0, cue.end - 0.01)}
                              step={0.1}
                              precision={2}
                              value={cue.start}
                              onChange={(value) => updateSubtitleCue(cue.id, { start: Math.max(0, Math.min(value ?? 0, cue.end - 0.01)) })}
                              style={{ flex: 1 }}
                            />
                            <Button onClick={() => updateSubtitleCue(cue.id, {
                              start: Math.max(0, Math.min(guidePreviewRef.current?.currentTime ?? 0, cue.end - 0.01)),
                            })}>
                              取当前时间
                            </Button>
                          </Space.Compact>
                        </Col>
                        <Col xs={24} md={12}>
                          <Text type="secondary">结束（秒）</Text>
                          <Space.Compact style={{ width: '100%', marginTop: 6 }}>
                            <InputNumber
                              min={cue.start + 0.01}
                              max={guideDuration || undefined}
                              step={0.1}
                              precision={2}
                              value={cue.end}
                              onChange={(value) => updateSubtitleCue(cue.id, { end: Math.max(cue.start + 0.01, value ?? cue.start + 2) })}
                              style={{ flex: 1 }}
                            />
                            <Button onClick={() => updateSubtitleCue(cue.id, {
                              end: Math.max(cue.start + 0.01, guidePreviewRef.current?.currentTime ?? cue.start + 2),
                            })}>
                              取当前时间
                            </Button>
                          </Space.Compact>
                        </Col>
                        <Col span={24} style={{ marginTop: 12 }}>
                          <Input.TextArea
                            autoSize={{ minRows: 2, maxRows: 5 }}
                            value={cue.text}
                            placeholder="输入这一时间段显示的字幕，可换行"
                            maxLength={1000}
                            showCount
                            onChange={(event) => updateSubtitleCue(cue.id, { text: event.target.value })}
                          />
                        </Col>
                      </Row>
                    </Card>
                  ))}
                </Space>
              </Col>

              <Col xs={24} xl={10}>
                <Card size="small" title="字体效果预览">
                  <div
                    style={{
                      position: 'relative',
                      height: 220,
                      overflow: 'hidden',
                      borderRadius: 8,
                      background: 'linear-gradient(135deg, #234 0%, #7a8b91 48%, #182126 100%)',
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: '5%',
                        right: '5%',
                        top: subtitleSettings.style.position === 'top'
                          ? `${subtitleSettings.style.verticalMargin}%`
                          : subtitleSettings.style.position === 'center' ? '50%' : undefined,
                        bottom: subtitleSettings.style.position === 'bottom'
                          ? `${subtitleSettings.style.verticalMargin}%`
                          : undefined,
                        transform: subtitleSettings.style.position === 'center' ? 'translateY(-50%)' : undefined,
                        textAlign: 'center',
                        whiteSpace: 'pre-line',
                        fontFamily: subtitleSettings.style.fontFamily,
                        fontSize: subtitleSettings.style.fontSize,
                        lineHeight: 1.28,
                        color: subtitleSettings.style.color,
                        WebkitTextStroke: `${subtitleSettings.style.outlineWidth}px ${subtitleSettings.style.outlineColor}`,
                        paintOrder: 'stroke fill',
                      }}
                    >
                      <span style={{
                        padding: subtitleSettings.style.backgroundOpacity > 0 ? '4px 10px' : 0,
                        borderRadius: 4,
                        background: subtitleSettings.style.backgroundOpacity > 0
                          ? `${subtitleSettings.style.backgroundColor}${Math.round(subtitleSettings.style.backgroundOpacity * 255).toString(16).padStart(2, '0')}`
                          : 'transparent',
                      }}>
                        {subtitlePreviewText}
                      </span>
                    </div>
                  </div>
                  <Form layout="vertical">
                    <Row gutter={12}>
                      <Col xs={24} md={14}>
                        <Form.Item label="字体">
                          <Select
                            showSearch
                            value={subtitleSettings.style.fontFamily}
                            options={[
                              'Microsoft YaHei', 'SimHei', 'SimSun', 'KaiTi',
                              'Arial', 'Arial Black', 'Times New Roman',
                            ].map((font) => ({ value: font, label: font }))}
                            onChange={(fontFamily) => setSubtitleSettings((current) => ({
                              ...current, style: { ...current.style, fontFamily },
                            }))}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={10}>
                        <Form.Item label="字号">
                          <InputNumber
                            min={12}
                            max={160}
                            value={subtitleSettings.style.fontSize}
                            onChange={(fontSize) => setSubtitleSettings((current) => ({
                              ...current, style: { ...current.style, fontSize: fontSize ?? 42 },
                            }))}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={12} md={8}>
                        <Form.Item label="文字颜色">
                          <ColorPicker
                            value={subtitleSettings.style.color}
                            onChange={(color) => setSubtitleSettings((current) => ({
                              ...current, style: { ...current.style, color: color.toHexString() },
                            }))}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={12} md={8}>
                        <Form.Item label="描边颜色">
                          <ColorPicker
                            value={subtitleSettings.style.outlineColor}
                            onChange={(color) => setSubtitleSettings((current) => ({
                              ...current, style: { ...current.style, outlineColor: color.toHexString() },
                            }))}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={12} md={8}>
                        <Form.Item label="描边宽度">
                          <InputNumber
                            min={0}
                            max={12}
                            value={subtitleSettings.style.outlineWidth}
                            onChange={(outlineWidth) => setSubtitleSettings((current) => ({
                              ...current, style: { ...current.style, outlineWidth: outlineWidth ?? 0 },
                            }))}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={12} md={8}>
                        <Form.Item label="底色">
                          <ColorPicker
                            value={subtitleSettings.style.backgroundColor}
                            onChange={(color) => setSubtitleSettings((current) => ({
                              ...current, style: { ...current.style, backgroundColor: color.toHexString() },
                            }))}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={12} md={8}>
                        <Form.Item label="底色透明度">
                          <InputNumber
                            min={0}
                            max={100}
                            formatter={(value) => `${value ?? 0}%`}
                            parser={(value) => Number((value || '0').replace('%', ''))}
                            value={Math.round(subtitleSettings.style.backgroundOpacity * 100)}
                            onChange={(value) => setSubtitleSettings((current) => ({
                              ...current, style: { ...current.style, backgroundOpacity: (value ?? 0) / 100 },
                            }))}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item label="画面位置">
                          <Select
                            value={subtitleSettings.style.position}
                            options={[
                              { value: 'top', label: '顶部' },
                              { value: 'center', label: '居中' },
                              { value: 'bottom', label: '底部' },
                            ]}
                            onChange={(position) => setSubtitleSettings((current) => ({
                              ...current, style: { ...current.style, position },
                            }))}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={24}>
                        <Form.Item label={`距画面边缘：${subtitleSettings.style.verticalMargin}%`}>
                          <Slider
                            disabled={subtitleSettings.style.position === 'center'}
                            min={0}
                            max={45}
                            value={subtitleSettings.style.verticalMargin}
                            onChange={(verticalMargin) => setSubtitleSettings((current) => ({
                              ...current, style: { ...current.style, verticalMargin },
                            }))}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Form>
                </Card>
              </Col>
            </Row>

            <Card
              size="small"
              title="引导字幕图层组合预览"
              extra={<Tag color="purple">独立预览，不影响上方最终时间线</Tag>}
            >
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Alert
                  type="info"
                  showIcon
                  message="母片画面固定开启，其他图层可以自由组合"
                  description="预览仍遵循当前的前奏/总配音、广告进入延迟和暂停母片设置；关闭声音图层不会停止时间线，因此可以单独检查字幕出现时间。"
                />
                <Space wrap>
                  <Tag color="blue">母片画面：始终开启</Tag>
                  <Text>母片声音</Text>
                  <Switch checked={subtitlePreviewSourceAudio} onChange={setSubtitlePreviewSourceAudio} />
                  <Text>引导音频</Text>
                  <Switch checked={subtitlePreviewGuideAudio} onChange={setSubtitlePreviewGuideAudio} />
                  <Text>引导字幕</Text>
                  <Switch checked={subtitlePreviewSubtitles} onChange={setSubtitlePreviewSubtitles} />
                  <Text>广告画面</Text>
                  <Switch checked={subtitlePreviewAdVideo} onChange={setSubtitlePreviewAdVideo} />
                  <Text>广告声音</Text>
                  <Switch
                    disabled={voiceoverEnabled || !adAudioEnabled}
                    checked={subtitlePreviewAdAudio && !voiceoverEnabled && adAudioEnabled}
                    onChange={setSubtitlePreviewAdAudio}
                  />
                </Space>

                {sourceUrl && guideAudioUrl ? (
                  <>
                    <div
                      style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: previewMaxWidth,
                        maxHeight: 520,
                        margin: '0 auto',
                        aspectRatio: `${sourceSize.width} / ${sourceSize.height}`,
                        overflow: 'hidden',
                        borderRadius: 10,
                        background: '#000',
                        boxShadow: '0 12px 34px rgba(0,0,0,.24)',
                        containerType: 'inline-size',
                      }}
                    >
                      <video
                        ref={subtitleVideoPreviewRef}
                        key={`subtitle-source-${sourceUrl}`}
                        src={sourceUrl}
                        crossOrigin="anonymous"
                        playsInline
                        preload="metadata"
                        muted={!subtitlePreviewSourceAudio}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                        onLoadedMetadata={(event) => {
                          event.currentTarget.currentTime = Math.min(startAt, Math.max(0, event.currentTarget.duration - 0.01));
                        }}
                      />
                      {greenScreenUrl && (
                        <video
                          ref={subtitleAdPreviewRef}
                          key={`subtitle-ad-${greenScreenUrl}`}
                          src={greenScreenUrl}
                          crossOrigin="anonymous"
                          playsInline
                          preload="metadata"
                          muted={!subtitlePreviewAdAudio || voiceoverEnabled || !adAudioEnabled}
                          style={{
                            position: 'absolute',
                            zIndex: 2,
                            left: `${x * 100}%`,
                            top: `${y * 100}%`,
                            width: `${width * 100}%`,
                            height: 'auto',
                            maxWidth: 'none',
                            display: subtitlePreviewAdVideo && subtitlePreviewPhase === 'ad' ? 'block' : 'none',
                            pointerEvents: 'none',
                          }}
                          onLoadedMetadata={(event) => { event.currentTarget.currentTime = adTrimStart; }}
                          onTimeUpdate={finishDedicatedAdPreview}
                          onEnded={finishDedicatedAdPreview}
                        />
                      )}
                      <audio
                        ref={subtitleAudioPreviewRef}
                        key={`subtitle-guide-${guideAudioUrl}`}
                        src={guideAudioUrl}
                        crossOrigin="anonymous"
                        preload="metadata"
                        muted={!subtitlePreviewGuideAudio}
                        onPlay={(event) => ensureAudioPreviewGain(event.currentTarget, subtitleAudioGraphRef)}
                        onTimeUpdate={(event) => updateDedicatedSubtitleTime(event.currentTarget)}
                        onEnded={finishDedicatedGuidePreview}
                      />
                      {dedicatedSubtitleCue && (subtitlePreviewPhase === 'lead' || subtitlePreviewPhase === 'ad') && (
                        <div
                          style={{
                            position: 'absolute',
                            zIndex: 4,
                            pointerEvents: 'none',
                            left: '5%',
                            right: '5%',
                            top: subtitleSettings.style.position === 'top'
                              ? `${subtitleSettings.style.verticalMargin}%`
                              : subtitleSettings.style.position === 'center' ? '50%' : undefined,
                            bottom: subtitleSettings.style.position === 'bottom'
                              ? `${subtitleSettings.style.verticalMargin}%`
                              : undefined,
                            transform: subtitleSettings.style.position === 'center' ? 'translateY(-50%)' : undefined,
                            textAlign: 'center',
                            whiteSpace: 'pre-line',
                            fontFamily: subtitleSettings.style.fontFamily,
                            fontSize: `${subtitleSettings.style.fontSize / Math.max(sourceSize.width, 1) * 100}cqw`,
                            lineHeight: 1.28,
                            color: subtitleSettings.style.color,
                            WebkitTextStroke: `${subtitleSettings.style.outlineWidth / Math.max(sourceSize.width, 1) * 100}cqw ${subtitleSettings.style.outlineColor}`,
                            paintOrder: 'stroke fill',
                          }}
                        >
                          <span style={{
                            padding: subtitleSettings.style.backgroundOpacity > 0 ? '.1em .28em' : 0,
                            borderRadius: 4,
                            background: subtitleSettings.style.backgroundOpacity > 0
                              ? `${subtitleSettings.style.backgroundColor}${Math.round(subtitleSettings.style.backgroundOpacity * 255).toString(16).padStart(2, '0')}`
                              : 'transparent',
                          }}>
                            {dedicatedSubtitleCue.text}
                          </span>
                        </div>
                      )}
                      <Tag color="purple" style={{ position: 'absolute', top: 12, right: 12, zIndex: 5 }}>
                        {subtitlePreviewPhase === 'lead' ? '引导阶段' : subtitlePreviewPhase === 'ad' ? '广告阶段' : subtitlePreviewPhase === 'done' ? '预览结束' : '等待播放'}
                      </Tag>
                    </div>
                    <Space wrap style={{ justifyContent: 'center', width: '100%' }}>
                      <Button type="primary" onClick={startDedicatedSubtitlePreview}>从头预览</Button>
                      <Button
                        disabled={subtitlePreviewPhase === 'idle' || subtitlePreviewPhase === 'done'}
                        onClick={toggleDedicatedSubtitlePreview}
                      >
                        {subtitlePreviewPlaying ? '暂停' : '继续'}
                      </Button>
                      <Button disabled={subtitlePreviewPhase === 'idle'} onClick={stopDedicatedSubtitlePreview}>停止并复位</Button>
                      <Tag>引导音频位置：{subtitlePreviewTime.toFixed(2)} 秒</Tag>
                      {guidePauseSource && <Tag color="blue">引导期间母片定格</Tag>}
                      {pauseSource && <Tag color="gold">广告期间母片定格</Tag>}
                    </Space>
                  </>
                ) : (
                  <Empty description="请选择母片和广告引导音频后使用组合预览" />
                )}
              </Space>
            </Card>
          </Space>
        </Card>

        <Card title={mode === 'plain-overlay' ? '5. 声音' : '5. 抠绿和声音'}>
          <Form layout="vertical">
            {mode === 'chroma-key' && (
            <Row gutter={20}>
              <Col span={24}>
                <Space wrap style={{ marginBottom: 16 }}>
                  <Button type="primary" onClick={importChromaTestSettings}>一键导入“抠绿参数测试”的参数</Button>
                  <Text type="secondary">仅导入绿幕颜色、颜色容差和边缘融合。</Text>
                </Space>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="绿幕颜色">
                  <Space.Compact style={{ width: '100%' }}>
                    <ColorPicker value={keyColor} onChange={(color) => setKeyColor(color.toHexString())} showText />
                    <Input value={keyColor} onChange={(event) => setKeyColor(event.target.value)} />
                  </Space.Compact>
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label={`颜色容差：${similarity.toFixed(2)}`}>
                  <Slider min={0.01} max={1} step={0.01} value={similarity} onChange={setSimilarity} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label={`边缘融合：${blend.toFixed(2)}`}>
                  <Slider min={0} max={1} step={0.01} value={blend} onChange={setBlend} />
                </Form.Item>
              </Col>
            </Row>
            )}
            <Row gutter={20}>
              <Col xs={24} md={8}>
                <Form.Item label="保留广告声音">
                  <Switch
                    disabled={voiceoverEnabled}
                    checked={voiceoverEnabled ? false : adAudioEnabled}
                    onChange={setAdAudioEnabled}
                  />
                  {voiceoverEnabled && <Text type="secondary" style={{ marginLeft: 8 }}>总配音模式下自动静音</Text>}
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label={`广告音量：${Math.round(adVolume * 100)}%`}>
                  <Slider disabled={!adAudioEnabled || voiceoverEnabled} min={0} max={2} step={0.05} value={adVolume} onChange={setAdVolume} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label={`广告期间母片音量：${Math.round(sourceVolumeDuringAd * 100)}%`}>
                  <Slider
                    disabled={effectivePauseSource}
                    min={0}
                    max={1}
                    step={0.05}
                    value={sourceVolumeDuringAd}
                    onChange={setSourceVolumeDuringAd}
                  />
                  {effectivePauseSource && <Text type="secondary">暂停或直接插入模式下，母片声音也会暂停。</Text>}
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>

        <Card>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Button
              type="primary"
              size="large"
              icon={<RocketOutlined />}
              loading={submitting}
              disabled={!sourceVideo || !greenScreenVideo}
              onClick={() => void submit()}
            >
              创建广告合成任务
            </Button>
            {lastTaskId && (
              <Alert
                type="success"
                showIcon
                message={`任务 ${lastTaskId} 已加入渲染队列`}
                description="可以前往“导出与渲染队列”查看进度和输出路径。"
              />
            )}
            <Text type="secondary"><VideoCameraOutlined /> 输出将保存在 out/，文件名包含 -ad- 和任务编号。</Text>
          </Space>
        </Card>
      </Space>
    </div>
  );
};
