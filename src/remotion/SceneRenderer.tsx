import React from 'react';
import { interpolate, staticFile } from 'remotion';
import { VideoConfig, VideoScene, VideoContentItem, ItemAnimationType, BackgroundImageMode } from '../types';
import { ScriptContentRenderer } from '../components/ScriptContentRenderer';
import { buildAnimationStyle, parseAnimationStyle } from '../rendering/animation';
import { clamp01 } from '../hooks/useBackgroundVideo';

const DEFAULT_ITEM_ANIMATION_FRAMES = 12;

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

const hexToRgba = (hex: string | undefined, opacity: number): string => {
  if (!hex || hex === 'transparent') return `rgba(255, 255, 255, ${opacity})`;
  if (hex.startsWith('rgba')) return hex;
  if (hex.startsWith('rgb')) {
    return hex.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
  }
  
  let r = 255, g = 255, b = 255;
  if (hex.startsWith('#')) {
    const h = hex.replace('#', '');
    if (h.length === 3) {
      r = parseInt(h[0] + h[0], 16);
      g = parseInt(h[1] + h[1], 16);
      b = parseInt(h[2] + h[2], 16);
    } else if (h.length === 6) {
      r = parseInt(h.substring(0, 2), 16);
      g = parseInt(h.substring(2, 4), 16);
      b = parseInt(h.substring(4, 6), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  
  return hex;
};

const getBackgroundImageStyle = (src: string | undefined, mode: BackgroundImageMode | undefined): React.CSSProperties => {
  if (!src) return {};
  
  let url = src;
  if (src.startsWith('http') || src.startsWith('data:')) {
    url = encodeURI(src);
  } else if (/^[a-zA-Z]:\//.test(src) || src.startsWith('/')) {
    // 绝对路径处理 (支持 Windows 盘符或 Unix 根目录)
    // 浏览器禁止直接加载 file:// 协议，通过后端代理读取
    url = `http://localhost:5000/proxy_local_file?path=${encodeURIComponent(src)}`;
  } else {
    // 相对路径，假设在 public 目录下
    url = staticFile(encodeURI(src));
  }

  const style: React.CSSProperties = {
    backgroundImage: `url("${url}")`,
    backgroundPosition: 'center',
  };

  switch (mode) {
    case 'stretch':
      style.backgroundSize = '100% 100%';
      style.backgroundRepeat = 'no-repeat';
      break;
    case 'contain':
      style.backgroundSize = 'contain';
      style.backgroundRepeat = 'no-repeat';
      break;
    case 'repeat':
      style.backgroundSize = 'auto';
      style.backgroundRepeat = 'repeat';
      break;
    case 'cover':
    default:
      style.backgroundSize = 'cover';
      style.backgroundRepeat = 'no-repeat';
      break;
  }

  return style;
};

interface SceneItemProps {
  item: VideoContentItem;
  sceneDuration: number;
  relativeFrame: number;
  fps: number;
  quoteFontSize?: number;
  quoteFontColor?: string;
  maxQuoteDepth?: number;
  defaultQuoteMaxLimit?: number;
  avatarSize?: number;
  avatarShape?: 'circle' | 'square';
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
  quoteFontColor,
  maxQuoteDepth,
  defaultQuoteMaxLimit,
  defaultItemBackgroundColor,
  quoteBackgroundColor,
  quoteBorderColor,
  avatarSize,
  avatarShape,
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
  
  const glassStyles: React.CSSProperties = isGlassItem
    ? {
        backgroundColor: hexToRgba(item.backgroundColor, glassOpacity),
        border: `1px solid ${item.glassBorderColor || 'rgba(255, 255, 255, 0.38)'}`,
        boxShadow: [
          item.glassShadow || '0 18px 48px rgba(0, 0, 0, 0.28)',
          item.glassEdgeGlow ? `inset 0 0 12px 2px ${item.glassEdgeGlow}` : 'inset 0 0 0 0 transparent'
        ].filter(Boolean).join(', '),
        backdropFilter: [
          `blur(${glassBlur}px)`,
          `saturate(1.35)`,
          item.glassAberration ? `contrast(1.1) brightness(1.05)` : '', // 模拟色散时的对比度提升
        ].filter(Boolean).join(' '),
        WebkitBackdropFilter: [
          `blur(${glassBlur}px)`,
          `saturate(1.35)`,
          item.glassAberration ? `contrast(1.1) brightness(1.05)` : '',
        ].filter(Boolean).join(' '),
        overflow: 'hidden',
      }
    : {
        backgroundColor: item.backgroundColor || defaultItemBackgroundColor || '#f8f9fa',
        border: '1px dashed #d9d9d9',
        overflow: 'hidden',
      };

  const itemBaseStyle: React.CSSProperties = { ...glassStyles };

  const bgImageStyle = getBackgroundImageStyle(item.backgroundImage, item.backgroundImageMode);

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
        flexShrink: 0,
        ...itemBaseStyle,
        borderRadius: 8,
        padding: '12px',
        opacity,
        transform: transforms.length > 0 ? transforms.join(' ') : undefined,
        transformOrigin: 'center center',
        ...itemAnimateStyle,
      }}
    >
      {/* 背景图片层 */}
      {item.backgroundImage && (
        <div style={{
          position: 'absolute',
          inset: 0,
          ...bgImageStyle,
          opacity: isGlassItem ? glassOpacity : 1,
          filter: isGlassItem ? `blur(${glassBlur}px)` : undefined,
          transform: isGlassItem ? 'scale(1.1)' : undefined,
          zIndex: 0,
        }} />
      )}
      
      {/* 菲涅尔效果层 */}
      {isGlassItem && item.glassFresnel && (
        <div style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `radial-gradient(circle at center, transparent 30%, rgba(255,255,255,${item.glassFresnel * 0.5}) 100%)`,
          zIndex: 0,
        }} />
      )}
      
      {/* 磨砂颗粒层 */}
      {isGlassItem && item.glassGrain && (
        <div style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: item.glassGrain * 0.15,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          zIndex: 0,
        }} />
      )}

      <div style={{ padding: '8px 4px', position: 'relative', zIndex: 1 }}>
        <ScriptContentRenderer
          content={item.content}
          author={item.author}
          hideAudio={true}
          showMediaControls={false}
          playbackFrame={Math.max(0, relativeFrame - enterFrame)}
          fps={fps}
          defaultQuoteFontSize={quoteFontSize}
          defaultQuoteFontColor={quoteFontColor}
          maxQuoteDepth={maxQuoteDepth}
          defaultQuoteMaxLimit={defaultQuoteMaxLimit}
          defaultBackgroundColor={resolvedQuoteBackgroundColor}
          defaultBorderColor={resolvedQuoteBorderColor}
          avatarSize={avatarSize}
          avatarShape={avatarShape}
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
  const bgImageStyle = getBackgroundImageStyle(scene.backgroundImage, scene.backgroundImageMode);

  const stickyIdx = scene.items.findIndex(item => item.sticky);
  const hasSticky = stickyIdx !== -1;
  const stickyItem = hasSticky ? scene.items[stickyIdx] : null;
  const stickyValue = stickyItem?.sticky;
  const stickyProportion = typeof stickyValue === 'number' ? stickyValue : 0.5;

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
        ...bgImageStyle,
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
                  quoteFontColor={config.quoteFontColor}
                  maxQuoteDepth={config.maxQuoteDepth}
                  defaultQuoteMaxLimit={config.defaultQuoteMaxLimit}
                  defaultItemBackgroundColor={config.itemBackgroundColor}
                  quoteBackgroundColor={config.quoteBackgroundColor}
                  quoteBorderColor={config.quoteBorderColor}
                  avatarSize={config.avatarSize}
                  avatarShape={config.avatarShape}
                  isRemotion={isRemotion}
                />
              ))}
            </div>
            <div style={{ padding: '4px 8px', flexShrink: 0 }}>
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
                avatarSize={config.avatarSize}
                avatarShape={config.avatarShape}
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
                  quoteFontColor={config.quoteFontColor}
                  maxQuoteDepth={config.maxQuoteDepth}
                  defaultQuoteMaxLimit={config.defaultQuoteMaxLimit}
                  defaultItemBackgroundColor={config.itemBackgroundColor}
                  quoteBackgroundColor={config.quoteBackgroundColor}
                  quoteBorderColor={config.quoteBorderColor}
                  avatarSize={config.avatarSize}
                  avatarShape={config.avatarShape}
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
                avatarSize={config.avatarSize}
                avatarShape={config.avatarShape}
                isRemotion={isRemotion}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
