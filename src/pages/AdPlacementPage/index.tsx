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

const getVideoUrl = (path?: string) =>
  path ? `${API_BASE}/proxy_local_video?path=${encodeURIComponent(path)}` : '';
const getAudioUrl = (path?: string) =>
  path ? `${API_BASE}/proxy_local_audio?path=${encodeURIComponent(path)}` : '';

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

const hexToRgb = (value: string) => {
  const normalized = value.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return { r: 0, g: 255, b: 0 };
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
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
  const [keyColor, setKeyColor] = useState('#00ff00');
  const [similarity, setSimilarity] = useState(0.3);
  const [blend, setBlend] = useState(0.08);
  const [adAudioEnabled, setAdAudioEnabled] = useState(true);
  const [adVolume, setAdVolume] = useState(1);
  const [sourceVolumeDuringAd, setSourceVolumeDuringAd] = useState(0.25);
  const [lastTaskId, setLastTaskId] = useState('');
  const [previewPauseActive, setPreviewPauseActive] = useState(false);
  const [previewPhase, setPreviewPhase] = useState<'idle' | 'lead' | 'ad' | 'done'>('idle');
  const [previewRenderError, setPreviewRenderError] = useState('');
  const sourcePreviewRef = useRef<HTMLVideoElement | null>(null);
  const adPreviewRef = useRef<HTMLVideoElement | null>(null);
  const guidePreviewRef = useRef<HTMLAudioElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scratchCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pausePreviewActiveRef = useRef(false);
  const pausePreviewCompletedRef = useRef(false);
  const previewPhaseRef = useRef<'idle' | 'lead' | 'ad' | 'done'>('idle');

  const sourceUrl = getVideoUrl(sourceVideo);
  const greenScreenUrl = getVideoUrl(greenScreenVideo);
  const guideAudioUrl = getAudioUrl(guideAudio);
  const voiceoverEnabled = Boolean(guideAudio) && guideMode === 'voiceover';
  const effectivePauseSource = pauseSource;
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
      const rendered = Array.isArray(payload.rendered) ? payload.rendered : [];
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
    setPreviewPhase('idle');
    setPreviewPauseActive(false);
    setPreviewRenderError('');
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
    ad.muted = !adAudioEnabled;
    ad.volume = Math.max(0, Math.min(1, adVolume));
  }, [adAudioEnabled, adVolume, greenScreenUrl]);

  useEffect(() => {
    const guide = guidePreviewRef.current;
    if (guide) {
      guide.volume = Math.max(0, Math.min(1, guideVolume));
      applyGuidePlaybackRate(guide, guidePlaybackRate);
    }
    setAdVideoDelay((current) => Math.min(current, Math.max(0, guidePlaybackDuration - 0.01)));
  }, [guideVolume, guidePlaybackRate, guideAudioUrl, guidePlaybackDuration]);

  useEffect(() => {
    let animationFrame = 0;
    let disposed = false;

    const renderOverlay = () => {
      if (disposed) return;
      const source = sourcePreviewRef.current;
      const ad = adPreviewRef.current;
      const canvas = overlayCanvasRef.current;
      if (source && ad && canvas && source.videoWidth > 0 && ad.videoWidth > 0) {
        const previewWidth = Math.min(960, source.videoWidth);
        const previewHeight = Math.max(1, Math.round(previewWidth * source.videoHeight / source.videoWidth));
        if (canvas.width !== previewWidth || canvas.height !== previewHeight) {
          canvas.width = previewWidth;
          canvas.height = previewHeight;
        }
        const context = canvas.getContext('2d');
        context?.clearRect(0, 0, canvas.width, canvas.height);

        const inOverlayWindow = previewPhaseRef.current === 'ad';
        if (context && inOverlayWindow && ad.readyState >= 2) {
          const targetWidth = Math.max(2, Math.round(canvas.width * width));
          const targetHeight = Math.max(2, Math.round(targetWidth * ad.videoHeight / ad.videoWidth));
          const processingScale = Math.min(
            1,
            canvas.width / targetWidth,
            canvas.height / targetHeight
          );
          const processingWidth = Math.max(2, Math.round(targetWidth * processingScale));
          const processingHeight = Math.max(2, Math.round(targetHeight * processingScale));
          const scratch = scratchCanvasRef.current || document.createElement('canvas');
          scratchCanvasRef.current = scratch;
          if (scratch.width !== processingWidth || scratch.height !== processingHeight) {
            scratch.width = processingWidth;
            scratch.height = processingHeight;
          }
          const scratchContext = scratch.getContext('2d', { willReadFrequently: mode === 'chroma-key' });
          if (scratchContext) {
            scratchContext.clearRect(0, 0, processingWidth, processingHeight);
            scratchContext.drawImage(ad, 0, 0, processingWidth, processingHeight);
            if (mode === 'chroma-key') {
              try {
                const frame = scratchContext.getImageData(0, 0, processingWidth, processingHeight);
                const pixels = frame.data;
                const key = hexToRgb(keyColor);
                const maxDistance = Math.sqrt(3 * 255 * 255);
                for (let index = 0; index < pixels.length; index += 4) {
                  const red = pixels[index];
                  const green = pixels[index + 1];
                  const blue = pixels[index + 2];
                  const distance = Math.sqrt(
                    (red - key.r) ** 2 + (green - key.g) ** 2 + (blue - key.b) ** 2
                  ) / maxDistance;
                  if (distance <= similarity) {
                    pixels[index + 3] = 0;
                  } else if (blend > 0 && distance < similarity + blend) {
                    pixels[index + 3] = Math.round(255 * (distance - similarity) / blend);
                  }
                }
                scratchContext.putImageData(frame, 0, 0);
                if (previewRenderError) setPreviewRenderError('');
              } catch {
                if (!previewRenderError) {
                  setPreviewRenderError('浏览器无法读取广告帧，预览暂时不抠绿；最终 FFmpeg 输出不受影响。');
                }
              }
            }
            context.drawImage(
              scratch,
              Math.round(canvas.width * x),
              Math.round(canvas.height * y),
              targetWidth,
              targetHeight
            );
          }
        }
      }
      animationFrame = window.requestAnimationFrame(renderOverlay);
    };

    animationFrame = window.requestAnimationFrame(renderOverlay);
    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
    };
  }, [mode, x, y, width, keyColor, similarity, blend, startAt, adDuration, pauseSource, previewRenderError]);

  const setPreviewPhaseValue = (phase: 'idle' | 'lead' | 'ad' | 'done') => {
    previewPhaseRef.current = phase;
    setPreviewPhase(phase);
  };

  const beginAdPreview = () => {
    const source = sourcePreviewRef.current;
    const ad = adPreviewRef.current;
    if (!source || !ad) return;
    setPreviewPhaseValue('ad');
    const guideStillPauses = guideMode === 'voiceover'
      && guidePauseSource
      && Boolean(guidePreviewRef.current && !guidePreviewRef.current.ended);
    const shouldPause = pauseSource || guideStillPauses;
    pausePreviewActiveRef.current = shouldPause;
    setPreviewPauseActive(shouldPause);
    if (shouldPause) source.pause();
    else if (source.paused) void source.play().catch(() => undefined);
    ad.currentTime = adTrimStart;
    void ad.play().catch(() => undefined);
  };

  const startPausedAdPreviewIfNeeded = () => {
    const source = sourcePreviewRef.current;
    if (!source) return;
    if (previewPhaseRef.current === 'lead') {
      if (!guidePauseSource) void guidePreviewRef.current?.play().catch(() => undefined);
      return;
    }
    if (previewPhaseRef.current === 'ad') {
      if (!pauseSource) void adPreviewRef.current?.play().catch(() => undefined);
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
    if (source) void source.play().catch(() => undefined);
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
    ad.pause();
    ad.currentTime = adTrimStart;
    guide?.pause();
    if (guide) guide.currentTime = 0;
    setPreviewPhaseValue(source.currentTime > startAt + 0.03 ? 'done' : 'idle');
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

  const applyPreset = (preset: PositionPreset) => {
    const margin = 0.04;
    const normalizedHeight = width
      * (sourceSize.width / Math.max(sourceSize.height, 1))
      * (adSize.height / Math.max(adSize.width, 1));
    const nextX = preset.endsWith('left')
      ? margin
      : preset.endsWith('right')
        ? 1 - margin - width
        : (1 - width) / 2;
    const nextY = preset.startsWith('top')
      ? margin
      : preset.startsWith('bottom')
        ? 1 - margin - normalizedHeight
        : (1 - normalizedHeight) / 2;
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
                      onPlay={startVoiceoverAdIfNeeded}
                      onTimeUpdate={startVoiceoverAdIfNeeded}
                      onEnded={finishGuidePreview}
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
            <Card title="位置预览">
              {sourceUrl ? (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      aspectRatio: `${sourceSize.width} / ${sourceSize.height}`,
                      overflow: 'hidden',
                      borderRadius: 10,
                      background: '#000',
                      boxShadow: '0 14px 40px rgba(0,0,0,.28)',
                    }}
                  >
                    <video
                      ref={sourcePreviewRef}
                      key={sourceUrl}
                      src={sourceUrl}
                      crossOrigin="anonymous"
                      controls
                      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                      onPlay={startPausedAdPreviewIfNeeded}
                      onTimeUpdate={startPausedAdPreviewIfNeeded}
                      onSeeked={resetPreviewAfterSeek}
                      onPause={() => {
                        if (!pausePreviewActiveRef.current) adPreviewRef.current?.pause();
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
                    <canvas
                      ref={overlayCanvasRef}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none',
                        zIndex: 2,
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
                        style={{ display: 'none' }}
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
                  </div>
                  {previewRenderError && <Alert type="warning" showIcon message={previewRenderError} />}
                  <Text type="secondary">
                    {mode === 'plain-overlay'
                      ? '预览会按开始时间同步普通广告视频；暂停模式也会冻结母片，广告结束后再继续播放。'
                      : '预览会实时抠绿并同步开始时间；边缘颜色可能与最终 FFmpeg 成片略有差异，以成片为准。'}
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
              <Space wrap style={{ marginBottom: 20 }}>
                <Text><AimOutlined /> 快速位置：</Text>
                <Button onClick={() => applyPreset('top-left')}>左上</Button>
                <Button onClick={() => applyPreset('top-right')}>右上</Button>
                <Button onClick={() => applyPreset('center')}>居中</Button>
                <Button onClick={() => applyPreset('bottom-left')}>左下</Button>
                <Button onClick={() => applyPreset('bottom-right')}>右下</Button>
              </Space>
              <Row gutter={20}>
                <Col xs={24} md={8}>
                  <Text>横向位置：{Math.round(x * 100)}%</Text>
                  <Space.Compact style={{ width: '100%', marginTop: 8 }}>
                    <Slider
                      min={-5}
                      max={1}
                      step={0.01}
                      value={x}
                      onChange={setX}
                      style={{ flex: 1, marginInline: 10 }}
                    />
                    <InputNumber<number>
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
                      min={-5}
                      max={1}
                      step={0.01}
                      value={y}
                      onChange={setY}
                      style={{ flex: 1, marginInline: 10 }}
                    />
                    <InputNumber<number>
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
                      onChange={setWidth}
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
                      onChange={(value) => setWidth((value ?? 5) / 100)}
                      style={{ width: 100 }}
                    />
                  </Space.Compact>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        <Card title={mode === 'plain-overlay' ? '4. 声音' : '4. 抠绿和声音'}>
          <Form layout="vertical">
            {mode === 'chroma-key' && (
            <Row gutter={20}>
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
