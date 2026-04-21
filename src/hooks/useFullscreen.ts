import { useCallback, useEffect, useState, RefObject } from 'react';

export const useFullscreen = (containerRef: RefObject<HTMLDivElement | null>) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const enterFullscreen = useCallback(async () => {
    if (!containerRef.current || document.fullscreenElement) return;
    await containerRef.current.requestFullscreen();
  }, [containerRef]);

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
  }, [containerRef, enterFullscreen, exitFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [containerRef]);

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
  }, [containerRef, exitFullscreen, toggleFullscreen]);

  return { isFullscreen, toggleFullscreen, exitFullscreen };
};
