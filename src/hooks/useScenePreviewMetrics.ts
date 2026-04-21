import { useState, useEffect, useRef, RefObject } from 'react';
import { VideoConfig, VideoScene } from '@/types';
import { getActiveVideoCanvasSize, getAspectRatioLabel, getVideoAspectRatio } from '@/rendering/videoCanvas';

interface PreviewMetrics {
  previewWidth: number;
  previewContentHeight: number;
  previewViewportHeight: number;
  previewSurfaceHeight: number;
  hasPreviewOverflow: boolean;
  previewContentOffsetTop: number;
  previewViewportTop: number;
  previewTopOverflowHeight: number;
  previewBottomOverflowHeight: number;
  previewHintText: string;
  previewLayout: 'center' | 'top';
  previewAspectRatioLabel: string;
}

export const useScenePreviewMetrics = (
  scene: VideoScene,
  videoConfig: VideoConfig,
  previewShellRef: RefObject<HTMLDivElement | null>,
  previewContentRef: RefObject<HTMLDivElement | null>
): PreviewMetrics => {
  const [previewWidth, setPreviewWidth] = useState(0);
  const [previewContentHeight, setPreviewContentHeight] = useState(0);

  useEffect(() => {
    const previewShell = previewShellRef.current;
    const previewContent = previewContentRef.current;

    if (!previewShell || !previewContent) return;

    const syncPreviewMetrics = () => {
      const nextWidth = Math.ceil(previewShell.getBoundingClientRect().width);
      const nextContentHeight = Math.ceil(previewContent.getBoundingClientRect().height);
      setPreviewWidth((prev) => (prev === nextWidth ? prev : nextWidth));
      setPreviewContentHeight((prev) => (prev === nextContentHeight ? prev : nextContentHeight));
    };

    syncPreviewMetrics();

    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(syncPreviewMetrics);
      window.addEventListener('resize', syncPreviewMetrics);
    }

    if (typeof ResizeObserver === 'undefined') {
      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('resize', syncPreviewMetrics);
        }
      };
    }

    const resizeObserver = new ResizeObserver(() => {
      syncPreviewMetrics();
    });

    resizeObserver.observe(previewShell);
    resizeObserver.observe(previewContent);

    return () => {
      resizeObserver.disconnect();
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', syncPreviewMetrics);
      }
    };
  }, [scene.id, scene.layout, scene.items, previewShellRef, previewContentRef]);

  const previewLayout = scene.layout === 'center' ? 'center' : 'top';
  const activeCanvas = getActiveVideoCanvasSize(videoConfig);
  const previewAspectRatio = getVideoAspectRatio(videoConfig);
  const previewAspectRatioLabel = getAspectRatioLabel(activeCanvas.width, activeCanvas.height);
  const previewViewportHeight = previewWidth > 0 ? Math.round(previewWidth / previewAspectRatio) : 0;
  const previewSurfaceHeight =
    previewViewportHeight > 0 ? Math.max(previewViewportHeight, previewContentHeight) : 0;
  const hasPreviewOverflow = previewViewportHeight > 0 && previewContentHeight - previewViewportHeight > 1;
  
  const previewContentOffsetTop =
    !hasPreviewOverflow && previewLayout === 'center' && previewViewportHeight > previewContentHeight
      ? Math.max(0, Math.round((previewViewportHeight - previewContentHeight) / 2))
      : 0;
      
  const previewViewportTop =
    hasPreviewOverflow && previewLayout === 'center'
      ? Math.max(0, Math.round((previewSurfaceHeight - previewViewportHeight) / 2))
      : 0;
      
  const previewViewportBottom = previewViewportTop + previewViewportHeight;
  const previewTopOverflowHeight = Math.max(0, previewViewportTop);
  const previewBottomOverflowHeight =
    previewSurfaceHeight > 0 ? Math.max(0, previewSurfaceHeight - previewViewportBottom) : 0;

  const previewHintText = (() => {
    if (hasPreviewOverflow) {
      return previewLayout === 'center'
        ? `超出 ${previewAspectRatioLabel} 的上下区域会以淡红色标出`
        : `超出 ${previewAspectRatioLabel} 的底部区域会以淡红色标出`;
    }
    return previewLayout === 'center'
      ? `内容不足时按 center 在 ${previewAspectRatioLabel} 视口内垂直居中`
      : `内容不足时按 top 在 ${previewAspectRatioLabel} 视口内从顶部开始排布`;
  })();

  return {
    previewWidth,
    previewContentHeight,
    previewViewportHeight,
    previewSurfaceHeight,
    hasPreviewOverflow,
    previewContentOffsetTop,
    previewViewportTop,
    previewTopOverflowHeight,
    previewBottomOverflowHeight,
    previewHintText,
    previewLayout,
    previewAspectRatioLabel,
  };
};
