import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { VideoConfig, VideoScene } from '../types';
import { parseQuotes } from '../utils/quoteParser';

export interface MyVideoProps extends VideoConfig {
  focusedSceneId?: string; // 可选：只渲染特定画面格用于预览
}

export const MyVideo: React.FC<MyVideoProps> = ({ title, subreddit, scenes = [], focusedSceneId }) => {
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
  let activeScene: any;
  let relativeFrame: number;
  let sceneDurationFrames: number;

  if (focusedSceneId) {
    activeScene = sceneFrames.find(s => s.id === focusedSceneId);
    relativeFrame = frame;
    sceneDurationFrames = (activeScene?.duration || 1) * fps;
  } else {
    activeScene = sceneFrames.find(
      (s) => frame >= s.start && frame < s.end
    );
    relativeFrame = frame - (activeScene?.start || 0);
    sceneDurationFrames = (activeScene?.duration || 1) * fps;
  }

  if (!activeScene) return <AbsoluteFill style={{ backgroundColor: '#000' }} />;

  // 简单的淡入淡出动画
  const opacity = interpolate(
    relativeFrame,
    [0, 10, sceneDurationFrames - 10, sceneDurationFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#f3f4f6',
        padding: 60,
        fontFamily: 'Inter, -apple-system, sans-serif',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', opacity }}>
        {/* Subreddit Header */}
        <div style={{ fontSize: 28, color: '#ff4500', fontWeight: 'bold', marginBottom: 10 }}>
          r/{subreddit} {activeScene.type === 'post' ? '• 原贴' : '• 热门评论'}
        </div>

        {/* Content Container */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {activeScene.items.map((item: any, idx: number) => (
            <div 
              key={item.id} 
              style={{ 
                backgroundColor: '#fff', 
                borderRadius: 16, 
                padding: 30,
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                borderLeft: `8px solid ${activeScene.type === 'post' ? '#ff4500' : '#1890ff'}`,
              }}
            >
              {/* Author */}
              <div style={{ fontSize: 24, color: '#4b5563', marginBottom: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
                u/{item.author}
              </div>

              {/* Text Content (Parsed Quotes) */}
              <div style={{ 
                fontSize: activeScene.type === 'post' ? 42 : 32, 
                fontWeight: 700, 
                color: '#1a1a1b', 
                lineHeight: 1.4,
              }}>
                {parseQuotes(item.content, true)}
              </div>
            </div>
          ))}
        </div>

        {/* Progress Bar (Per Scene) */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: 12,
          backgroundColor: activeScene.type === 'post' ? '#ff4500' : '#1890ff',
          width: `${(relativeFrame / sceneDurationFrames) * 100}%`
        }} />
      </div>
    </AbsoluteFill>
  );
};
