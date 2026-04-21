import React from 'react';

interface PreviewNavigatorProps {
  navigatorRect: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

export const PreviewNavigator: React.FC<PreviewNavigatorProps> = ({ navigatorRect }) => {
  return (
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
  );
};
