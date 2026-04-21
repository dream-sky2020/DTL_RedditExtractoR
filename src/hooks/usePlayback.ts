import { useCallback, useEffect, useMemo, useState } from 'react';

interface SceneRange {
  start: number;
  end: number;
  length: number;
}

export const usePlayback = (
  fps: number,
  initialFrame: number,
  sceneRange: SceneRange
) => {
  const [isScenePlaying, setIsScenePlaying] = useState(false);
  const [isLoopEnabled, setIsLoopEnabled] = useState(true);
  const [currentFrame, setCurrentFrame] = useState(initialFrame);

  useEffect(() => {
    setCurrentFrame(initialFrame);
  }, [initialFrame]);

  useEffect(() => {
    setCurrentFrame((prev) => Math.max(sceneRange.start, Math.min(sceneRange.end, prev)));
  }, [sceneRange.end, sceneRange.start]);

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

  const jumpToSceneFrame = useCallback((offsetFrame: number) => {
    const clamped = Math.max(0, Math.min(sceneRange.length - 1, offsetFrame));
    setCurrentFrame(sceneRange.start + clamped);
  }, [sceneRange.length, sceneRange.start]);

  const stepFrame = useCallback((delta: number) => {
    setCurrentFrame((prev) => {
      const next = prev + delta;
      return Math.max(sceneRange.start, Math.min(sceneRange.end, next));
    });
  }, [sceneRange.end, sceneRange.start]);

  const frameInScene = useMemo(() => Math.max(0, currentFrame - sceneRange.start), [currentFrame, sceneRange.start]);

  return {
    currentFrame,
    setCurrentFrame,
    isScenePlaying,
    setIsScenePlaying,
    isLoopEnabled,
    setIsLoopEnabled,
    jumpToSceneFrame,
    stepFrame,
    frameInScene,
  };
};
