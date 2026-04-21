import React from 'react';

interface ZoomControllerProps {
  zoom: number;
  ZOOM_STEP: number;
  canZoomOut: boolean;
  canZoomIn: boolean;
  isDragging: boolean;
  isFullscreen: boolean;
  forceHorizontalCenter: boolean;
  setZoomWithFocus: (zoom: number) => void;
  resetTransform: () => void;
  toggleFullscreen: () => void;
  setForceHorizontalCenter: (force: boolean | ((prev: boolean) => boolean)) => void;
}

export const ZoomController: React.FC<ZoomControllerProps> = ({
  zoom,
  ZOOM_STEP,
  canZoomOut,
  canZoomIn,
  isDragging,
  isFullscreen,
  forceHorizontalCenter,
  setZoomWithFocus,
  resetTransform,
  toggleFullscreen,
  setForceHorizontalCenter,
}) => {
  return (
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
        onClick={resetTransform}
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
        onClick={toggleFullscreen}
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
  );
};
