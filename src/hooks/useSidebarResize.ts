import { useState, useRef, useEffect, useCallback } from 'react';
import { Modal, message } from 'antd';

interface UseSidebarResizeOptions {
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

export const useSidebarResize = (options: UseSidebarResizeOptions = {}) => {
  const {
    defaultWidth = 420,
    minWidth = 300,
    maxWidth = 760,
  } = options;

  const [sidebarWidth, setSidebarWidth] = useState(defaultWidth);
  const [isSidebarResizing, setIsSidebarResizing] = useState(false);
  const sidebarResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const clampSidebarWidth = useCallback((nextWidth: number): number => {
    const viewportMax =
      typeof window === 'undefined' ? maxWidth : Math.floor(window.innerWidth * 0.72);
    const maxAllowed = Math.max(minWidth, Math.min(maxWidth, viewportMax));
    return Math.min(maxAllowed, Math.max(minWidth, Math.round(nextWidth)));
  }, [minWidth, maxWidth]);

  useEffect(() => {
    if (!isSidebarResizing) return;

    const handleMouseMove = (event: MouseEvent) => {
      const resizeSnapshot = sidebarResizeRef.current;
      if (!resizeSnapshot) return;
      const deltaX = resizeSnapshot.startX - event.clientX;
      const nextWidth = clampSidebarWidth(resizeSnapshot.startWidth + deltaX);
      setSidebarWidth(nextWidth);
    };

    const handleMouseUp = () => {
      setIsSidebarResizing(false);
      sidebarResizeRef.current = null;
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isSidebarResizing, clampSidebarWidth]);

  const startSidebarResize = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    sidebarResizeRef.current = {
      startX: event.clientX,
      startWidth: sidebarWidth,
    };
    setIsSidebarResizing(true);
  };

  const updateSidebarWidthByInput = (value: number | null) => {
    if (value == null || Number.isNaN(value)) return;
    setSidebarWidth(clampSidebarWidth(value));
  };

  const resetSidebarWidthToDefault = () => {
    Modal.confirm({
      title: '还原右侧面板宽度',
      content: `确认将右侧面板宽度还原为默认值 ${defaultWidth}px 吗？`,
      okText: '确认还原',
      cancelText: '取消',
      onOk: () => {
        setSidebarWidth(clampSidebarWidth(defaultWidth));
        message.success('右侧面板宽度已还原为默认值');
      },
    });
  };

  return {
    sidebarWidth,
    isSidebarResizing,
    startSidebarResize,
    updateSidebarWidthByInput,
    resetSidebarWidthToDefault,
    constants: {
      DEFAULT_SIDEBAR_WIDTH: defaultWidth,
      SIDEBAR_MIN_WIDTH: minWidth,
      SIDEBAR_MAX_WIDTH: maxWidth,
    }
  };
};
