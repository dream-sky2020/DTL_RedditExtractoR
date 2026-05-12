import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing, OffthreadVideo, staticFile, Loop, Audio } from 'remotion';
import { BackgroundVideoConfig, ItemAnimationType, VideoConfig, VideoScene, VideoContentItem } from '../types';
import { ScriptContentRenderer } from '../components/ScriptContentRenderer';
import { SceneAudioMixer } from '../audio/SceneAudioMixer';
import { buildAnimationStyle, parseAnimationStyle } from '../rendering/animation';

const DEFAULT_ITEM_ANIMATION_FRAMES = 12;
const BACKGROUND_VIDEO_PUBLIC_DIR = 'background-videos/';

const clamp01 = (value: number | undefined, fallback: number): number => {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(1, value as number));
};

const clampAudioVolume = (value: number | undefined, fallback: number): number => {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, value as number);
};

const normalizeBackgroundVideoSrc = (src?: string): string | null => {
  const raw = (src || '').trim().replace(/\\/g, '/');
  if (!raw) return null;
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  if (/^[a-z]:\//i.test(raw) || raw.includes('..')) return null;

  const withoutLeadingSlash = raw.replace(/^\/+/, '');
  const publicRelative = withoutLeadingSlash.startsWith('public/')
    ? withoutLeadingSlash.slice('public/'.length)
    : withoutLeadingSlash;

  if (!publicRelative.startsWith(BACKGROUND_VIDEO_PUBLIC_DIR)) return null;
  return publicRelative;
};

const resolveBackgroundVideoSrc = (src?: string): string | null => {
  const normalized = normalizeBackgroundVideoSrc(src);
  if (!normalized) return null;
  if (/^(https?:|data:|blob:)/i.test(normalized)) return normalized;
  return staticFile(normalized);
};

const getBackgroundPlayFrames = (backgroundVideo: BackgroundVideoConfig, fps: number): number | null => {
  if (!backgroundVideo.durationInSeconds) return null;
  const playbackRate = backgroundVideo.playbackRate && backgroundVideo.playbackRate > 0 ? backgroundVideo.playbackRate : 1;
  const baseDuration = Math.max(0, backgroundVideo.durationInSeconds - (backgroundVideo.startOffset || 0)) / playbackRate;
  const repeatCount = backgroundVideo.playbackMode === 'repeat-count'
    ? Math.max(1, Math.floor(backgroundVideo.repeatCount || 1))
    : 1;
  return Math.max(1, Math.round(baseDuration * repeatCount * fps));
};

const BackgroundVideoTrack: React.FC<{
  backgroundVideo?: BackgroundVideoConfig;
  fps: number;
  frame: number;
}> = ({ backgroundVideo, fps, frame }) => {
  if (!backgroundVideo?.enabled) return null;

  const src = resolveBackgroundVideoSrc(backgroundVideo.src);
  if (!src) return null;
  const fallbackImageSrc = resolveBackgroundVideoSrc(backgroundVideo.afterEndImageSrc);
  const playFrames = getBackgroundPlayFrames(backgroundVideo, fps);
  const hasEnded = playFrames !== null && frame >= playFrames;

  const playbackRate = Number.isFinite(backgroundVideo.playbackRate) && (backgroundVideo.playbackRate as number) > 0
    ? (backgroundVideo.playbackRate as number)
    : 1;
  const startFrom = Math.max(0, Math.round((backgroundVideo.startOffset || 0) * fps));
  const repeatCount = backgroundVideo.playbackMode === 'repeat-count'
    ? Math.max(1, Math.floor(backgroundVideo.repeatCount || 1))
    : 1;
  const singleLoopFrames = backgroundVideo.durationInSeconds
    ? Math.max(1, Math.round(Math.max(0, backgroundVideo.durationInSeconds - (backgroundVideo.startOffset || 0)) / playbackRate * fps))
    : null;
  const opacity = clamp01(backgroundVideo.opacity, 1);
  const shouldRenderBlurredBackground = backgroundVideo.fit === 'contain' && backgroundVideo.blurredBackgroundEnabled;
  const blurAmount = Math.max(0, backgroundVideo.blurredBackgroundBlur ?? 24);
  const blurredVideo = !hasEnded && shouldRenderBlurredBackground ? (
    <OffthreadVideo
      src={src}
      muted
      startFrom={startFrom}
      playbackRate={playbackRate}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        opacity,
        filter: `blur(${blurAmount}px)`,
        transform: 'scale(1.08)',
      }}
    />
  ) : null;
  const video = hasEnded ? null : (
    <OffthreadVideo
      src={src}
      muted
      startFrom={startFrom}
      playbackRate={playbackRate}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        width: '100%',
        height: '100%',
        objectFit: backgroundVideo.fit || 'cover',
        opacity,
      }}
    />
  );
  const audio = !hasEnded && backgroundVideo.audioEnabled ? (
    <Audio
      src={src}
      volume={clampAudioVolume(backgroundVideo.audioVolume, 0.35)}
      startFrom={startFrom}
      playbackRate={playbackRate}
    />
  ) : null;
  const media = (
    <>
      {blurredVideo}
      {video}
      {audio}
    </>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', zIndex: 0 }}>
      {(video || audio) && backgroundVideo.playbackMode === 'repeat-count' && repeatCount > 1 && singleLoopFrames ? (
        <Loop durationInFrames={singleLoopFrames} times={repeatCount}>
          {media}
        </Loop>
      ) : media}
      {hasEnded && (
        fallbackImageSrc && backgroundVideo.afterEndMode === 'image' ? (
          <img
            src={fallbackImageSrc}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: backgroundVideo.fit || 'cover' }}
          />
        ) : (
          <AbsoluteFill style={{ backgroundColor: backgroundVideo.afterEndColor || '#000000' }} />
        )
      )}
      {backgroundVideo.overlayColor && (
        <AbsoluteFill style={{ backgroundColor: backgroundVideo.overlayColor, zIndex: 2 }} />
      )}
    </AbsoluteFill>
  );
};

const parseStyle = (str: string) => {
  const res: Record<string, any> = {};
  str.split(';').forEach(p => {
    const [k, v] = p.split(':').map(s => s.trim());
    if (k && v) {
      let finalVal = v;
      // 自动补全 px 单位
      if ((k === 'x' || k === 'y' || k === 'top' || k === 'left') && !isNaN(Number(v)) && v !== '0') {
        finalVal = v + 'px';
      }
      if (k === 'x') res.left = finalVal;
      else if (k === 'y') res.top = finalVal;
      else res[k] = finalVal;
    }
  });
  return res;
};

const getEasing = (e: string) => {
  if (e === 'ease-in') return Easing.in(Easing.ease);
  if (e === 'ease-out') return Easing.out(Easing.ease);
  if (e === 'ease-in-out') return Easing.inOut(Easing.ease);
  if (e === 'bounce') return Easing.bounce;
  if (e === 'elastic') return Easing.elastic(1);
  return Easing.linear;
};

const getTransformUnit = (key: string) => {
  if (key === 'rotate') return 'deg';
  return '';
};

const applyKeyframes = (kfStr: string, currentTime: number, ad: number, ae: string, styleObj: React.CSSProperties, transformsArr: string[]) => {
  try {
    const stagesRaw = kfStr.split(';').map(s => s.trim()).filter(Boolean);
    if (stagesRaw.length < 2) return;

    const parsedStages: { time: number, props: Record<string, number> }[] = [];

    stagesRaw.forEach(stage => {
      const colonIdx = stage.indexOf(':');
      if (colonIdx === -1) return;

      const timeStr = stage.substring(0, colonIdx).trim();
      const propsStr = stage.substring(colonIdx + 1).trim();

      const time = parseFloat(timeStr);
      if (isNaN(time)) return;

      const props: Record<string, number> = {};
      propsStr.split(',').forEach(prop => {
        const pColonIdx = prop.indexOf(':');
        if (pColonIdx === -1) return;
        const k = prop.substring(0, pColonIdx).trim();
        const v = parseFloat(prop.substring(pColonIdx + 1).trim());
        if (!isNaN(v)) props[k] = v;
      });

      if (Object.keys(props).length > 0) {
        parsedStages.push({ time, props });
      }
    });

    // 1. 按时间排序
    parsedStages.sort((a, b) => a.time - b.time);

    // 2. 去除重复时间点（保留最后一个）
    const uniqueStages: typeof parsedStages = [];
    parsedStages.forEach(s => {
      if (uniqueStages.length > 0 && uniqueStages[uniqueStages.length - 1].time === s.time) {
        uniqueStages[uniqueStages.length - 1] = s;
      } else {
        uniqueStages.push(s);
      }
    });

    if (uniqueStages.length < 2) return;

    // 确保 ad 至少是一个微小的正数，防止 timeline 全是 0
    const safeAd = Math.max(ad, 0.001);
    const timeline = uniqueStages.map(s => s.time * safeAd);

    // 关键修复：检查 timeline 是否严格递增
    for (let i = 1; i < timeline.length; i++) {
      if (timeline[i] <= timeline[i - 1]) {
        // 如果不是严格递增，说明输入数据有问题，直接跳过动画防止崩溃
        return;
      }
    }

    const allKeys = new Set<string>();
    uniqueStages.forEach(s => Object.keys(s.props).forEach(k => allKeys.add(k)));

    allKeys.forEach(key => {
      // 为每个属性构建完整的值序列，如果某个阶段缺失该属性，则沿用上一个值
      const values: number[] = [];
      let firstVal: number | null = null;

      for (const s of uniqueStages) {
        if (s.props[key] !== undefined) {
          firstVal = s.props[key];
          break;
        }
      }

      if (firstVal === null) return;

      let lastVal = firstVal;
      uniqueStages.forEach(s => {
        if (s.props[key] !== undefined) {
          lastVal = s.props[key];
        }
        values.push(lastVal);
      });

      const val = interpolate(
        currentTime,
        timeline,
        values,
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: getEasing(ae) }
      );

      if (key === 'scale') {
        transformsArr.push(`scale(${val})`);
      } else if (key === 'scaleX') {
        transformsArr.push(`scaleX(${val})`);
      } else if (key === 'scaleY') {
        transformsArr.push(`scaleY(${val})`);
      } else if (key === 'rotate') {
        transformsArr.push(`rotate(${val}${getTransformUnit(key)})`);
      } else if (key === 'x') {
        styleObj.left = `${val}px`;
      } else if (key === 'y') {
        styleObj.top = `${val}px`;
      } else {
        (styleObj as any)[key] = val;
      }
    });
  } catch (err) {
    console.error('Keyframes animation error:', err);
  }
};

const getEnterTransform = (animation: ItemAnimationType, progress: number): string => {
  switch (animation) {
    case 'slide-up':
      return `translateY(${(1 - progress) * 24}px)`;
    case 'slide-left':
      return `translateX(${-1 * (1 - progress) * 24}px)`;
    case 'zoom-in':
      return `scale(${0.92 + progress * 0.08})`;
    default:
      return 'none';
  }
};

const getExitTransform = (animation: ItemAnimationType, progress: number): string => {
  switch (animation) {
    case 'slide-down':
      return `translateY(${(1 - progress) * 24}px)`;
    case 'slide-right':
      return `translateX(${(1 - progress) * 24}px)`;
    case 'zoom-out':
      return `scale(${0.92 + progress * 0.08})`;
    default:
      return 'none';
  }
};

interface SceneItemProps {
  item: VideoContentItem;
  sceneDuration: number;
  relativeFrame: number;
  fps: number;
  quoteFontSize?: number;
  maxQuoteDepth?: number;
  defaultQuoteMaxLimit?: number;
  defaultItemBackgroundColor?: string;
  quoteBackgroundColor?: string;
  quoteBorderColor?: string;
  isRemotion?: boolean;
}

const SceneItem: React.FC<SceneItemProps> = ({
  item,
  sceneDuration,
  relativeFrame,
  fps,
  quoteFontSize,
  maxQuoteDepth,
  defaultQuoteMaxLimit,
  defaultItemBackgroundColor,
  quoteBackgroundColor,
  quoteBorderColor,
  isRemotion: _isRemotion = false,
}) => {
  const enterSec = Math.min(Math.max(item.enterAt ?? 0, 0), sceneDuration);
  const exitSec = Math.min(
    Math.max(item.exitAt ?? sceneDuration, enterSec),
    sceneDuration
  );
  const enterFrame = Math.floor(enterSec * fps);
  const exitFrame = Math.ceil(exitSec * fps);

  if (relativeFrame < enterFrame || relativeFrame > exitFrame) {
    return null;
  }

  const activeFrames = Math.max(1, exitFrame - enterFrame);
  const animationFrames = Math.max(
    1,
    Math.min(DEFAULT_ITEM_ANIMATION_FRAMES, Math.floor(activeFrames / 2))
  );

  const enterProgress = interpolate(
    relativeFrame,
    [enterFrame, enterFrame + animationFrames],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const exitProgress = interpolate(
    relativeFrame,
    [exitFrame - animationFrames, exitFrame],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const enterAnimation = item.enterAnimation || 'none';
  const exitAnimation = item.exitAnimation || 'none';
  let opacity = 1;
  if (enterAnimation !== 'none') opacity *= enterProgress;
  if (exitAnimation !== 'none') opacity *= exitProgress;
  if (enterAnimation === 'fade') opacity = enterProgress;
  if (exitAnimation === 'fade') opacity = Math.min(opacity, exitProgress);

  const transforms: string[] = [];
  const enterTransform = getEnterTransform(enterAnimation, enterProgress);
  if (enterTransform !== 'none') transforms.push(enterTransform);
  const exitTransform = getExitTransform(exitAnimation, exitProgress);
  if (exitTransform !== 'none') transforms.push(exitTransform);

  // --- 新增：Item 级别的自定义动画 (animateFrom, animateTo) ---
  const itemAnimateStyle: React.CSSProperties = {};

  if (item.offset) {
    Object.assign(itemAnimateStyle, parseAnimationStyle(item.offset));
  }

  if (item.keyframes || (item.animateFrom && item.animateTo)) {
    const itemCurrentTime = (relativeFrame - enterFrame) / fps;
    const customStyle = buildAnimationStyle({
      from: parseAnimationStyle(item.animateFrom || ''),
      to: parseAnimationStyle(item.animateTo || ''),
      keyframes: item.keyframes,
      currentTime: itemCurrentTime,
      start: item.animateStart || 0,
      duration: item.animateDuration || 1,
      easing: item.animateEasing || 'ease-out',
    });
    if (customStyle.transform) {
      transforms.push(String(customStyle.transform));
      delete customStyle.transform;
    }
    Object.assign(itemAnimateStyle, customStyle);
  }

  const isGlassItem = item.glass === true;
  const glassBlur = Math.max(0, item.glassBlur ?? 16);
  const glassOpacity = clamp01(item.glassOpacity, 0.42);
  const itemBaseStyle: React.CSSProperties = isGlassItem
    ? {
        background: item.glassTint || `rgba(255, 255, 255, ${glassOpacity})`,
        border: `1px solid ${item.glassBorderColor || 'rgba(255, 255, 255, 0.38)'}`,
        boxShadow: item.glassShadow || '0 18px 48px rgba(0, 0, 0, 0.28)',
        backdropFilter: `blur(${glassBlur}px) saturate(1.35)`,
        WebkitBackdropFilter: `blur(${glassBlur}px) saturate(1.35)`,
      }
    : {
        background: item.backgroundColor || defaultItemBackgroundColor || '#f8f9fa',
        border: '1px dashed #d9d9d9',
      };
  const resolvedQuoteBackgroundColor = isGlassItem
    ? (quoteBackgroundColor || 'rgba(255, 255, 255, 0.14)')
    : (quoteBackgroundColor || item.backgroundColor || defaultItemBackgroundColor);
  const resolvedQuoteBorderColor = isGlassItem
    ? (quoteBorderColor || 'rgba(255, 255, 255, 0.24)')
    : quoteBorderColor;

  return (
    <div
      style={{
        position: 'relative',
        ...itemBaseStyle,
        borderRadius: 8,
        padding: '12px',
        opacity,
        transform: transforms.length > 0 ? transforms.join(' ') : undefined,
        transformOrigin: 'center center',
        ...itemAnimateStyle,
      }}
    >
      <div style={{ padding: '8px 4px' }}>
        <ScriptContentRenderer
          content={item.content}
          author={item.author}
          hideAudio={true}
          showMediaControls={false}
          playbackFrame={Math.max(0, relativeFrame - enterFrame)}
          fps={fps}
          defaultQuoteFontSize={quoteFontSize}
          maxQuoteDepth={maxQuoteDepth}
          defaultQuoteMaxLimit={defaultQuoteMaxLimit}
          defaultBackgroundColor={resolvedQuoteBackgroundColor}
          defaultBorderColor={resolvedQuoteBorderColor}
        />
      </div>
    </div>
  );
};

export interface SceneRendererProps {
  scene: VideoScene;
  frame: number;
  fps: number;
  config: Partial<VideoConfig>;
  isRemotion?: boolean;
}

/**
 * SceneRenderer 组件
 * 纯视觉渲染组件，不依赖 Remotion 环境 Hook。
 * 可用于 Remotion 渲染，也可用于普通 React 弹窗预览。
 */
export const SceneRenderer: React.FC<SceneRendererProps> = ({
  scene,
  frame,
  fps,
  config,
  isRemotion = false,
}) => {
  const layoutMode = scene.layout === 'center' ? 'center' : (scene.layout === 'bottom' ? 'bottom' : 'top');
  const hasFinalBackgroundVideo = config.renderMode === 'final' && Boolean(config.backgroundVideo?.enabled && config.backgroundVideo?.src);
  const bgColor = hasFinalBackgroundVideo ? 'transparent' : (scene.backgroundColor || '#ffffff');

  const stickyIdx = scene.items.findIndex(item => item.sticky);
  const hasSticky = stickyIdx !== -1;
  const stickyItem = hasSticky ? scene.items[stickyIdx] : null;
  const stickyValue = stickyItem?.sticky;
  const stickyProportion = typeof stickyValue === 'number' ? stickyValue : 0.5;

  // --- 新增：Scene 级别的动画逻辑 ---
  const sceneAnimateStyle: React.CSSProperties = {};
  const sceneTransforms: string[] = [];

  if (scene.offset) {
    Object.assign(sceneAnimateStyle, parseAnimationStyle(scene.offset));
  }

  if (scene.keyframes || (scene.animateFrom && scene.animateTo)) {
    const customStyle = buildAnimationStyle({
      from: parseAnimationStyle(scene.animateFrom || ''),
      to: parseAnimationStyle(scene.animateTo || ''),
      keyframes: scene.keyframes,
      currentTime: frame / fps,
      start: scene.animateStart || 0,
      duration: scene.animateDuration || 1,
      easing: scene.animateEasing || 'ease-out',
    });
    if (customStyle.transform) {
      sceneTransforms.push(String(customStyle.transform));
      delete customStyle.transform;
    }
    Object.assign(sceneAnimateStyle, customStyle);
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10,
        backgroundColor: bgColor,
        padding: 28,
        fontFamily: 'Inter, -apple-system, sans-serif',
      }}
    >
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
        transform: sceneTransforms.length > 0 ? sceneTransforms.join(' ') : undefined,
        ...sceneAnimateStyle
      }}>
        {hasSticky ? (
          <>
            <div style={{
              flex: stickyProportion,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              gap: scene.itemSpacing ?? 12,
              padding: '4px 8px',
              overflow: 'hidden'
            }}>
              {scene.items.slice(0, stickyIdx).map((item: VideoContentItem) => (
                <SceneItem
                  key={item.id}
                  item={item}
                  sceneDuration={scene.duration}
                  relativeFrame={frame}
                  fps={fps}
                  quoteFontSize={config.quoteFontSize}
                  maxQuoteDepth={config.maxQuoteDepth}
                  defaultQuoteMaxLimit={config.defaultQuoteMaxLimit}
                  defaultItemBackgroundColor={config.itemBackgroundColor}
                  quoteBackgroundColor={config.quoteBackgroundColor}
                  quoteBorderColor={config.quoteBorderColor}
                  isRemotion={isRemotion}
                />
              ))}
            </div>
            <div style={{ padding: '4px 8px' }}>
              <SceneItem
                key={scene.items[stickyIdx].id}
                item={scene.items[stickyIdx]}
                sceneDuration={scene.duration}
                relativeFrame={frame}
                fps={fps}
                quoteFontSize={config.quoteFontSize}
                maxQuoteDepth={config.maxQuoteDepth}
                defaultQuoteMaxLimit={config.defaultQuoteMaxLimit}
                defaultItemBackgroundColor={config.itemBackgroundColor}
                quoteBackgroundColor={config.quoteBackgroundColor}
                quoteBorderColor={config.quoteBorderColor}
                isRemotion={isRemotion}
              />
            </div>
            <div style={{
              flex: 1 - stickyProportion,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              gap: scene.itemSpacing ?? 12,
              padding: '4px 8px',
              overflow: 'hidden'
            }}>
              {scene.items.slice(stickyIdx + 1).map((item: VideoContentItem) => (
                <SceneItem
                  key={item.id}
                  item={item}
                  sceneDuration={scene.duration}
                  relativeFrame={frame}
                  fps={fps}
                  quoteFontSize={config.quoteFontSize}
                  maxQuoteDepth={config.maxQuoteDepth}
                  defaultQuoteMaxLimit={config.defaultQuoteMaxLimit}
                  defaultItemBackgroundColor={config.itemBackgroundColor}
                  quoteBackgroundColor={config.quoteBackgroundColor}
                  quoteBorderColor={config.quoteBorderColor}
                  isRemotion={isRemotion}
                />
              ))}
            </div>
          </>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: layoutMode === 'center' ? 'center' : (layoutMode === 'bottom' ? 'flex-end' : 'flex-start'),
              gap: scene.itemSpacing ?? 12,
              padding: '4px 8px',
              height: '100%',
              overflow: 'hidden',
            }}
          >
            {scene.items.map((item: VideoContentItem) => (
              <SceneItem
                key={item.id}
                item={item}
                sceneDuration={scene.duration}
                relativeFrame={frame}
                fps={fps}
                quoteFontSize={config.quoteFontSize}
                maxQuoteDepth={config.maxQuoteDepth}
                defaultQuoteMaxLimit={config.defaultQuoteMaxLimit}
                defaultItemBackgroundColor={config.itemBackgroundColor}
                quoteBackgroundColor={config.quoteBackgroundColor}
                quoteBorderColor={config.quoteBorderColor}
                isRemotion={isRemotion}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};


export interface MyVideoProps extends VideoConfig {
  focusedSceneId?: string; // 可选：只渲染特定画面格用于预览
  disableAudio?: boolean;
  disableSceneAudio?: boolean;
}

export const MyVideo: React.FC<MyVideoProps> = (props) => {
  const { scenes = [] } = props;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const shouldRenderBackgroundVideo = props.renderMode === 'final' && Boolean(props.backgroundVideo?.enabled);
  const shouldDisableSceneAudio = props.disableSceneAudio ?? props.disableAudio;

  // 计算每个分段的起止帧
  let currentStartFrame = 0;
  const sceneFrames = scenes.map((scene) => {
    const start = currentStartFrame;
    const end = start + scene.duration * fps;
    currentStartFrame = end;
    return { start, end, ...scene };
  });

  // 如果提供了 focusedSceneId，则只渲染该画面格（从第 0 帧开始）
  let activeScene: (VideoScene & { start: number; end: number }) | undefined;
  let relativeFrame: number;

  if (props.focusedSceneId) {
    activeScene = sceneFrames.find(s => s.id === props.focusedSceneId);
    relativeFrame = frame;
  } else {
    activeScene = sceneFrames.find(
      (s) => frame >= s.start && frame < s.end
    );
    relativeFrame = frame - (activeScene?.start || 0);
  }

  if (!activeScene) {
    return (
      <AbsoluteFill style={{ backgroundColor: '#000' }}>
        {shouldRenderBackgroundVideo && (
          <BackgroundVideoTrack
            backgroundVideo={props.backgroundVideo}
            fps={fps}
            frame={frame}
          />
        )}
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill>
      {shouldRenderBackgroundVideo && (
        <BackgroundVideoTrack
          backgroundVideo={props.backgroundVideo}
          fps={fps}
          frame={frame}
        />
      )}
      {!shouldDisableSceneAudio && (
        <SceneAudioMixer
          scenes={scenes}
          fps={fps}
          focusedSceneId={props.focusedSceneId}
        />
      )}
      <SceneRenderer
        scene={activeScene}
        frame={relativeFrame}
        fps={fps}
        config={props}
      />
    </AbsoluteFill>
  );
};


