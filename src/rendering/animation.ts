import React from 'react';
import { Easing, interpolate } from 'remotion';

export type AnimationEasing = string;

interface ParsedKeyframe {
  time: number;
  easing?: AnimationEasing;
  props: Record<string, string>;
}

interface BuildAnimationStyleOptions {
  from?: React.CSSProperties;
  to?: React.CSSProperties;
  keyframes?: string;
  currentTime: number;
  start?: number;
  duration?: number;
  easing?: AnimationEasing;
}

const TRANSFORM_KEYS = new Set(['x', 'y', 'scale', 'scaleX', 'scaleY', 'rotate']);

export const EASING_OPTIONS = [
  { label: '线性 (linear)', value: 'linear' },
  { label: '渐入 (ease-in)', value: 'ease-in' },
  { label: '渐出 (ease-out)', value: 'ease-out' },
  { label: '渐入渐出 (ease-in-out)', value: 'ease-in-out' },
  { label: '弹跳 (bounce)', value: 'bounce' },
  { label: '弹性 (elastic)', value: 'elastic' },
  { label: '强调减速 (cubic-bezier)', value: 'cubic-bezier(0.22, 1, 0.36, 1)' },
];

const splitFirstColon = (input: string): [string, string] | null => {
  const separatorIndex = input.indexOf(':');
  if (separatorIndex === -1) return null;
  const key = input.slice(0, separatorIndex).trim();
  const value = input.slice(separatorIndex + 1).trim();
  return key && value ? [key, value] : null;
};

const getDefaultUnit = (key: string): string => {
  if (key === 'x' || key === 'y') return 'px';
  if (key === 'rotate') return 'deg';
  return '';
};

const normalizeNumericValue = (key: string, value: string | number): string => {
  const raw = String(value).trim();
  if (!raw) return raw;
  const numeric = Number(raw);
  if (Number.isFinite(numeric) && getDefaultUnit(key)) {
    return `${raw}${getDefaultUnit(key)}`;
  }
  return raw;
};

export const parseAnimationStyle = (input = ''): React.CSSProperties => {
  const style: React.CSSProperties = {};

  input
    .split(';')
    .map(pair => pair.trim())
    .filter(Boolean)
    .forEach((pair) => {
      const parsed = splitFirstColon(pair);
      if (!parsed) return;

      const [key, rawValue] = parsed;
      const value = normalizeNumericValue(key, rawValue);
      if (TRANSFORM_KEYS.has(key)) {
        (style as any)[key] = value;
      } else if (key === 'opacity') {
        style.opacity = Number.isFinite(Number(value)) ? Number(value) : value as any;
      } else {
        (style as any)[key] = value;
      }
    });

  return style;
};

export const getEasingFunction = (easing: AnimationEasing = 'linear') => {
  const normalized = easing.trim();
  const bezierMatch = normalized.match(/^cubic-bezier\(\s*([-.\d]+)\s*,\s*([-.\d]+)\s*,\s*([-.\d]+)\s*,\s*([-.\d]+)\s*\)$/i);

  if (bezierMatch) {
    const points = bezierMatch.slice(1).map(Number);
    if (points.every(Number.isFinite) && typeof (Easing as any).bezier === 'function') {
      return (Easing as any).bezier(points[0], points[1], points[2], points[3]);
    }
  }

  switch (normalized) {
    case 'ease-in':
      return Easing.in(Easing.ease);
    case 'ease-out':
      return Easing.out(Easing.ease);
    case 'ease-in-out':
      return Easing.inOut(Easing.ease);
    case 'bounce':
      return Easing.bounce;
    case 'elastic':
      return Easing.elastic(1);
    case 'linear':
    default:
      return Easing.linear;
  }
};

const applyAnimationValue = (
  key: string,
  value: string | number,
  style: React.CSSProperties,
  transforms: string[]
) => {
  const normalized = normalizeNumericValue(key, value);

  if (key === 'x') transforms.push(`translateX(${normalized})`);
  else if (key === 'y') transforms.push(`translateY(${normalized})`);
  else if (key === 'scale') transforms.push(`scale(${normalized})`);
  else if (key === 'scaleX') transforms.push(`scaleX(${normalized})`);
  else if (key === 'scaleY') transforms.push(`scaleY(${normalized})`);
  else if (key === 'rotate') transforms.push(`rotate(${normalized})`);
  else if (key === 'opacity') style.opacity = Number.isFinite(Number(normalized)) ? Number(normalized) : normalized as any;
  else (style as any)[key] = normalized;
};

const interpolatePair = (
  key: string,
  fromValue: string | number,
  toValue: string | number,
  progress: number,
  style: React.CSSProperties,
  transforms: string[]
) => {
  const fromNum = parseFloat(String(fromValue));
  const toNum = parseFloat(String(toValue));

  if (Number.isFinite(fromNum) && Number.isFinite(toNum)) {
    const unit = String(fromValue).replace(/[0-9.-]/g, '') || String(toValue).replace(/[0-9.-]/g, '') || getDefaultUnit(key);
    const value = interpolate(progress, [0, 1], [fromNum, toNum]);
    applyAnimationValue(key, `${value}${unit}`, style, transforms);
    return;
  }

  applyAnimationValue(key, progress < 0.5 ? fromValue : toValue, style, transforms);
};

const applyFromTo = (
  from: React.CSSProperties,
  to: React.CSSProperties,
  progress: number,
  style: React.CSSProperties,
  transforms: string[]
) => {
  const keys = new Set([...Object.keys(from), ...Object.keys(to)]);

  keys.forEach((key) => {
    const fromValue = (from as any)[key];
    const toValue = (to as any)[key];
    if (fromValue === undefined || toValue === undefined) return;
    interpolatePair(key, fromValue, toValue, progress, style, transforms);
  });
};

const parseKeyframeHeader = (header: string): { time: number; easing?: AnimationEasing } | null => {
  const match = header.trim().match(/^([+-]?\d*\.?\d+)(?:\s*@\s*(.+))?$/);
  if (!match) return null;

  const time = Number(match[1]);
  if (!Number.isFinite(time)) return null;

  return {
    time,
    easing: match[2]?.trim(),
  };
};

export const parseAnimationKeyframes = (keyframes = ''): ParsedKeyframe[] =>
  keyframes
    .split(';')
    .map(stage => {
      const parsedStage = splitFirstColon(stage.trim());
      if (!parsedStage) return null;

      const header = parseKeyframeHeader(parsedStage[0]);
      if (!header) return null;

      const props: Record<string, string> = {};
      parsedStage[1]
        .split(',')
        .map(pair => pair.trim())
        .filter(Boolean)
        .forEach((pair) => {
          const prop = splitFirstColon(pair);
          if (prop) props[prop[0]] = prop[1];
        });

      return Object.keys(props).length > 0 ? { ...header, props } : null;
    })
    .filter((stage): stage is ParsedKeyframe => Boolean(stage))
    .sort((a, b) => a.time - b.time);

const findSegmentIndex = (timeline: number[], currentTime: number): number => {
  if (currentTime <= timeline[0]) return 1;
  for (let index = 1; index < timeline.length; index += 1) {
    if (currentTime <= timeline[index]) return index;
  }
  return timeline.length - 1;
};

const applyKeyframes = (
  keyframes: string,
  currentTime: number,
  duration: number,
  fallbackEasing: AnimationEasing,
  style: React.CSSProperties,
  transforms: string[]
) => {
  const stages = parseAnimationKeyframes(keyframes);
  if (stages.length < 2) return;

  const timeline = stages.map(stage => stage.time * Math.max(duration, 0.001));
  for (let index = 1; index < timeline.length; index += 1) {
    if (timeline[index] <= timeline[index - 1]) return;
  }

  const segmentIndex = findSegmentIndex(timeline, currentTime);
  const previousIndex = Math.max(0, segmentIndex - 1);
  const segmentStart = timeline[previousIndex];
  const segmentEnd = timeline[segmentIndex];
  const segmentProgress = interpolate(currentTime, [segmentStart, segmentEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: getEasingFunction(stages[segmentIndex].easing || fallbackEasing),
  });

  const keys = new Set<string>();
  stages.forEach(stage => Object.keys(stage.props).forEach(key => keys.add(key)));

  keys.forEach((key) => {
    const getCarriedValue = (stageIndex: number): string | undefined => {
      for (let index = stageIndex; index >= 0; index -= 1) {
        const value = stages[index].props[key];
        if (value !== undefined) return value;
      }
      return stages.find(stage => stage.props[key] !== undefined)?.props[key];
    };

    const fromValue = getCarriedValue(previousIndex);
    const toValue = getCarriedValue(segmentIndex);
    if (fromValue === undefined || toValue === undefined) return;

    interpolatePair(key, fromValue, toValue, segmentProgress, style, transforms);
  });
};

export const buildAnimationStyle = ({
  from = {},
  to = {},
  keyframes,
  currentTime,
  start = 0,
  duration = 1,
  easing = 'linear',
}: BuildAnimationStyleOptions): React.CSSProperties => {
  const style: React.CSSProperties = {};
  const transforms: string[] = [];
  const safeDuration = Math.max(duration, 0.001);

  if (keyframes?.trim()) {
    applyKeyframes(keyframes, currentTime - start, safeDuration, easing, style, transforms);
  } else {
    const progress = interpolate(currentTime, [start, start + safeDuration], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: getEasingFunction(easing),
    });
    applyFromTo(from, to, progress, style, transforms);
  }

  if (transforms.length > 0) {
    style.transform = transforms.join(' ');
  }

  return style;
};
