import React, { useMemo } from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Audio, staticFile, Sequence } from 'remotion';
import { ItemAnimationType, VideoConfig, VideoScene, VideoContentItem } from '../types';
import { ScriptContentRenderer } from '../components/ScriptContentRenderer';

const parseAudioTags = (content: string) => {
  const tags: { src: string; start: number; volume: number }[] = [];
  const regex = /\[audio\s+([^\]]+)\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const attrStr = match[1];
    const attrs: Record<string, string> = {};
    const attrRegex = /([a-zA-Z_][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s\]]+))/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attrStr)) !== null) {
      const key = attrMatch[1].toLowerCase();
      const value = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';
      attrs[key] = value;
    }
    if (attrs.src) {
      tags.push({
        src: attrs.src,
        start: parseFloat(attrs.start || '0'),
        volume: parseFloat(attrs.volume || '1.0'),
      });
    }
  }
  return tags;
};

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

interface SceneItemProps {
  item: VideoContentItem;
  sceneDuration: number;
  relativeFrame: number;
  fps: number;
  quoteFontSize?: number;
  maxQuoteDepth?: number;
  defaultQuoteMaxLimit?: number;
  defaultItemBackgroundColor?: string;
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
}) => {
  const audioTags = useMemo(() => parseAudioTags(item.content), [item.content]);

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

  return (
    <div
      style={{
        background: item.backgroundColor || defaultItemBackgroundColor || '#f8f9fa',
        border: '1px dashed #d9d9d9',
        borderRadius: 8,
        padding: '12px',
        opacity,
        transform: transforms.length > 0 ? transforms.join(' ') : undefined,
        transformOrigin: 'center center',
      }}
    >
      {audioTags.map((tag, tagIdx) => {
        const audioStartFrame = enterFrame + Math.floor(tag.start * fps);
        return (
          <Sequence
            key={`${item.id}-audio-${tagIdx}`}
            from={audioStartFrame}
          >
            <Audio
              src={staticFile(`audio/shortAudio/Unassigned/${tag.src}`)}
              volume={tag.volume}
            />
          </Sequence>
        );
      })}
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
            defaultBackgroundColor={item.backgroundColor || defaultItemBackgroundColor}
          />
      </div>
    </div>
  );
};

export interface MyVideoProps extends VideoConfig {
  focusedSceneId?: string; // 可选：只渲染特定画面格用于预览
}

export const MyVideo: React.FC<MyVideoProps> = ({ 
  scenes = [], 
  focusedSceneId,
  quoteFontSize,
  maxQuoteDepth,
  defaultQuoteMaxLimit,
  itemBackgroundColor,
}) => {
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

  if (focusedSceneId) {
    activeScene = sceneFrames.find(s => s.id === focusedSceneId);
    relativeFrame = frame;
  } else {
    activeScene = sceneFrames.find(
      (s) => frame >= s.start && frame < s.end
    );
    relativeFrame = frame - (activeScene?.start || 0);
  }

  if (!activeScene) return <AbsoluteFill style={{ backgroundColor: '#000' }} />;
  const layoutMode = activeScene.layout === 'center' ? 'center' : 'top';
  const bgColor = activeScene.backgroundColor || '#ffffff';

  return (
    <AbsoluteFill
      style={{
        backgroundColor: bgColor,
        padding: 28,
        fontFamily: 'Inter, -apple-system, sans-serif',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: layoutMode === 'center' ? 'center' : 'flex-start',
            gap: 12,
            padding: '4px 8px',
            minHeight: '100%',
          }}
        >
          {activeScene.items.map((item: VideoContentItem) => (
            <SceneItem
              key={item.id}
              item={item}
              sceneDuration={activeScene!.duration}
              relativeFrame={relativeFrame}
              fps={fps}
              quoteFontSize={quoteFontSize}
              maxQuoteDepth={maxQuoteDepth}
              defaultQuoteMaxLimit={defaultQuoteMaxLimit}
              defaultItemBackgroundColor={itemBackgroundColor}
            />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
