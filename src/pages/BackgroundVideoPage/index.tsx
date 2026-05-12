import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Radio,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from 'antd';
import { ReloadOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { BackgroundVideoConfig } from '@/types';
import { useVideoStore } from '@/store';
import { getActiveVideoCanvasSize, getAspectRatioLabel } from '@/rendering/videoCanvas';

const { Text, Title } = Typography;

const RENDER_API_BASE = 'http://localhost:5000';
const DEFAULT_BACKGROUND_VIDEO: BackgroundVideoConfig = {
  enabled: false,
  src: '',
  fit: 'cover',
  opacity: 1,
  overlayColor: 'rgba(0,0,0,0.25)',
  blurredBackgroundEnabled: false,
  blurredBackgroundBlur: 24,
  playbackRate: 1,
  startOffset: 0,
  audioEnabled: false,
  audioVolume: 0.35,
  playbackMode: 'play-once',
  repeatCount: 1,
  afterEndMode: 'color',
  afterEndColor: '#000000',
  afterEndImageSrc: '',
  timelineMode: 'cut-at-dsl-end',
};

interface BackgroundVideoItem {
  name: string;
  path: string;
  url: string;
}

const getPreviewUrl = (src?: string): string => {
  const normalized = (src || '').trim().replace(/^\/+/, '');
  return normalized ? `/${normalized}` : '';
};

const formatDuration = (seconds?: number): string => {
  if (!seconds || !Number.isFinite(seconds)) return '--:--';
  const rounded = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
};

export const BackgroundVideoPage: React.FC = () => {
  const { videoConfig, setVideoConfig } = useVideoStore();
  const backgroundVideo = useMemo(
    () => ({ ...DEFAULT_BACKGROUND_VIDEO, ...(videoConfig.backgroundVideo || {}) }),
    [videoConfig.backgroundVideo]
  );
  const [items, setItems] = useState<BackgroundVideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewDuration, setPreviewDuration] = useState<number | undefined>(backgroundVideo.durationInSeconds);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const blurredVideoRef = useRef<HTMLVideoElement | null>(null);

  const dslDuration = useMemo(
    () => videoConfig.scenes.reduce((sum, scene) => sum + (scene.duration || 0), 0),
    [videoConfig.scenes]
  );

  const backgroundPlayDuration = useMemo(() => {
    if (!backgroundVideo.durationInSeconds) return 0;
    const playbackRate = backgroundVideo.playbackRate && backgroundVideo.playbackRate > 0 ? backgroundVideo.playbackRate : 1;
    const base = Math.max(0, backgroundVideo.durationInSeconds - (backgroundVideo.startOffset || 0)) / playbackRate;
    const repeatCount = backgroundVideo.playbackMode === 'repeat-count'
      ? Math.max(1, Math.floor(backgroundVideo.repeatCount || 1))
      : 1;
    return base * repeatCount;
  }, [backgroundVideo]);

  const finalDuration = backgroundVideo.timelineMode === 'wait-for-background'
    ? Math.max(dslDuration, backgroundPlayDuration || dslDuration)
    : dslDuration;
  const selectedUrl = getPreviewUrl(backgroundVideo.src);
  const activeCanvas = getActiveVideoCanvasSize(videoConfig);
  const activeAspectRatioLabel = getAspectRatioLabel(activeCanvas.width, activeCanvas.height);
  const previewMaxWidth = Math.min(
    720,
    activeCanvas.width,
    Math.round((520 * activeCanvas.width) / activeCanvas.height)
  );
  const shouldShowBlurredBackground = backgroundVideo.fit === 'contain' && backgroundVideo.blurredBackgroundEnabled;
  const previewOpacity = Math.max(0, Math.min(1, backgroundVideo.opacity ?? 1));
  const previewBlurAmount = Math.max(0, backgroundVideo.blurredBackgroundBlur ?? 24);

  const updateBackgroundVideo = (updates: Partial<BackgroundVideoConfig>) => {
    setVideoConfig({
      ...videoConfig,
      backgroundVideo: {
        ...backgroundVideo,
        ...updates,
      },
    });
  };

  const fetchBackgroundVideos = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${RENDER_API_BASE}/list_background_videos`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || '背景视频列表读取失败');
      }
      setItems(Array.isArray(payload.files) ? payload.files : []);
    } catch (err: any) {
      message.warning(err.message || '无法连接本地服务，请确认 Python 服务已启动');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchBackgroundVideos();
  }, []);

  useEffect(() => {
    setPreviewDuration(backgroundVideo.durationInSeconds);
  }, [backgroundVideo.durationInSeconds, backgroundVideo.src]);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !backgroundVideo.audioEnabled;
    videoRef.current.volume = Math.max(0, Math.min(1, backgroundVideo.audioVolume ?? 0.35));
    videoRef.current.playbackRate = backgroundVideo.playbackRate && backgroundVideo.playbackRate > 0
      ? backgroundVideo.playbackRate
      : 1;
    if (blurredVideoRef.current) {
      blurredVideoRef.current.playbackRate = videoRef.current.playbackRate;
    }
  }, [backgroundVideo.audioEnabled, backgroundVideo.audioVolume, backgroundVideo.playbackRate, selectedUrl]);

  const syncBlurredPreviewVideo = () => {
    const foreground = videoRef.current;
    const blurred = blurredVideoRef.current;
    if (!foreground || !blurred) return;

    if (Math.abs(blurred.currentTime - foreground.currentTime) > 0.08) {
      blurred.currentTime = foreground.currentTime;
    }
    blurred.playbackRate = foreground.playbackRate;
    if (foreground.paused) {
      blurred.pause();
    } else {
      void blurred.play().catch(() => undefined);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2}>背景视频轨道</Title>
          <Text type="secondary">
            背景视频只在最终导出中渲染，普通预览页和场景卡片不会加载该视频。
          </Text>
        </div>

        <Alert
          type="info"
          showIcon
          message="本地视频目录"
          description="请把素材放入 public/background-videos/，然后点击刷新。配置保存的是 background-videos/xxx.mp4 这样的相对路径。"
        />

        <Row gutter={[24, 24]}>
          <Col xs={24} lg={10}>
            <Card
              title="选择背景视频"
              extra={(
                <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void fetchBackgroundVideos()}>
                  刷新
                </Button>
              )}
            >
              <List
                loading={loading}
                dataSource={items}
                locale={{ emptyText: <Empty description="未发现背景视频" /> }}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Button
                        key="select"
                        type={backgroundVideo.src === item.path ? 'primary' : 'default'}
                        onClick={() => updateBackgroundVideo({ enabled: true, src: item.path })}
                      >
                        {backgroundVideo.src === item.path ? '已选择' : '选择'}
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<VideoCameraOutlined style={{ fontSize: 22 }} />}
                      title={item.name}
                      description={<Text code>{item.path}</Text>}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>

          <Col xs={24} lg={14}>
            <Card title={`单独预览背景视频 · ${activeAspectRatioLabel}`}>
              {selectedUrl ? (
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <div
                    style={{
                      width: '100%',
                      maxWidth: previewMaxWidth,
                      aspectRatio: `${activeCanvas.width} / ${activeCanvas.height}`,
                      maxHeight: 520,
                      margin: '0 auto',
                      position: 'relative',
                      overflow: 'hidden',
                      background: backgroundVideo.afterEndColor || '#000000',
                      borderRadius: 8,
                      boxShadow: '0 14px 40px rgba(0, 0, 0, 0.28)',
                    }}
                  >
                    {shouldShowBlurredBackground && (
                      <video
                        ref={blurredVideoRef}
                        src={selectedUrl}
                        muted
                        playsInline
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          opacity: previewOpacity,
                          filter: `blur(${previewBlurAmount}px)`,
                          transform: 'scale(1.08)',
                          pointerEvents: 'none',
                        }}
                      />
                    )}
                    <video
                      ref={videoRef}
                      src={selectedUrl}
                      controls
                      style={{
                        position: 'relative',
                        zIndex: 1,
                        width: '100%',
                        height: '100%',
                        display: 'block',
                        objectFit: backgroundVideo.fit || 'cover',
                        opacity: previewOpacity,
                      }}
                      onLoadedMetadata={(event) => {
                        const video = event.currentTarget;
                        const duration = video.duration;
                        if (Number.isFinite(duration) && duration > 0) {
                          setPreviewDuration(duration);
                          updateBackgroundVideo({ durationInSeconds: Math.round(duration * 1000) / 1000 });
                        }
                        const startOffset = Math.max(0, backgroundVideo.startOffset || 0);
                        if (startOffset > 0 && Number.isFinite(duration) && startOffset < duration) {
                          video.currentTime = startOffset;
                        }
                        if (blurredVideoRef.current) {
                          blurredVideoRef.current.currentTime = video.currentTime;
                        }
                      }}
                      onPlay={syncBlurredPreviewVideo}
                      onPause={syncBlurredPreviewVideo}
                      onSeeked={syncBlurredPreviewVideo}
                      onTimeUpdate={syncBlurredPreviewVideo}
                      onRateChange={syncBlurredPreviewVideo}
                    />
                    {backgroundVideo.overlayColor && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          zIndex: 2,
                          background: backgroundVideo.overlayColor,
                          pointerEvents: 'none',
                        }}
                      />
                    )}
                  </div>
                  <Space wrap>
                    <Tag color={backgroundVideo.enabled ? 'success' : 'default'}>
                      {backgroundVideo.enabled ? '最终导出启用' : '最终导出未启用'}
                    </Tag>
                    <Tag>{activeCanvas.width} x {activeCanvas.height}</Tag>
                    <Tag>素材时长：{formatDuration(previewDuration)}</Tag>
                    <Tag>DSL 轨道：{formatDuration(dslDuration)}</Tag>
                    <Tag color="blue">最终导出：{formatDuration(finalDuration)}</Tag>
                  </Space>
                </Space>
              ) : (
                <Empty description="请选择一个背景视频" />
              )}
            </Card>
          </Col>
        </Row>

        <Card title="背景视频设置">
          <Form layout="vertical">
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item label="最终导出启用背景视频">
                  <Switch
                    checked={Boolean(backgroundVideo.enabled)}
                    onChange={(enabled) => updateBackgroundVideo({ enabled })}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="填充方式">
                  <Select
                    value={backgroundVideo.fit}
                    onChange={(fit) => updateBackgroundVideo({ fit })}
                    options={[
                      { label: '裁剪铺满 cover', value: 'cover' },
                      { label: '完整显示 contain', value: 'contain' },
                      { label: '拉伸 fill', value: 'fill' },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="不透明度">
                  <InputNumber
                    min={0}
                    max={1}
                    step={0.05}
                    style={{ width: '100%' }}
                    value={backgroundVideo.opacity}
                    onChange={(value) => updateBackgroundVideo({ opacity: value ?? 1 })}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item label="完整显示时启用毛玻璃背景">
                  <Switch
                    checked={Boolean(backgroundVideo.blurredBackgroundEnabled)}
                    disabled={backgroundVideo.fit !== 'contain'}
                    onChange={(blurredBackgroundEnabled) => updateBackgroundVideo({ blurredBackgroundEnabled })}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="毛玻璃模糊强度（px）">
                  <InputNumber
                    min={0}
                    max={80}
                    step={2}
                    style={{ width: '100%' }}
                    disabled={backgroundVideo.fit !== 'contain' || !backgroundVideo.blurredBackgroundEnabled}
                    value={backgroundVideo.blurredBackgroundBlur}
                    onChange={(value) => updateBackgroundVideo({ blurredBackgroundBlur: value ?? 24 })}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Alert
                  type="info"
                  showIcon
                  message="只作用于 contain"
                  description="底层会复制同一视频并 cover 铺满、放大模糊，用来补齐完整显示产生的边缘空白。"
                />
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item label="播放模式">
                  <Radio.Group
                    value={backgroundVideo.playbackMode}
                    onChange={(event) => updateBackgroundVideo({ playbackMode: event.target.value })}
                  >
                    <Radio.Button value="play-once">播完停止</Radio.Button>
                    <Radio.Button value="repeat-count">重复次数</Radio.Button>
                  </Radio.Group>
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="重复播放次数">
                  <InputNumber
                    min={1}
                    step={1}
                    style={{ width: '100%' }}
                    disabled={backgroundVideo.playbackMode !== 'repeat-count'}
                    value={backgroundVideo.repeatCount}
                    onChange={(value) => updateBackgroundVideo({ repeatCount: value ?? 1 })}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="播放速度">
                  <InputNumber
                    min={0.1}
                    step={0.1}
                    style={{ width: '100%' }}
                    value={backgroundVideo.playbackRate}
                    onChange={(value) => updateBackgroundVideo({ playbackRate: value ?? 1 })}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item label="最终导出启用背景视频声音">
                  <Switch
                    checked={Boolean(backgroundVideo.audioEnabled)}
                    onChange={(audioEnabled) => updateBackgroundVideo({ audioEnabled })}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="背景视频声音大小">
                  <InputNumber<number>
                    min={0}
                    step={5}
                    style={{ width: '100%' }}
                    disabled={!backgroundVideo.audioEnabled}
                    value={Math.round((backgroundVideo.audioVolume ?? 0.35) * 100)}
                    formatter={(value) => `${value ?? 0}%`}
                    parser={(value) => {
                      const parsed = Number((value || '').replace(/[^\d.]/g, ''));
                      return Number.isFinite(parsed) ? parsed : 0;
                    }}
                    onChange={(value) => updateBackgroundVideo({ audioVolume: (value ?? 35) / 100 })}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item label="视频开始偏移（秒）">
                  <InputNumber
                    min={0}
                    step={0.1}
                    style={{ width: '100%' }}
                    value={backgroundVideo.startOffset}
                    onChange={(value) => updateBackgroundVideo({ startOffset: value ?? 0 })}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="DSL 结束后">
                  <Radio.Group
                    value={backgroundVideo.timelineMode}
                    onChange={(event) => updateBackgroundVideo({ timelineMode: event.target.value })}
                  >
                    <Radio.Button value="cut-at-dsl-end">掐断背景</Radio.Button>
                    <Radio.Button value="wait-for-background">等背景结束</Radio.Button>
                  </Radio.Group>
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="暗化/色彩遮罩">
                  <Input
                    value={backgroundVideo.overlayColor}
                    placeholder="rgba(0,0,0,0.25)"
                    onChange={(event) => updateBackgroundVideo({ overlayColor: event.target.value })}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item label="视频结束后显示">
                  <Radio.Group
                    value={backgroundVideo.afterEndMode}
                    onChange={(event) => updateBackgroundVideo({ afterEndMode: event.target.value })}
                  >
                    <Radio.Button value="color">纯色</Radio.Button>
                    <Radio.Button value="image">图片</Radio.Button>
                  </Radio.Group>
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="结束后纯色背景">
                  <Input
                    value={backgroundVideo.afterEndColor}
                    placeholder="#000000"
                    onChange={(event) => updateBackgroundVideo({ afterEndColor: event.target.value })}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="结束后图片路径">
                  <Input
                    value={backgroundVideo.afterEndImageSrc}
                    placeholder="background-videos/end-card.png"
                    disabled={backgroundVideo.afterEndMode !== 'image'}
                    onChange={(event) => updateBackgroundVideo({ afterEndImageSrc: event.target.value })}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>
      </Space>
    </div>
  );
};

export default BackgroundVideoPage;
