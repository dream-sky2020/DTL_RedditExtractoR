import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { VideoConfig, VideoScene } from '../types';
import { ScriptContentRenderer } from '../components/ScriptContentRenderer';

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
        backgroundColor: '#f0f2f5',
        padding: 28,
        fontFamily: 'Inter, -apple-system, sans-serif',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', opacity }}>
        <div
          style={{
            flex: 1,
            background: '#fff',
            borderRadius: 12,
            borderLeft: activeScene.type === 'post' ? '6px solid #ff4500' : '6px solid #1890ff',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            padding: 18,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                fontSize: 14,
                padding: '2px 10px',
                borderRadius: 12,
                color: activeScene.type === 'post' ? '#d46b08' : '#0958d9',
                background: activeScene.type === 'post' ? '#fff7e6' : '#e6f4ff',
              }}
            >
              {activeScene.type === 'post' ? '画面格: 原贴' : '画面格: 评论'}
            </div>
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>
              {activeScene.title || '未命名画面'} ({activeScene.items.length} 个项)
            </div>
          </div>

          {/* 与编辑页使用同一脚本渲染组件，保证所见即所得 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 18 }}>
            {activeScene.items.map((item: any) => (
              <div
                key={item.id}
                style={{
                  background: '#f8f9fa',
                  border: '1px dashed #d9d9d9',
                  borderRadius: 8,
                  padding: '16px 12px',
                }}
              >
                <ScriptContentRenderer content={item.content} author={item.author} />
              </div>
            ))}
          </div>
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
