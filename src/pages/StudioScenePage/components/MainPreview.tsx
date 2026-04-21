/**
 * MainPreview 组件
 * 功能：StudioScenePage 的主预览区，用于展示当前选中场景的大图画面。
 * 包含：
 * 1. 核心的画面渲染区域（通过 FramePlayer）。
 * 2. 自动处理画布比例（横屏 80% 宽度，竖屏 40% 宽度）。
 * 3. 场景缺失时的空状态处理。
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Empty } from 'antd';
import type { PlayerRef } from '@remotion/player';
import { VideoPreviewPlayer } from '../../../components/VideoPreviewPlayer';
import { VideoConfig } from '../../../types';
import { useFullscreen } from '@hooks/useFullscreen';
import { usePlayback } from '@hooks/usePlayback';
import { usePreviewTransform } from '@hooks/usePreviewTransform';
import { PreviewHeightControl } from './PreviewHeightControl';
import { PlaybackController } from './PlaybackController';
import { ZoomController } from './ZoomController';
import { PreviewNavigator } from './PreviewNavigator';

interface MainPreviewProps {
  hasScenes: boolean;
  videoConfig: VideoConfig;
  totalFrames: number;
  fps: number;
  seekFrame: number;
  canvasWidth: number;
  canvasHeight: number;
  currentSceneIdx: number;
  previewHeight: number;
  previewMinHeight: number;
  previewMaxHeight: number;
  isPreviewResizing: boolean;
  onPreviewHeightInputChange: (value: number | null) => void;
  onPreviewHeightReset: () => void;
  onPreviewResizeStart: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export const MainPreview: React.FC<MainPreviewProps> = ({
  hasScenes,
  videoConfig,
  totalFrames,
  fps,
  seekFrame,
  canvasWidth,
  canvasHeight,
  currentSceneIdx,
  previewHeight,
  previewMinHeight,
  previewMaxHeight,
  isPreviewResizing,
  onPreviewHeightInputChange,
  onPreviewHeightReset,
  onPreviewResizeStart,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<PlayerRef | null>(null);

  const sceneRange = useMemo(() => {
    const sceneStartFrame = videoConfig.scenes
      .slice(0, currentSceneIdx)
      .reduce((sum, scene) => sum + Math.max(0, Math.round((scene.duration || 0) * fps)), 0);
    const currentSceneDuration = Math.max(1, Math.round((videoConfig.scenes[currentSceneIdx]?.duration || 0) * fps));
    const sceneEndFrame = sceneStartFrame + currentSceneDuration - 1;
    return {
      start: sceneStartFrame,
      end: sceneEndFrame,
      length: currentSceneDuration,
    };
  }, [currentSceneIdx, fps, videoConfig.scenes]);

  const { isFullscreen, toggleFullscreen } = useFullscreen(containerRef);

  const {
    currentFrame,
    setCurrentFrame,
    isScenePlaying,
    setIsScenePlaying,
    isLoopEnabled,
    setIsLoopEnabled,
    jumpToSceneFrame,
    stepFrame,
    frameInScene,
  } = usePlayback(fps, seekFrame, sceneRange);

  const {
    zoom,
    offset,
    isDragging,
    forceHorizontalCenter,
    setForceHorizontalCenter,
    navigatorRect,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
    setZoomWithFocus,
    resetTransform,
    canZoomIn,
    canZoomOut,
    canPanByWheel,
    ZOOM_STEP,
  } = usePreviewTransform(viewportRef);

  useEffect(() => {
    // 场景切换时重置状态
    resetTransform();
    setIsScenePlaying(false);
    playerRef.current?.pause();
  }, [currentSceneIdx, resetTransform, setIsScenePlaying]);

  useEffect(() => {
    playerRef.current?.seekTo(currentFrame);
  }, [currentFrame]);

  return (
    <div ref={containerRef} style={{
      width: '100%',
      height: isFullscreen ? '100%' : `${previewHeight}px`,
      minHeight: previewMinHeight,
      background: '#000',
      borderRadius: 12,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <PreviewHeightControl
        previewHeight={previewHeight}
        previewMinHeight={previewMinHeight}
        previewMaxHeight={previewMaxHeight}
        onPreviewHeightInputChange={onPreviewHeightInputChange}
        onPreviewHeightReset={onPreviewHeightReset}
      />

      {hasScenes ? (
        <>
          <div
            ref={viewportRef}
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            style={{
              width: '100%',
              height: '100%',
              position: 'relative',
              overflow: 'hidden',
              cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
              touchAction: 'none',
              overscrollBehavior: canPanByWheel ? 'contain' : 'auto',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                transformOrigin: 'center center',
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                transition: isDragging ? 'none' : 'transform 120ms ease-out',
              }}
            >
              <VideoPreviewPlayer
                ref={playerRef}
                videoConfig={videoConfig}
                durationInFrames={totalFrames}
                fps={fps}
                initialFrame={currentFrame}
                key={`main-preview-frame-${currentSceneIdx}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
                controls={false}
                autoPlay={false}
              />
            </div>
          </div>
          
          <PlaybackController
            isScenePlaying={isScenePlaying}
            setIsScenePlaying={setIsScenePlaying}
            stepFrame={stepFrame}
            jumpToSceneFrame={jumpToSceneFrame}
            isLoopEnabled={isLoopEnabled}
            setIsLoopEnabled={setIsLoopEnabled}
            frameInScene={frameInScene}
            sceneRange={sceneRange}
            isFullscreen={isFullscreen}
          />

          <ZoomController
            zoom={zoom}
            ZOOM_STEP={ZOOM_STEP}
            canZoomOut={canZoomOut}
            canZoomIn={canZoomIn}
            isDragging={isDragging}
            isFullscreen={isFullscreen}
            forceHorizontalCenter={forceHorizontalCenter}
            setZoomWithFocus={setZoomWithFocus}
            resetTransform={resetTransform}
            toggleFullscreen={toggleFullscreen}
            setForceHorizontalCenter={setForceHorizontalCenter}
          />

          <PreviewNavigator navigatorRect={navigatorRect} />
        </>
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
          <Empty description="无可预览的画面格" />
        </div>
      )}
      {!isFullscreen && (
        <div
          role="separator"
          aria-label="调整主预览高度"
          onMouseDown={onPreviewResizeStart}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 10,
            cursor: 'row-resize',
            zIndex: 4,
            background: isPreviewResizing ? 'rgba(24,144,255,0.25)' : 'transparent',
          }}
        />
      )}
    </div>
  );
};
