/**
 * MainPreview 组件
 * 功能：StudioScenePage 的主预览区，用于展示当前选中场景的大图画面。
 * 包含：
 * 1. 核心的画面渲染区域（通过 FramePlayer）。
 * 2. 自动处理画布比例（横屏 80% 宽度，竖屏 40% 宽度）。
 * 3. 场景缺失时的空状态处理。
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Empty } from 'antd';
import { VideoConfig } from '../../../types';
import { useFullscreen } from '@hooks/useFullscreen';
import { usePlayback } from '@hooks/usePlayback';
import { usePreviewTransform } from '@hooks/usePreviewTransform';
import { SceneRenderer } from '../../../remotion/SceneRenderer';
import { PreviewHeightControl } from './PreviewHeightControl';
import { PlaybackController } from './PlaybackController';
import { ZoomController } from './ZoomController';
import { PreviewNavigator } from './PreviewNavigator';

interface MainPreviewProps {
  hasScenes: boolean;
  videoConfig: VideoConfig;
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
  const [viewportSize, setViewportSize] = useState({ width: 1, height: 1 });

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
  const currentScene = videoConfig.scenes[currentSceneIdx];

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
  }, [currentSceneIdx, resetTransform, setIsScenePlaying]);

  const previewFrameInScene = useMemo(
    () => Math.round(Math.max(0, Math.min(sceneRange.length - 1, currentFrame - sceneRange.start))),
    [currentFrame, sceneRange.length, sceneRange.start],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateViewportSize = (width: number, height: number) => {
      const nextWidth = Math.max(1, Math.round(width));
      const nextHeight = Math.max(1, Math.round(height));
      setViewportSize((prev) => {
        if (prev.width === nextWidth && prev.height === nextHeight) return prev;
        return { width: nextWidth, height: nextHeight };
      });
    };

    const rect = viewport.getBoundingClientRect();
    updateViewportSize(rect.width, rect.height);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      updateViewportSize(entry.contentRect.width, entry.contentRect.height);
    });

    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  const canvasScale = useMemo(() => {
    if (canvasWidth <= 0 || canvasHeight <= 0) return 1;
    return Math.max(0.01, Math.min(viewportSize.width / canvasWidth, viewportSize.height / canvasHeight));
  }, [canvasHeight, canvasWidth, viewportSize.height, viewportSize.width]);

  const stageWidth = canvasWidth * canvasScale;
  const stageHeight = canvasHeight * canvasScale;

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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transformOrigin: 'center center',
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                transition: isDragging ? 'none' : 'transform 120ms ease-out',
              }}
            >
              <div
                style={{
                  width: stageWidth,
                  height: stageHeight,
                  position: 'relative',
                  overflow: 'hidden',
                  background: '#000',
                }}
              >
                <div
                  style={{
                    width: canvasWidth,
                    height: canvasHeight,
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    transform: `scale(${canvasScale})`,
                    transformOrigin: 'top left',
                  }}
                >
                  {currentScene ? (
                    <SceneRenderer
                      scene={currentScene}
                      frame={previewFrameInScene}
                      fps={fps}
                      config={videoConfig}
                      isRemotion={false}
                    />
                  ) : null}
                </div>
              </div>
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
