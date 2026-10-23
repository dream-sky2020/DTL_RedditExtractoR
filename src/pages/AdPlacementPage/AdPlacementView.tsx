import React from "react";
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
  Slider,
  Space,
  Switch,
  Tag,
  Typography,
} from "antd";
import {
  ReloadOutlined,
  RocketOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import { PlacementControls } from "./components/PlacementControls";
import { SubtitleEditor } from "./components/SubtitleEditor";
import { MediaFileSelect } from "./components/MediaFileSelect";

import type {
  AdSubtitleCue,
  AdSubtitleSettings,
} from "@/utils/adSubtitleSettings";
import type {
  AdMode,
  GuideAudioMode,
  PositionPreset,
  VideoItem,
} from "./types";

export interface AdPlacementState {
  loading: boolean;
  mode: "chroma-key" | "plain-overlay";
  renderedVideos: VideoItem[];
  sourceVideo: string;
  selectedSource: VideoItem | undefined;
  greenScreenVideos: VideoItem[];
  greenScreenVideo: string;
  greenScreenUrl: string;
  guideAudios: VideoItem[];
  guideAudio: string;
  guideAudioUrl: string;
  guideMode: "prelude" | "voiceover";
  voiceoverEnabled: boolean;
  guidePlaybackDuration: number;
  adVideoDelay: number;
  guidePauseSource: boolean;
  sourceVolumeDuringGuide: number;
  guideVolumeTransitionDuration: number;
  guideVolume: number;
  guidePlaybackRate: number;
  sourceDuration: number;
  startAt: number;
  adDuration: number;
  adTrimStart: number;
  resolvedAdTrimEnd: number;
  selectedAdDuration: number;
  pauseSource: boolean;
  guideDuration: number;
  estimatedDuration: number;
  sourceUrl: string;
  timelinePreviewEnabled: boolean;
  sourcePreviewPlaying: boolean;
  previewMaxWidth: number;
  sourceSize: { width: number; height: number };
  width: number;
  x: number;
  y: number;
  previewPhase: "idle" | "lead" | "ad" | "done";
  previewPauseActive: boolean;
  activeSubtitleCue: AdSubtitleCue | undefined;
  subtitleSettings: AdSubtitleSettings;
  adNormalizedHeight: number;
  autoCenterPlacement: boolean;
  subtitlePreviewText: string;
  subtitlePreviewSourceAudio: boolean;
  subtitlePreviewGuideAudio: boolean;
  subtitlePreviewSubtitles: boolean;
  subtitlePreviewAdVideo: boolean;
  adAudioEnabled: boolean;
  subtitlePreviewAdAudio: boolean;
  subtitlePreviewPhase: "idle" | "lead" | "ad" | "done";
  dedicatedSubtitleCue: AdSubtitleCue | undefined;
  subtitlePreviewPlaying: boolean;
  subtitlePreviewTime: number;
  keyColor: string;
  similarity: number;
  blend: number;
  adVolume: number;
  sourceVolumeDuringAd: number;
  effectivePauseSource: boolean;
  submitting: boolean;
  lastTaskId: string;
}

export interface AdPlacementActions {
  loadVideos: () => Promise<void>;
  setMode: React.Dispatch<React.SetStateAction<"chroma-key" | "plain-overlay">>;
  setSourceVideo: React.Dispatch<React.SetStateAction<string>>;
  pickVideo: (kind: "source" | "green") => Promise<void>;
  setGreenScreenVideo: React.Dispatch<React.SetStateAction<string>>;
  previewAdMaterialOnly: () => void;
  stopAdMaterialAtRangeEnd: () => void;
  changeGuideAudio: (path: string) => void;
  pickGuideAudio: () => Promise<void>;
  handleGuidePreviewOnLoadedMetadata: (
    event: React.SyntheticEvent<HTMLAudioElement>,
  ) => void;
  handleGuidePreviewOnPlay: (
    event: React.SyntheticEvent<HTMLAudioElement>,
  ) => void;
  handleGuidePreviewOnTimeUpdate: (
    event: React.SyntheticEvent<HTMLAudioElement>,
  ) => void;
  handleGuidePreviewOnSeeked: (
    event: React.SyntheticEvent<HTMLAudioElement>,
  ) => void;
  handleGuidePreviewOnEnded: () => void;
  setGuideMode: React.Dispatch<React.SetStateAction<"prelude" | "voiceover">>;
  setAdVideoDelay: React.Dispatch<React.SetStateAction<number>>;
  setGuidePauseSource: React.Dispatch<React.SetStateAction<boolean>>;
  setSourceVolumeDuringGuide: React.Dispatch<React.SetStateAction<number>>;
  setGuideVolumeTransitionDuration: React.Dispatch<
    React.SetStateAction<number>
  >;
  setGuideVolume: React.Dispatch<React.SetStateAction<number>>;
  setGuidePlaybackRate: React.Dispatch<React.SetStateAction<number>>;
  setStartAt: React.Dispatch<React.SetStateAction<number>>;
  setAdTrimStart: React.Dispatch<React.SetStateAction<number>>;
  setAdTrimEnd: React.Dispatch<React.SetStateAction<number>>;
  setPauseSource: React.Dispatch<React.SetStateAction<boolean>>;
  stopTimelinePreview: () => void;
  setTimelinePreviewEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  restartTimelinePreview: () => void;
  handleSourcePreviewOnPlay: () => void;
  handleSourcePreviewOnTimeUpdate: () => void;
  resetPreviewAfterSeek: () => void;
  handleSourcePause: () => void;
  handleSourcePreviewOnEnded: () => void;
  handleSourcePreviewOnVolumeChange: (
    event: React.SyntheticEvent<HTMLVideoElement>,
  ) => void;
  handleSourcePreviewOnLoadedMetadata: (
    event: React.SyntheticEvent<HTMLVideoElement>,
  ) => void;
  handleAdPreviewOnLoadedMetadata: (
    event: React.SyntheticEvent<HTMLVideoElement>,
  ) => void;
  finishAdRangeIfNeeded: () => void;
  finishPausedAdPreview: () => void;
  setAutoCenterPlacement: React.Dispatch<React.SetStateAction<boolean>>;
  setX: React.Dispatch<React.SetStateAction<number>>;
  setY: React.Dispatch<React.SetStateAction<number>>;
  updateWidthKeepingCenter: (nextWidth: number) => void;
  applyPreset: (preset: PositionPreset) => void;
  setSubtitleSettings: React.Dispatch<React.SetStateAction<AdSubtitleSettings>>;
  importSrt: () => Promise<void>;
  exportSrt: () => void;
  addSubtitleCue: () => void;
  updateSubtitleCue: (id: string, patch: Partial<AdSubtitleCue>) => void;
  handleSubtitleEditorGetGuideCurrentTime: () => number | undefined;
  handleSubtitleEditorSeekGuideAudio: (time: number) => void;
  setSubtitlePreviewSourceAudio: React.Dispatch<React.SetStateAction<boolean>>;
  setSubtitlePreviewGuideAudio: React.Dispatch<React.SetStateAction<boolean>>;
  setSubtitlePreviewSubtitles: React.Dispatch<React.SetStateAction<boolean>>;
  setSubtitlePreviewAdVideo: React.Dispatch<React.SetStateAction<boolean>>;
  setSubtitlePreviewAdAudio: React.Dispatch<React.SetStateAction<boolean>>;
  handleSubtitleVideoPreviewOnLoadedMetadata: (
    event: React.SyntheticEvent<HTMLVideoElement>,
  ) => void;
  handleSubtitleAdPreviewOnLoadedMetadata: (
    event: React.SyntheticEvent<HTMLVideoElement>,
  ) => void;
  finishDedicatedAdPreview: () => void;
  handleSubtitleAudioPreviewOnPlay: (
    event: React.SyntheticEvent<HTMLAudioElement>,
  ) => void;
  handleSubtitleAudioPreviewOnTimeUpdate: (
    event: React.SyntheticEvent<HTMLAudioElement>,
  ) => void;
  finishDedicatedGuidePreview: () => void;
  startDedicatedSubtitlePreview: () => void;
  toggleDedicatedSubtitlePreview: () => void;
  stopDedicatedSubtitlePreview: () => void;
  importChromaTestSettings: () => void;
  setKeyColor: React.Dispatch<React.SetStateAction<string>>;
  setSimilarity: React.Dispatch<React.SetStateAction<number>>;
  setBlend: React.Dispatch<React.SetStateAction<number>>;
  setAdAudioEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setAdVolume: React.Dispatch<React.SetStateAction<number>>;
  setSourceVolumeDuringAd: React.Dispatch<React.SetStateAction<number>>;
  submit: () => Promise<void>;
}

export interface AdPlacementMedia {
  adMaterialPreviewRef: React.RefObject<HTMLVideoElement | null>;
  guidePreviewRef: React.RefObject<HTMLAudioElement | null>;
  sourcePreviewRef: React.RefObject<HTMLVideoElement | null>;
  adPreviewRef: React.RefObject<HTMLVideoElement | null>;
  subtitleVideoPreviewRef: React.RefObject<HTMLVideoElement | null>;
  subtitleAdPreviewRef: React.RefObject<HTMLVideoElement | null>;
  subtitleAudioPreviewRef: React.RefObject<HTMLAudioElement | null>;
}

export interface AdPlacementViewProps {
  state: AdPlacementState;
  actions: AdPlacementActions;
  media: AdPlacementMedia;
}

const { Paragraph, Text, Title } = Typography;

export function AdPlacementView({
  state,
  actions,
  media,
}: AdPlacementViewProps) {
  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
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
              extra={
                <Button
                  icon={<ReloadOutlined />}
                  loading={state.loading}
                  onClick={() => void actions.loadVideos()}
                >
                  刷新
                </Button>
              }
            >
              <Form layout="vertical">
                <Form.Item label="处理方式">
                  <Radio.Group
                    value={state.mode}
                    onChange={(event) => actions.setMode(event.target.value)}
                  >
                    <Radio.Button value="chroma-key">绿幕融合</Radio.Button>
                    <Radio.Button value="plain-overlay">
                      普通视频覆盖
                    </Radio.Button>
                  </Radio.Group>
                </Form.Item>
                <Form.Item label="无广告母版">
                  <MediaFileSelect
                    items={state.renderedVideos}
                    value={state.sourceVideo}
                    placeholder="选择 out/ 中已经渲染的视频"
                    onChange={actions.setSourceVideo}
                    onPick={() => actions.pickVideo("source")}
                    pickLabel="选择文件"
                    emptyDescription="out/ 中没有视频"
                  />
                  {state.selectedSource && (
                    <Text type="secondary">{state.selectedSource.path}</Text>
                  )}
                </Form.Item>

                <Form.Item
                  label={
                    state.mode === "plain-overlay" ? "普通广告视频" : "绿幕广告视频"
                  }
                >
                  <MediaFileSelect
                    items={state.greenScreenVideos}
                    value={state.greenScreenVideo}
                    placeholder={
                      state.mode === "plain-overlay"
                        ? "选择要覆盖显示的普通视频"
                        : "选择绿幕广告素材"
                    }
                    onChange={actions.setGreenScreenVideo}
                    onPick={() => actions.pickVideo("green")}
                    pickLabel="选择文件"
                    emptyDescription={
                      state.mode === "plain-overlay"
                        ? "请把素材放入 public/ad-videos/"
                        : "请把素材放入 public/green-screen-videos/"
                    }
                  />
                </Form.Item>
                {state.greenScreenUrl && (
                  <Form.Item label="广告片段预览（仅广告素材）">
                    <video
                      ref={media.adMaterialPreviewRef}
                      key={`material-${state.greenScreenUrl}`}
                      src={state.greenScreenUrl}
                      controls
                      playsInline
                      preload="metadata"
                      style={{
                        width: "100%",
                        maxHeight: 240,
                        background: "#000",
                        borderRadius: 8,
                      }}
                      onPlay={actions.previewAdMaterialOnly}
                      onTimeUpdate={actions.stopAdMaterialAtRangeEnd}
                      onSeeked={actions.stopAdMaterialAtRangeEnd}
                    />
                    <Text type="secondary">
                      此播放器只试听所选广告片段及其原声，不会触发引导音频，也不会执行抠绿。
                    </Text>
                  </Form.Item>
                )}

                <Form.Item label="广告引导音频（可选）">
                  <MediaFileSelect
                    items={state.guideAudios}
                    value={state.guideAudio}
                    allowClear
                    placeholder="先播放一段音频，再引出广告视频"
                    onChange={actions.changeGuideAudio}
                    onPick={actions.pickGuideAudio}
                    pickLabel="选择音频"
                  />
                </Form.Item>
                {state.guideAudioUrl && (
                  <Space
                    direction="vertical"
                    style={{ width: "100%", marginBottom: 16 }}
                  >
                    <audio
                      ref={media.guidePreviewRef}
                      key={state.guideAudioUrl}
                      src={state.guideAudioUrl}
                      crossOrigin="anonymous"
                      controls
                      preload="metadata"
                      style={{ width: "100%" }}
                      onLoadedMetadata={actions.handleGuidePreviewOnLoadedMetadata}
                      onPlay={actions.handleGuidePreviewOnPlay}
                      onTimeUpdate={actions.handleGuidePreviewOnTimeUpdate}
                      onSeeked={actions.handleGuidePreviewOnSeeked}
                      onEnded={actions.handleGuidePreviewOnEnded}
                    />
                    <div>
                      <Text>引导音频用途</Text>
                      <Radio.Group
                        value={state.guideMode}
                        onChange={(event) => actions.setGuideMode(event.target.value)}
                        style={{ display: "flex", marginTop: 8 }}
                      >
                        <Radio.Button value="prelude">
                          前奏：播完后显示广告
                        </Radio.Button>
                        <Radio.Button value="voiceover">
                          总配音：替代广告原声
                        </Radio.Button>
                      </Radio.Group>
                    </div>
                    {state.voiceoverEnabled && (
                      <Form.Item
                        label="广告画面进入延迟（秒）"
                        style={{ width: "100%", marginBottom: 0 }}
                      >
                        <InputNumber
                          min={0}
                          max={
                            state.guidePlaybackDuration > 0
                              ? Math.max(0, state.guidePlaybackDuration - 0.01)
                              : undefined
                          }
                          step={0.1}
                          precision={2}
                          value={state.adVideoDelay}
                          onChange={(value) => actions.setAdVideoDelay(value ?? 0)}
                          style={{ width: "100%" }}
                        />
                        <Text type="secondary">
                          引导音频开始后经过这段时间显示广告画面；引导音频将继续播放并替代广告视频原声。
                        </Text>
                      </Form.Item>
                    )}
                    <Space wrap>
                      <Text>播放引导音频时暂停母片</Text>
                      <Switch
                        checked={state.guidePauseSource}
                        onChange={actions.setGuidePauseSource}
                      />
                    </Space>
                    <div style={{ width: "100%" }}>
                      <Text>
                        引导音频期间母片音量：
                        {Math.round(state.sourceVolumeDuringGuide * 100)}%
                      </Text>
                      <Slider
                        disabled={state.guidePauseSource}
                        min={0}
                        max={1}
                        step={0.05}
                        value={state.sourceVolumeDuringGuide}
                        onChange={actions.setSourceVolumeDuringGuide}
                      />
                      {state.guidePauseSource && (
                        <Text type="secondary">
                          母片暂停时声音也会暂停，无需压低音量。
                        </Text>
                      )}
                    </div>
                    <Form.Item
                      label="母片音量渐变时长（秒）"
                      style={{ width: "100%", marginBottom: 0 }}
                    >
                      <InputNumber
                        disabled={state.guidePauseSource}
                        min={0}
                        max={10}
                        step={0.1}
                        precision={2}
                        value={state.guideVolumeTransitionDuration}
                        onChange={(value) =>
                          actions.setGuideVolumeTransitionDuration(value ?? 0)
                        }
                        style={{ width: "100%" }}
                      />
                      <Text type="secondary">
                        引导开始时逐渐压低、结束前逐渐恢复；设为 0 时立即切换。
                      </Text>
                    </Form.Item>
                    <div>
                      <Text>
                        引导音频音量：{Math.round(state.guideVolume * 100)}%
                      </Text>
                      <Slider
                        min={0}
                        max={2}
                        step={0.05}
                        value={state.guideVolume}
                        onChange={actions.setGuideVolume}
                      />
                    </div>
                    <div style={{ width: "100%" }}>
                      <Text>引导音频速度：{state.guidePlaybackRate.toFixed(2)}×</Text>
                      <Space.Compact style={{ width: "100%", marginTop: 8 }}>
                        <Slider
                          min={0.5}
                          max={2}
                          step={0.05}
                          value={state.guidePlaybackRate}
                          onChange={actions.setGuidePlaybackRate}
                          style={{ flex: 1, marginInline: 10 }}
                        />
                        <InputNumber
                          min={0.5}
                          max={2}
                          step={0.05}
                          precision={2}
                          value={state.guidePlaybackRate}
                          formatter={(value) => `${value ?? 1}×`}
                          parser={(value) =>
                            Number((value || "1").replace("×", ""))
                          }
                          onChange={(value) => actions.setGuidePlaybackRate(value ?? 1)}
                          style={{ width: 92 }}
                        />
                      </Space.Compact>
                      <Text type="secondary">
                        预览使用浏览器保音调播放，最终成片使用 FFmpeg
                        atempo，音高保持不变。
                      </Text>
                    </div>
                  </Space>
                )}
              </Form>
            </Card>

            <Card title="2. 时间线" style={{ marginTop: 24 }}>
              <Form layout="vertical">
                <Form.Item
                  label={
                    state.guideAudio ? "引导音频开始时间（秒）" : "广告开始时间（秒）"
                  }
                >
                  <InputNumber
                    min={0}
                    max={
                      state.sourceDuration > 0
                        ? Math.max(0, state.sourceDuration - 0.01)
                        : undefined
                    }
                    step={0.1}
                    precision={2}
                    value={state.startAt}
                    onChange={(value) => actions.setStartAt(value ?? 0)}
                    style={{ width: "100%" }}
                  />
                </Form.Item>
                <Form.Item label="广告视频使用范围">
                  <Slider
                    range
                    min={0}
                    max={Math.max(state.adDuration, 0.01)}
                    step={0.01}
                    value={[state.adTrimStart, state.resolvedAdTrimEnd]}
                    onChange={(value) => {
                      const [nextStart, nextEnd] = value as number[];
                      if (nextEnd - nextStart >= 0.01) {
                        actions.setAdTrimStart(nextStart);
                        actions.setAdTrimEnd(nextEnd);
                      }
                    }}
                    disabled={state.adDuration <= 0}
                  />
                  <Row gutter={12}>
                    <Col span={12}>
                      <Text type="secondary">素材开始（秒）</Text>
                      <InputNumber
                        min={0}
                        max={Math.max(0, state.resolvedAdTrimEnd - 0.01)}
                        step={0.1}
                        precision={2}
                        value={state.adTrimStart}
                        onChange={(value) =>
                          actions.setAdTrimStart(
                            Math.max(
                              0,
                              Math.min(value ?? 0, state.resolvedAdTrimEnd - 0.01),
                            ),
                          )
                        }
                        style={{ width: "100%" }}
                      />
                    </Col>
                    <Col span={12}>
                      <Text type="secondary">素材结束（秒）</Text>
                      <InputNumber
                        min={state.adTrimStart + 0.01}
                        max={state.adDuration || undefined}
                        step={0.1}
                        precision={2}
                        value={state.resolvedAdTrimEnd}
                        onChange={(value) =>
                          actions.setAdTrimEnd(
                            Math.min(
                              state.adDuration,
                              Math.max(value ?? state.adDuration, state.adTrimStart + 0.01),
                            ),
                          )
                        }
                        style={{ width: "100%" }}
                      />
                    </Col>
                  </Row>
                  <Text type="secondary">
                    将使用 {state.adTrimStart.toFixed(2)} 秒至{" "}
                    {state.resolvedAdTrimEnd.toFixed(2)} 秒，片段时长{" "}
                    {state.selectedAdDuration.toFixed(2)} 秒。
                  </Text>
                </Form.Item>
                <Form.Item label="播放模式">
                  <Radio.Group
                    value={state.pauseSource}
                    onChange={(event) => actions.setPauseSource(event.target.value)}
                  >
                    <Radio.Button value={false}>
                      覆盖播放，不暂停母片
                    </Radio.Button>
                    <Radio.Button value={true}>暂停母片再播放广告</Radio.Button>
                  </Radio.Group>
                </Form.Item>
                <Space wrap>
                  <Tag>
                    母版：
                    {state.sourceDuration
                      ? `${state.sourceDuration.toFixed(2)} 秒`
                      : "等待读取"}
                  </Tag>
                  <Tag>
                    广告素材：
                    {state.adDuration ? `${state.adDuration.toFixed(2)} 秒` : "等待读取"}
                  </Tag>
                  {state.adDuration > 0 && (
                    <Tag color="cyan">
                      使用片段：{state.selectedAdDuration.toFixed(2)} 秒
                    </Tag>
                  )}
                  {state.guideAudio && (
                    <Tag>
                      引导：
                      {state.guideDuration
                        ? `${state.guidePlaybackDuration.toFixed(2)} 秒 · ${state.guidePlaybackRate.toFixed(2)}×`
                        : "等待读取"}
                    </Tag>
                  )}
                  {state.voiceoverEnabled && (
                    <Tag color="purple">
                      广告画面：引导后 {state.adVideoDelay.toFixed(2)} 秒进入
                    </Tag>
                  )}
                  <Tag color="blue">
                    预计成片：
                    {state.estimatedDuration
                      ? `${state.estimatedDuration.toFixed(2)} 秒`
                      : "--"}
                  </Tag>
                </Space>
              </Form>
            </Card>
          </Col>

          <Col xs={24} xl={14}>
            <Card title="最终合成时间线预览">
              {state.sourceUrl ? (
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Space wrap>
                    <Text>启用引导音频和广告联动预览</Text>
                    <Switch
                      checked={state.timelinePreviewEnabled}
                      onChange={(enabled) => {
                        actions.stopTimelinePreview();
                        actions.setTimelinePreviewEnabled(enabled);
                      }}
                    />
                    <Button
                      disabled={!state.timelinePreviewEnabled}
                      onClick={actions.restartTimelinePreview}
                    >
                      从广告前开始预览
                    </Button>
                    {!state.sourcePreviewPlaying && (
                      <Text type="secondary">
                        母片暂停时会始终显示静态广告定位层，调整位置和大小会立即反馈。
                      </Text>
                    )}
                  </Space>
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      maxWidth: state.previewMaxWidth,
                      maxHeight: 520,
                      margin: "0 auto",
                      aspectRatio: `${state.sourceSize.width} / ${state.sourceSize.height}`,
                      overflow: "hidden",
                      borderRadius: 10,
                      background: "#000",
                      boxShadow: "0 14px 40px rgba(0,0,0,.28)",
                      containerType: "inline-size",
                    }}
                  >
                    <video
                      ref={media.sourcePreviewRef}
                      key={state.sourceUrl}
                      src={state.sourceUrl}
                      crossOrigin="anonymous"
                      controls
                      style={{
                        position: "relative",
                        zIndex: 1,
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        display: "block",
                      }}
                      onPlay={actions.handleSourcePreviewOnPlay}
                      onTimeUpdate={actions.handleSourcePreviewOnTimeUpdate}
                      onSeeked={actions.resetPreviewAfterSeek}
                      onPause={actions.handleSourcePause}
                      onEnded={actions.handleSourcePreviewOnEnded}
                      onVolumeChange={actions.handleSourcePreviewOnVolumeChange}
                      onLoadedMetadata={actions.handleSourcePreviewOnLoadedMetadata}
                    />
                    {state.greenScreenUrl && (
                      <video
                        ref={media.adPreviewRef}
                        key={state.greenScreenUrl}
                        src={state.greenScreenUrl}
                        crossOrigin="anonymous"
                        playsInline
                        preload="auto"
                        style={{
                          position: "absolute",
                          left: `${state.x * 100}%`,
                          top: `${state.y * 100}%`,
                          width: `${state.width * 100}%`,
                          height: "auto",
                          maxWidth: "none",
                          display:
                            state.previewPhase === "ad" ||
                            (!state.sourcePreviewPlaying && state.previewPhase !== "lead")
                              ? "block"
                              : "none",
                          pointerEvents: "none",
                          zIndex: 2,
                          willChange: "left, top, width",
                        }}
                        onLoadedMetadata={actions.handleAdPreviewOnLoadedMetadata}
                        onTimeUpdate={actions.finishAdRangeIfNeeded}
                        onEnded={actions.finishPausedAdPreview}
                      />
                    )}
                    {state.previewPhase === "lead" && (
                      <Tag
                        color={state.guidePauseSource ? "blue" : "gold"}
                        style={{
                          position: "absolute",
                          top: 12,
                          right: 12,
                          zIndex: 3,
                        }}
                      >
                        正在播放广告引导音频
                        {state.guidePauseSource ? " · 母片已暂停" : ""}
                      </Tag>
                    )}
                    {state.previewPhase === "ad" && (
                      <Tag
                        color={state.voiceoverEnabled ? "purple" : "blue"}
                        style={{
                          position: "absolute",
                          top: 12,
                          right: 12,
                          zIndex: 3,
                        }}
                      >
                        {state.voiceoverEnabled
                          ? "广告总配音 · 正在显示广告画面"
                          : "正在预览广告"}
                        {state.previewPauseActive ? " · 母片已暂停" : ""}
                      </Tag>
                    )}
                    {!state.sourcePreviewPlaying &&
                      state.previewPhase !== "lead" &&
                      state.previewPhase !== "ad" &&
                      state.greenScreenUrl && (
                        <Tag
                          color="cyan"
                          style={{
                            position: "absolute",
                            top: 12,
                            right: 12,
                            zIndex: 3,
                          }}
                        >
                          位置调整预览 · X {Math.round(state.x * 100)}% · Y{" "}
                          {Math.round(state.y * 100)}% · 宽度{" "}
                          {Math.round(state.width * 100)}%
                        </Tag>
                      )}
                    {state.activeSubtitleCue &&
                      (state.previewPhase === "lead" || state.previewPhase === "ad") && (
                        <div
                          style={{
                            position: "absolute",
                            zIndex: 4,
                            pointerEvents: "none",
                            left: "5%",
                            right: "5%",
                            top:
                              state.subtitleSettings.style.position === "top"
                                ? `${state.subtitleSettings.style.verticalMargin}%`
                                : state.subtitleSettings.style.position === "center"
                                  ? "50%"
                                  : undefined,
                            bottom:
                              state.subtitleSettings.style.position === "bottom"
                                ? `${state.subtitleSettings.style.verticalMargin}%`
                                : undefined,
                            transform:
                              state.subtitleSettings.style.position === "center"
                                ? "translateY(-50%)"
                                : undefined,
                            textAlign: "center",
                            whiteSpace: "pre-line",
                            fontFamily: state.subtitleSettings.style.fontFamily,
                            fontSize: `${(state.subtitleSettings.style.fontSize / Math.max(state.sourceSize.width, 1)) * 100}cqw`,
                            lineHeight: 1.28,
                            color: state.subtitleSettings.style.color,
                            WebkitTextStroke: `${(state.subtitleSettings.style.outlineWidth / Math.max(state.sourceSize.width, 1)) * 100}cqw ${state.subtitleSettings.style.outlineColor}`,
                            paintOrder: "stroke fill",
                          }}
                        >
                          <span
                            style={{
                              padding:
                                state.subtitleSettings.style.backgroundOpacity > 0
                                  ? ".1em .28em"
                                  : 0,
                              borderRadius: 4,
                              background:
                                state.subtitleSettings.style.backgroundOpacity > 0
                                  ? `${state.subtitleSettings.style.backgroundColor}${Math.round(
                                      state.subtitleSettings.style.backgroundOpacity *
                                        255,
                                    )
                                      .toString(16)
                                      .padStart(2, "0")}`
                                  : "transparent",
                            }}
                          >
                            {state.activeSubtitleCue.text}
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

            <PlacementControls
              x={state.x}
              y={state.y}
              width={state.width}
              adNormalizedHeight={state.adNormalizedHeight}
              autoCenterPlacement={state.autoCenterPlacement}
              setAutoCenterPlacement={actions.setAutoCenterPlacement}
              setX={actions.setX}
              setY={actions.setY}
              updateWidthKeepingCenter={actions.updateWidthKeepingCenter}
              applyPreset={actions.applyPreset}
            />
          </Col>
        </Row>

        <Card title="4. 引导音频字幕">
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <SubtitleEditor
              subtitleSettings={state.subtitleSettings}
              setSubtitleSettings={actions.setSubtitleSettings}
              guideAudioUrl={state.guideAudioUrl}
              guideDuration={state.guideDuration}
              subtitlePreviewText={state.subtitlePreviewText}
              importSrt={actions.importSrt}
              exportSrt={actions.exportSrt}
              addSubtitleCue={actions.addSubtitleCue}
              updateSubtitleCue={actions.updateSubtitleCue}
              getGuideCurrentTime={actions.handleSubtitleEditorGetGuideCurrentTime}
              seekGuideAudio={actions.handleSubtitleEditorSeekGuideAudio}
            />

            <Card
              size="small"
              title="引导字幕图层组合预览"
              extra={<Tag color="purple">独立预览，不影响上方最终时间线</Tag>}
            >
              <Space
                direction="vertical"
                size="middle"
                style={{ width: "100%" }}
              >
                <Alert
                  type="info"
                  showIcon
                  message="母片画面固定开启，其他图层可以自由组合"
                  description="预览仍遵循当前的前奏/总配音、广告进入延迟和暂停母片设置；关闭声音图层不会停止时间线，因此可以单独检查字幕出现时间。"
                />
                <Space wrap>
                  <Tag color="blue">母片画面：始终开启</Tag>
                  <Text>母片声音</Text>
                  <Switch
                    checked={state.subtitlePreviewSourceAudio}
                    onChange={actions.setSubtitlePreviewSourceAudio}
                  />
                  <Text>引导音频</Text>
                  <Switch
                    checked={state.subtitlePreviewGuideAudio}
                    onChange={actions.setSubtitlePreviewGuideAudio}
                  />
                  <Text>引导字幕</Text>
                  <Switch
                    checked={state.subtitlePreviewSubtitles}
                    onChange={actions.setSubtitlePreviewSubtitles}
                  />
                  <Text>广告画面</Text>
                  <Switch
                    checked={state.subtitlePreviewAdVideo}
                    onChange={actions.setSubtitlePreviewAdVideo}
                  />
                  <Text>广告声音</Text>
                  <Switch
                    disabled={state.voiceoverEnabled || !state.adAudioEnabled}
                    checked={
                      state.subtitlePreviewAdAudio &&
                      !state.voiceoverEnabled &&
                      state.adAudioEnabled
                    }
                    onChange={actions.setSubtitlePreviewAdAudio}
                  />
                </Space>

                {state.sourceUrl && state.guideAudioUrl ? (
                  <>
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        maxWidth: state.previewMaxWidth,
                        maxHeight: 520,
                        margin: "0 auto",
                        aspectRatio: `${state.sourceSize.width} / ${state.sourceSize.height}`,
                        overflow: "hidden",
                        borderRadius: 10,
                        background: "#000",
                        boxShadow: "0 12px 34px rgba(0,0,0,.24)",
                        containerType: "inline-size",
                      }}
                    >
                      <video
                        ref={media.subtitleVideoPreviewRef}
                        key={`subtitle-source-${state.sourceUrl}`}
                        src={state.sourceUrl}
                        crossOrigin="anonymous"
                        playsInline
                        preload="metadata"
                        muted={!state.subtitlePreviewSourceAudio}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          display: "block",
                        }}
                        onLoadedMetadata={
                          actions.handleSubtitleVideoPreviewOnLoadedMetadata
                        }
                      />
                      {state.greenScreenUrl && (
                        <video
                          ref={media.subtitleAdPreviewRef}
                          key={`subtitle-ad-${state.greenScreenUrl}`}
                          src={state.greenScreenUrl}
                          crossOrigin="anonymous"
                          playsInline
                          preload="metadata"
                          muted={
                            !state.subtitlePreviewAdAudio ||
                            state.voiceoverEnabled ||
                            !state.adAudioEnabled
                          }
                          style={{
                            position: "absolute",
                            zIndex: 2,
                            left: `${state.x * 100}%`,
                            top: `${state.y * 100}%`,
                            width: `${state.width * 100}%`,
                            height: "auto",
                            maxWidth: "none",
                            display:
                              state.subtitlePreviewAdVideo &&
                              state.subtitlePreviewPhase === "ad"
                                ? "block"
                                : "none",
                            pointerEvents: "none",
                          }}
                          onLoadedMetadata={
                            actions.handleSubtitleAdPreviewOnLoadedMetadata
                          }
                          onTimeUpdate={actions.finishDedicatedAdPreview}
                          onEnded={actions.finishDedicatedAdPreview}
                        />
                      )}
                      <audio
                        ref={media.subtitleAudioPreviewRef}
                        key={`subtitle-guide-${state.guideAudioUrl}`}
                        src={state.guideAudioUrl}
                        crossOrigin="anonymous"
                        preload="metadata"
                        muted={!state.subtitlePreviewGuideAudio}
                        onPlay={actions.handleSubtitleAudioPreviewOnPlay}
                        onTimeUpdate={actions.handleSubtitleAudioPreviewOnTimeUpdate}
                        onEnded={actions.finishDedicatedGuidePreview}
                      />
                      {state.dedicatedSubtitleCue &&
                        (state.subtitlePreviewPhase === "lead" ||
                          state.subtitlePreviewPhase === "ad") && (
                          <div
                            style={{
                              position: "absolute",
                              zIndex: 4,
                              pointerEvents: "none",
                              left: "5%",
                              right: "5%",
                              top:
                                state.subtitleSettings.style.position === "top"
                                  ? `${state.subtitleSettings.style.verticalMargin}%`
                                  : state.subtitleSettings.style.position === "center"
                                    ? "50%"
                                    : undefined,
                              bottom:
                                state.subtitleSettings.style.position === "bottom"
                                  ? `${state.subtitleSettings.style.verticalMargin}%`
                                  : undefined,
                              transform:
                                state.subtitleSettings.style.position === "center"
                                  ? "translateY(-50%)"
                                  : undefined,
                              textAlign: "center",
                              whiteSpace: "pre-line",
                              fontFamily: state.subtitleSettings.style.fontFamily,
                              fontSize: `${(state.subtitleSettings.style.fontSize / Math.max(state.sourceSize.width, 1)) * 100}cqw`,
                              lineHeight: 1.28,
                              color: state.subtitleSettings.style.color,
                              WebkitTextStroke: `${(state.subtitleSettings.style.outlineWidth / Math.max(state.sourceSize.width, 1)) * 100}cqw ${state.subtitleSettings.style.outlineColor}`,
                              paintOrder: "stroke fill",
                            }}
                          >
                            <span
                              style={{
                                padding:
                                  state.subtitleSettings.style.backgroundOpacity > 0
                                    ? ".1em .28em"
                                    : 0,
                                borderRadius: 4,
                                background:
                                  state.subtitleSettings.style.backgroundOpacity > 0
                                    ? `${state.subtitleSettings.style.backgroundColor}${Math.round(
                                        state.subtitleSettings.style
                                          .backgroundOpacity * 255,
                                      )
                                        .toString(16)
                                        .padStart(2, "0")}`
                                    : "transparent",
                              }}
                            >
                              {state.dedicatedSubtitleCue.text}
                            </span>
                          </div>
                        )}
                      <Tag
                        color="purple"
                        style={{
                          position: "absolute",
                          top: 12,
                          right: 12,
                          zIndex: 5,
                        }}
                      >
                        {state.subtitlePreviewPhase === "lead"
                          ? "引导阶段"
                          : state.subtitlePreviewPhase === "ad"
                            ? "广告阶段"
                            : state.subtitlePreviewPhase === "done"
                              ? "预览结束"
                              : "等待播放"}
                      </Tag>
                    </div>
                    <Space
                      wrap
                      style={{ justifyContent: "center", width: "100%" }}
                    >
                      <Button
                        type="primary"
                        onClick={actions.startDedicatedSubtitlePreview}
                      >
                        从头预览
                      </Button>
                      <Button
                        disabled={
                          state.subtitlePreviewPhase === "idle" ||
                          state.subtitlePreviewPhase === "done"
                        }
                        onClick={actions.toggleDedicatedSubtitlePreview}
                      >
                        {state.subtitlePreviewPlaying ? "暂停" : "继续"}
                      </Button>
                      <Button
                        disabled={state.subtitlePreviewPhase === "idle"}
                        onClick={actions.stopDedicatedSubtitlePreview}
                      >
                        停止并复位
                      </Button>
                      <Tag>
                        引导音频位置：{state.subtitlePreviewTime.toFixed(2)} 秒
                      </Tag>
                      {state.guidePauseSource && (
                        <Tag color="blue">引导期间母片定格</Tag>
                      )}
                      {state.pauseSource && <Tag color="gold">广告期间母片定格</Tag>}
                    </Space>
                  </>
                ) : (
                  <Empty description="请选择母片和广告引导音频后使用组合预览" />
                )}
              </Space>
            </Card>
          </Space>
        </Card>

        <Card title={state.mode === "plain-overlay" ? "5. 声音" : "5. 抠绿和声音"}>
          <Form layout="vertical">
            {state.mode === "chroma-key" && (
              <Row gutter={20}>
                <Col span={24}>
                  <Space wrap style={{ marginBottom: 16 }}>
                    <Button type="primary" onClick={actions.importChromaTestSettings}>
                      一键导入“抠绿参数测试”的参数
                    </Button>
                    <Text type="secondary">
                      仅导入绿幕颜色、颜色容差和边缘融合。
                    </Text>
                  </Space>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item label="绿幕颜色">
                    <Space.Compact style={{ width: "100%" }}>
                      <ColorPicker
                        value={state.keyColor}
                        onChange={(color) => actions.setKeyColor(color.toHexString())}
                        showText
                      />
                      <Input
                        value={state.keyColor}
                        onChange={(event) => actions.setKeyColor(event.target.value)}
                      />
                    </Space.Compact>
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item label={`颜色容差：${state.similarity.toFixed(2)}`}>
                    <Slider
                      min={0.01}
                      max={1}
                      step={0.01}
                      value={state.similarity}
                      onChange={actions.setSimilarity}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item label={`边缘融合：${state.blend.toFixed(2)}`}>
                    <Slider
                      min={0}
                      max={1}
                      step={0.01}
                      value={state.blend}
                      onChange={actions.setBlend}
                    />
                  </Form.Item>
                </Col>
              </Row>
            )}
            <Row gutter={20}>
              <Col xs={24} md={8}>
                <Form.Item label="保留广告声音">
                  <Switch
                    disabled={state.voiceoverEnabled}
                    checked={state.voiceoverEnabled ? false : state.adAudioEnabled}
                    onChange={actions.setAdAudioEnabled}
                  />
                  {state.voiceoverEnabled && (
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      总配音模式下自动静音
                    </Text>
                  )}
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label={`广告音量：${Math.round(state.adVolume * 100)}%`}>
                  <Slider
                    disabled={!state.adAudioEnabled || state.voiceoverEnabled}
                    min={0}
                    max={2}
                    step={0.05}
                    value={state.adVolume}
                    onChange={actions.setAdVolume}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label={`广告期间母片音量：${Math.round(state.sourceVolumeDuringAd * 100)}%`}
                >
                  <Slider
                    disabled={state.effectivePauseSource}
                    min={0}
                    max={1}
                    step={0.05}
                    value={state.sourceVolumeDuringAd}
                    onChange={actions.setSourceVolumeDuringAd}
                  />
                  {state.effectivePauseSource && (
                    <Text type="secondary">
                      暂停或直接插入模式下，母片声音也会暂停。
                    </Text>
                  )}
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>

        <Card>
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Button
              type="primary"
              size="large"
              icon={<RocketOutlined />}
              loading={state.submitting}
              disabled={!state.sourceVideo || !state.greenScreenVideo}
              onClick={() => void actions.submit()}
            >
              创建广告合成任务
            </Button>
            {state.lastTaskId && (
              <Alert
                type="success"
                showIcon
                message={`任务 ${state.lastTaskId} 已加入渲染队列`}
                description="可以前往“导出与渲染队列”查看进度和输出路径。"
              />
            )}
            <Text type="secondary">
              <VideoCameraOutlined /> 输出将保存在 out/，文件名包含 -ad-
              和任务编号。
            </Text>
          </Space>
        </Card>
      </Space>
    </div>
  );
}
