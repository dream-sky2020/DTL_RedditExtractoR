import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import { ItemAnimationType, VideoConfig, VideoScene, VideoContentItem } from '../types';
import { ScriptContentRenderer } from '../components/ScriptContentRenderer';
import { SceneAudioMixer } from '../audio/SceneAudioMixer';

const DEFAULT_ITEM_ANIMATION_FRAMES = 12;

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
    Object.assign(itemAnimateStyle, parseStyle(item.offset));
  }

  if (item.keyframes) {
    const ad = item.animateDuration || 1;
    const ae = item.animateEasing || 'ease-out';
    const itemCurrentTime = (relativeFrame - enterFrame) / fps;
    applyKeyframes(item.keyframes, itemCurrentTime - (item.animateStart || 0), ad, ae, itemAnimateStyle, transforms);
  } else if (item.animateFrom && item.animateTo && item.animateStart !== undefined) {
    const ad = item.animateDuration || 1;
    const ae = item.animateEasing || 'ease-out';

    const fromStyles = parseStyle(item.animateFrom);
    const toStyles = parseStyle(item.animateTo);
    // 使用相对于 Item 进入的时间
    const itemCurrentTime = (relativeFrame - enterFrame) / fps;
    const progress = interpolate(
      itemCurrentTime,
      [item.animateStart, item.animateStart + ad],
      [0, 1],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: getEasing(ae) }
    );

    const allKeys = new Set([...Object.keys(fromStyles), ...Object.keys(toStyles)]);
    allKeys.forEach(key => {
      const fv = fromStyles[key];
      const tv = toStyles[key];
      if (fv === undefined || tv === undefined) return;

      const fn = parseFloat(fv);
      const tn = parseFloat(tv);
      if (!isNaN(fn) && !isNaN(tn)) {
        const val = interpolate(progress, [0, 1], [fn, tn]);
        let unit = String(fv).replace(/[0-9.-]/g, '') || String(tv).replace(/[0-9.-]/g, '');

        // 针对位移属性，如果没有单位则默认为 px
        if (!unit && (key === 'top' || key === 'left')) {
          unit = 'px';
        }

        (itemAnimateStyle as any)[key] = `${val}${unit}`;
      } else {
        (itemAnimateStyle as any)[key] = progress < 0.5 ? fv : tv;
      }
    });

    if ((itemAnimateStyle as any).scale !== undefined) {
      transforms.push(`scale(${(itemAnimateStyle as any).scale})`);
      delete (itemAnimateStyle as any).scale;
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        background: item.backgroundColor || defaultItemBackgroundColor || '#f8f9fa',
        border: '1px dashed #d9d9d9',
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
          defaultBackgroundColor={quoteBackgroundColor || item.backgroundColor || defaultItemBackgroundColor}
          defaultBorderColor={quoteBorderColor}
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
  const bgColor = scene.backgroundColor || '#ffffff';

  const stickyIdx = scene.items.findIndex(item => item.sticky);
  const hasSticky = stickyIdx !== -1;
  const stickyItem = hasSticky ? scene.items[stickyIdx] : null;
  const stickyValue = stickyItem?.sticky;
  const stickyProportion = typeof stickyValue === 'number' ? stickyValue : 0.5;

  // --- 新增：Scene 级别的动画逻辑 ---
  const sceneAnimateStyle: React.CSSProperties = {};
  const sceneTransforms: string[] = [];

  if (scene.offset) {
    Object.assign(sceneAnimateStyle, parseStyle(scene.offset));
  }

  if (scene.keyframes) {
    const ad = scene.animateDuration || 1;
    const ae = scene.animateEasing || 'ease-out';
    applyKeyframes(scene.keyframes, (frame / fps) - (scene.animateStart || 0), ad, ae, sceneAnimateStyle, sceneTransforms);
  } else if (scene.animateFrom && scene.animateTo && scene.animateStart !== undefined) {
    const ad = scene.animateDuration || 1;
    const ae = scene.animateEasing || 'ease-out';

    const fromStyles = parseStyle(scene.animateFrom);
    const toStyles = parseStyle(scene.animateTo);
    const progress = interpolate(
      frame / fps,
      [scene.animateStart, scene.animateStart + ad],
      [0, 1],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: getEasing(ae) }
    );

    const allKeys = new Set([...Object.keys(fromStyles), ...Object.keys(toStyles)]);
    allKeys.forEach(key => {
      const fv = fromStyles[key];
      const tv = toStyles[key];
      if (fv === undefined || tv === undefined) return;

      const fn = parseFloat(fv);
      const tn = parseFloat(tv);
      if (!isNaN(fn) && !isNaN(tn)) {
        const val = interpolate(progress, [0, 1], [fn, tn]);
        let unit = String(fv).replace(/[0-9.-]/g, '') || String(tv).replace(/[0-9.-]/g, '');
        if (!unit && (key === 'top' || key === 'left')) unit = 'px';
        (sceneAnimateStyle as any)[key] = `${val}${unit}`;
      } else {
        (sceneAnimateStyle as any)[key] = progress < 0.5 ? fv : tv;
      }
    });

    if ((sceneAnimateStyle as any).scale !== undefined) {
      sceneTransforms.push(`scale(${(sceneAnimateStyle as any).scale})`);
      delete (sceneAnimateStyle as any).scale;
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
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
}

export const MyVideo: React.FC<MyVideoProps> = (props) => {
  const { scenes = [] } = props;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

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

  if (!activeScene) return <AbsoluteFill style={{ backgroundColor: '#000' }} />;

  return (
    <AbsoluteFill>
      {!props.disableAudio && (
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


