import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Audio, staticFile, Sequence } from 'remotion';
import { ItemAnimationType, VideoConfig, VideoScene } from '../types';
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

export interface MyVideoProps extends VideoConfig {
  focusedSceneId?: string; // 可选：只渲染特定画面格用于预览
}

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

export const MyVideo: React.FC<MyVideoProps> = ({ scenes = [], focusedSceneId }) => {
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

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#f0f2f5',
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
          {activeScene.items.map((item: VideoScene['items'][number]) => {
            const enterSec = Math.min(Math.max(item.enterAt ?? 0, 0), activeScene.duration);
            const exitSec = Math.min(
              Math.max(item.exitAt ?? activeScene.duration, enterSec),
              activeScene.duration
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

            const audioTags = parseAudioTags(item.content);

            return (
              <div
                key={item.id}
                style={{
                  background: '#f8f9fa',
                  border: '1px dashed #d9d9d9',
                  borderRadius: 8,
                  // Align with Antd Card (size="small") body spacing used in SceneCard
                  padding: '12px',
                  opacity,
                  transform: transforms.length > 0 ? transforms.join(' ') : undefined,
                  transformOrigin: 'center center',
                }}
              >
                {audioTags.map((tag, tagIdx) => {
                  const audioStartFrame = enterFrame + Math.floor(tag.start * fps);
                  // 使用 Sequence 来精确控制音频在视频时间轴上的起始位置
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
                  <ScriptContentRenderer content={item.content} author={item.author} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
