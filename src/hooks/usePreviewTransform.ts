import { useCallback, useEffect, useMemo, useRef, useState, RefObject } from 'react';

interface PreviewTransformOptions {
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
}

export const usePreviewTransform = (
  viewportRef: RefObject<HTMLDivElement | null>,
  options: PreviewTransformOptions = {}
) => {
  const {
    minZoom = 1,
    maxZoom = 4,
    zoomStep = 0.25
  } = options;

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [forceHorizontalCenter, setForceHorizontalCenter] = useState(true);
  const [viewportSize, setViewportSize] = useState({ width: 1, height: 1 });
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

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
    const nextZoom = Math.max(minZoom, Math.min(maxZoom, Number(targetZoom.toFixed(3))));

    if (nextZoom === zoom) return;

    const ratio = nextZoom / zoom;
    const nextOffset = {
      x: (fx - cx) - ((fx - cx - offset.x) * ratio),
      y: (fy - cy) - ((fy - cy - offset.y) * ratio),
    };
    const clampedOffset = clampOffset(nextZoom, nextOffset);

    setZoom(nextZoom);
    setOffset(clampedOffset);
  }, [clampOffset, minZoom, maxZoom, offset.x, offset.y, viewportRef, zoom]);

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
  }, [viewportRef]);

  useEffect(() => {
    setOffset((prev) => clampOffset(zoom, prev));
  }, [zoom, viewportSize.width, viewportSize.height, clampOffset]);

  useEffect(() => {
    if (!forceHorizontalCenter) return;
    setOffset((prev) => ({ ...prev, x: 0 }));
  }, [forceHorizontalCenter]);

  const handleWheel: React.WheelEventHandler<HTMLDivElement> = useCallback((event) => {
    const maxPanY = ((zoom - 1) * viewportSize.height) / 2;
    const canPanByWheel = zoom > minZoom && maxPanY > 0;

    if (!canPanByWheel) return;

    event.preventDefault();
    event.stopPropagation();

    const PAN_SPEED = 0.8;
    setOffset((prev) => clampOffset(zoom, {
      x: prev.x,
      y: prev.y + event.deltaY * PAN_SPEED,
    }));
  }, [clampOffset, minZoom, viewportSize.height, zoom]);

  const handlePointerDown: React.PointerEventHandler<HTMLDivElement> = useCallback((event) => {
    if (zoom <= 1) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
    };
    setIsDragging(true);
  }, [offset.x, offset.y, zoom]);

  const handlePointerMove: React.PointerEventHandler<HTMLDivElement> = useCallback((event) => {
    if (!dragRef.current || zoom <= 1) return;
    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;
    const nextOffset = clampOffset(zoom, {
      x: forceHorizontalCenter ? 0 : dragRef.current.originX + dx,
      y: dragRef.current.originY + dy,
    });
    setOffset(nextOffset);
  }, [clampOffset, forceHorizontalCenter, zoom]);

  const endDrag = useCallback(() => {
    dragRef.current = null;
    setIsDragging(false);
  }, []);

  const handlePointerUp: React.PointerEventHandler<HTMLDivElement> = useCallback((event) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    endDrag();
  }, [endDrag]);

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

  const resetTransform = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setIsDragging(false);
    dragRef.current = null;
  }, []);

  return {
    zoom,
    setZoom,
    offset,
    setOffset,
    isDragging,
    forceHorizontalCenter,
    setForceHorizontalCenter,
    navigatorRect,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave: endDrag,
    setZoomWithFocus,
    resetTransform,
    canZoomIn: zoom < maxZoom,
    canZoomOut: zoom > minZoom,
    canPanByWheel: zoom > minZoom && ((zoom - 1) * viewportSize.height) / 2 > 0,
    ZOOM_STEP: zoomStep,
  };
};
