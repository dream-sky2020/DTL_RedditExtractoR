/**
 * MainPreview 组件
 * 功能：StudioScenePage 的主预览区，用于展示当前选中场景的大图画面。
 * 包含：
 * 1. 核心的画面渲染区域（通过 FramePlayer）。
 * 2. 自动处理画布比例（横屏 80% 宽度，竖屏 40% 宽度）。
 * 3. 场景缺失时的空状态处理。
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Empty, InputNumber, Slider, Space, Typography } from 'antd';
import { PauseCircleOutlined, StepBackwardOutlined, StepForwardOutlined, PlayCircleOutlined } from '@ant-design/icons';
import type { PlayerRef } from '@remotion/player';
import { VideoPreviewPlayer } from '../../../components/VideoPreviewPlayer';
import { VideoConfig } from '../../../types';

const { Text } = Typography;

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
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [forceHorizontalCenter, setForceHorizontalCenter] = useState(true);
  const [viewportSize, setViewportSize] = useState({ width: 1, height: 1 });
  const [isScenePlaying, setIsScenePlaying] = useState(false);
  const [isLoopEnabled, setIsLoopEnabled] = useState(true);
  const [currentFrame, setCurrentFrame] = useState(seekFrame);
  const playerRef = useRef<PlayerRef | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  const MIN_ZOOM = 1;
  const MAX_ZOOM = 4;
  const ZOOM_STEP = 0.25;

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

  const frameInScene = useMemo(() => Math.max(0, currentFrame - sceneRange.start), [currentFrame, sceneRange.start]);

  const clampOffset = useCallback((nextZoom: number, nextOffset: { x: number; y: number }) => {
    const maxX = ((nextZoom - 1) * viewportSize.width) / 2;
    const maxY = ((nextZoom - 1) * viewportSize.height) / 2;
    const clampedX = forceHorizontalCenter
      ? 0
      : Math.max(-maxX, Math.min(maxX, nextOffset.x));
    return {
      x: clampedX,
      y: Math.max(-maxY, Math.min(maxY, nextOffset.y)),
    };
  }, [forceHorizontalCenter, viewportSize.height, viewportSize.width]);

  const setZoomWithFocus = useCallback((targetZoom: number, focusX?: number, focusY?: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const rect = viewport.getBoundingClientRect();
    const fx = focusX ?? rect.width / 2;
    const fy = focusY ?? rect.height / 2;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number(targetZoom.toFixed(3))));

    if (nextZoom === zoom) return;

    const ratio = nextZoom / zoom;
    const nextOffset = {
      x: (fx - cx) - ((fx - cx - offset.x) * ratio),
      y: (fy - cy) - ((fy - cy - offset.y) * ratio),
    };
    const clampedOffset = clampOffset(nextZoom, nextOffset);

    setZoom(nextZoom);
    setOffset(clampedOffset);
  }, [clampOffset, offset.x, offset.y, zoom]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width = entry.contentRect.width || 1;
      const height = entry.contentRect.height || 1;
      setViewportSize({ width, height });
    });

    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // 场景切换时重置视角，避免继承上一个场景的平移/缩放状态。
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setIsDragging(false);
    dragRef.current = null;
    setIsScenePlaying(false);
    playerRef.current?.pause();
  }, [currentSceneIdx]);

  useEffect(() => {
    setCurrentFrame(seekFrame);
  }, [seekFrame, currentSceneIdx]);

  useEffect(() => {
    setCurrentFrame((prev) => Math.max(sceneRange.start, Math.min(sceneRange.end, prev)));
  }, [sceneRange.end, sceneRange.start]);

  useEffect(() => {
    playerRef.current?.seekTo(currentFrame);
  }, [currentFrame]);

  useEffect(() => {
    setOffset((prev) => clampOffset(zoom, prev));
  }, [zoom, viewportSize.width, viewportSize.height, clampOffset]);

  useEffect(() => {
    if (!forceHorizontalCenter) return;
    setOffset((prev) => ({ ...prev, x: 0 }));
  }, [forceHorizontalCenter]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const enterFullscreen = useCallback(async () => {
    if (!containerRef.current || document.fullscreenElement) return;
    await containerRef.current.requestFullscreen();
  }, []);

  const exitFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) return;
    await document.exitFullscreen();
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement === containerRef.current) {
      await exitFullscreen();
      return;
    }
    await enterFullscreen();
  }, [enterFullscreen, exitFullscreen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingElement =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (isTypingElement) return;

      if (event.key === 'Escape' && document.fullscreenElement === containerRef.current) {
        event.preventDefault();
        void exitFullscreen();
        return;
      }

      if (event.key.toLowerCase() === 'f') {
        event.preventDefault();
        void toggleFullscreen();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [exitFullscreen, toggleFullscreen]);

  const handleWheel: React.WheelEventHandler<HTMLDivElement> = (event) => {
    const maxPanY = ((zoom - 1) * viewportSize.height) / 2;
    const canPanByWheel = zoom > MIN_ZOOM && maxPanY > 0;

    if (!canPanByWheel) return;

    event.preventDefault();
    event.stopPropagation();

    // 约定：上滚（deltaY < 0）= 视口向下移动；下滚（deltaY > 0）= 视口向上移动。
    const PAN_SPEED = 0.8;
    setOffset((prev) => clampOffset(zoom, {
      x: prev.x,
      y: prev.y + event.deltaY * PAN_SPEED,
    }));
  };

  const handlePointerDown: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (zoom <= 1) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
    };
    setIsDragging(true);
  };

  const handlePointerMove: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (!dragRef.current || zoom <= 1) return;
    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;
    const nextOffset = clampOffset(zoom, {
      x: forceHorizontalCenter ? 0 : dragRef.current.originX + dx,
      y: dragRef.current.originY + dy,
    });
    setOffset(nextOffset);
  };

  const endDrag = () => {
    dragRef.current = null;
    setIsDragging(false);
  };

  const handlePointerUp: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    endDrag();
  };

  const handlePointerLeave: React.PointerEventHandler<HTMLDivElement> = () => {
    endDrag();
  };

  const navigatorRect = useMemo(() => {
    if (zoom <= 1) {
      return { left: 0, top: 0, width: 100, height: 100 };
    }
    const width = Math.max(100 / zoom, 8);
    const height = Math.max(100 / zoom, 8);
    const left = (50 - 50 / zoom) - (offset.x * 100) / (zoom * viewportSize.width);
    const top = (50 - 50 / zoom) - (offset.y * 100) / (zoom * viewportSize.height);
    return {
      width,
      height,
      left: Math.max(0, Math.min(100 - width, left)),
      top: Math.max(0, Math.min(100 - height, top)),
    };
  }, [offset.x, offset.y, viewportSize.height, viewportSize.width, zoom]);

  const canZoomIn = zoom < MAX_ZOOM;
  const canZoomOut = zoom > MIN_ZOOM;
  const canPanByWheel = zoom > MIN_ZOOM && ((zoom - 1) * viewportSize.height) / 2 > 0;

  useEffect(() => {
    if (!isScenePlaying) return;

    let rafId = 0;
    let lastTs = performance.now();
    let accumulator = 0;
    const frameDurationMs = 1000 / fps;

    const tick = (timestamp: number) => {
      const delta = timestamp - lastTs;
      lastTs = timestamp;
      accumulator += delta;
      const stepFrames = Math.floor(accumulator / frameDurationMs);

      if (stepFrames > 0) {
        accumulator -= stepFrames * frameDurationMs;
        setCurrentFrame((prev) => {
          const next = prev + stepFrames;
          if (next <= sceneRange.end) {
            return next;
          }
          if (isLoopEnabled) {
            let looped = next;
            while (looped > sceneRange.end) {
              looped = sceneRange.start + (looped - sceneRange.end - 1);
            }
            return looped;
          }
          setIsScenePlaying(false);
          return sceneRange.end;
        });
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [fps, isLoopEnabled, isScenePlaying, sceneRange.end, sceneRange.start]);

  const jumpToSceneFrame = (offsetFrame: number) => {
    const clamped = Math.max(0, Math.min(sceneRange.length - 1, offsetFrame));
    setCurrentFrame(sceneRange.start + clamped);
  };

  const stepFrame = (delta: number) => {
    setCurrentFrame((prev) => {
      const next = prev + delta;
      return Math.max(sceneRange.start, Math.min(sceneRange.end, next));
    });
  };

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
      <div
        style={{
          position: 'absolute',
          left: 12,
          top: 12,
          zIndex: 3,
          padding: '6px 8px',
          borderRadius: 8,
          background: 'rgba(0,0,0,0.55)',
          border: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        <Space size={6} align="center">
          <Text style={{ color: '#fff', fontSize: 12 }}>高度</Text>
          <Space.Compact style={{ width: 118 }}>
            <InputNumber
              min={previewMinHeight}
              max={previewMaxHeight}
              value={previewHeight}
              onChange={onPreviewHeightInputChange}
              size="small"
              style={{ width: '100%' }}
            />
            <Button size="small" disabled>px</Button>
          </Space.Compact>
          <Button size="small" onClick={onPreviewHeightReset}>还原</Button>
        </Space>
      </div>

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
          <div
            style={{
              position: 'absolute',
              left: 12,
              bottom: 12,
              zIndex: 3,
              padding: '10px 12px',
              borderRadius: 10,
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.15)',
              width: isFullscreen ? 520 : 420,
              maxWidth: 'calc(100% - 170px)',
            }}
          >
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <Space size={8} align="center" wrap>
                <Button
                  size="small"
                  icon={isScenePlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                  onClick={() => setIsScenePlaying((prev) => !prev)}
                >
                  {isScenePlaying ? '暂停' : '播放'}
                </Button>
                <Button size="small" icon={<StepBackwardOutlined />} onClick={() => { setIsScenePlaying(false); stepFrame(-1); }}>
                  -1 帧
                </Button>
                <Button size="small" icon={<StepForwardOutlined />} onClick={() => { setIsScenePlaying(false); stepFrame(1); }}>
                  +1 帧
                </Button>
                <Button size="small" onClick={() => { setIsScenePlaying(false); jumpToSceneFrame(0); }}>
                  回到起始
                </Button>
                <Button
                  size="small"
                  type={isLoopEnabled ? 'primary' : 'default'}
                  onClick={() => setIsLoopEnabled((prev) => !prev)}
                >
                  {isLoopEnabled ? '循环: 开' : '循环: 关'}
                </Button>
              </Space>
              <Text style={{ color: '#fff', fontSize: 12 }}>
                场景帧 {frameInScene + 1}/{sceneRange.length}
              </Text>
              <Slider
                min={0}
                max={Math.max(0, sceneRange.length - 1)}
                value={frameInScene}
                step={1}
                onChange={(value) => {
                  setIsScenePlaying(false);
                  jumpToSceneFrame(Number(value));
                }}
                tooltip={{ formatter: (value) => `第 ${Number(value) + 1} 帧` }}
              />
            </Space>
          </div>

          <div
            style={{
              position: 'absolute',
              right: 12,
              top: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 8px',
              borderRadius: 8,
              background: 'rgba(0,0,0,0.55)',
              border: '1px solid rgba(255,255,255,0.15)',
              zIndex: 3,
            }}
          >
            <button
              type="button"
              onClick={() => setZoomWithFocus(zoom - ZOOM_STEP)}
              disabled={!canZoomOut}
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.35)',
                background: canZoomOut ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                color: '#fff',
                cursor: canZoomOut ? 'pointer' : 'not-allowed',
              }}
            >
              -
            </button>
            <span style={{ color: '#fff', minWidth: 54, textAlign: 'center', fontSize: 12 }}>
              {zoom.toFixed(2)}x
            </span>
            <button
              type="button"
              onClick={() => setZoomWithFocus(zoom + ZOOM_STEP)}
              disabled={!canZoomIn}
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.35)',
                background: canZoomIn ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                color: '#fff',
                cursor: canZoomIn ? 'pointer' : 'not-allowed',
              }}
            >
              +
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setOffset({ x: 0, y: 0 });
              }}
              disabled={!canZoomOut || isDragging}
              style={{
                height: 24,
                padding: '0 8px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.35)',
                background: canZoomOut ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                color: '#fff',
                fontSize: 12,
                cursor: canZoomOut ? 'pointer' : 'not-allowed',
              }}
            >
              重置
            </button>
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              style={{
                height: 24,
                padding: '0 8px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.35)',
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {isFullscreen ? '退出全屏' : '全屏'}
            </button>
            <button
              type="button"
              onClick={() => setForceHorizontalCenter((prev) => !prev)}
              style={{
                height: 24,
                padding: '0 8px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.35)',
                background: forceHorizontalCenter ? 'rgba(64,169,255,0.25)' : 'rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: 12,
                cursor: 'pointer',
              }}
              title="开启后将始终保持水平居中"
            >
              水平居中锁定
            </button>
          </div>

          <div
            style={{
              position: 'absolute',
              right: 12,
              bottom: 12,
              width: 140,
              height: 88,
              borderRadius: 8,
              overflow: 'hidden',
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.2)',
              zIndex: 3,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(0deg, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: `${navigatorRect.left}%`,
                top: `${navigatorRect.top}%`,
                width: `${navigatorRect.width}%`,
                height: `${navigatorRect.height}%`,
                border: '2px solid #40a9ff',
                borderRadius: 4,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.22)',
                background: 'rgba(64,169,255,0.12)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 8,
                top: 6,
                color: 'rgba(255,255,255,0.85)',
                fontSize: 11,
                lineHeight: 1,
              }}
            >
              Navigator
            </div>
            <div
              style={{
                position: 'absolute',
                right: 8,
                bottom: 6,
                color: 'rgba(255,255,255,0.7)',
                fontSize: 10,
                lineHeight: 1,
              }}
            >
              Esc/F
            </div>
          </div>
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
