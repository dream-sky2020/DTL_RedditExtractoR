import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Typography } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { interpolate, Easing } from 'remotion';
import { ASTNode, MediaItem, EasingType } from './types';
import { buildAnimationStyle } from '../animation';

const { Text } = Typography;

// --- Context ---
export const PlaybackContext = createContext<{
  playbackFrame?: number;
  fps?: number;
}>({});

export const usePlaybackContext = () => useContext(PlaybackContext);

const resolvePlaybackIndex = (items: MediaItem[], playbackSeconds: number): number => {
  if (items.length <= 1) return 0;
  const totalDuration = items.reduce((sum, item) => sum + Math.max(item.duration, 0.1), 0);
  if (!Number.isFinite(totalDuration) || totalDuration <= 0) return 0;

  let cursor = ((playbackSeconds % totalDuration) + totalDuration) % totalDuration;
  for (let i = 0; i < items.length; i += 1) {
    const itemDuration = Math.max(items[i].duration, 0.1);
    if (cursor < itemDuration) return i;
    cursor -= itemDuration;
  }
  return 0;
};

const getEasingFunction = (easing: EasingType) => {
  switch (easing) {
    case 'ease-in': return Easing.in(Easing.ease);
    case 'ease-out': return Easing.out(Easing.ease);
    case 'ease-in-out': return Easing.inOut(Easing.ease);
    case 'bounce': return Easing.bounce;
    case 'elastic': return Easing.elastic(1);
    case 'linear':
    default:
      return Easing.linear;
  }
};

const getDefaultTransformUnit = (key: string): string => {
  if (key === 'x' || key === 'y') return 'px';
  if (key === 'rotate') return 'deg';
  return '';
};

const splitAnimationPair = (input: string): [string, string] | null => {
  const separatorIndex = input.indexOf(':');
  if (separatorIndex === -1) return null;
  const key = input.slice(0, separatorIndex).trim();
  const value = input.slice(separatorIndex + 1).trim();
  return key && value ? [key, value] : null;
};

const applyAnimationValue = (
  key: string,
  value: string | number,
  style: React.CSSProperties,
  transforms: string[]
) => {
  const raw = String(value);
  const unit = raw.replace(/[0-9.-]/g, '') || getDefaultTransformUnit(key);

  if (key === 'x') transforms.push(`translateX(${parseFloat(raw)}${unit})`);
  else if (key === 'y') transforms.push(`translateY(${parseFloat(raw)}${unit})`);
  else if (key === 'scale') transforms.push(`scale(${raw})`);
  else if (key === 'scaleX') transforms.push(`scaleX(${raw})`);
  else if (key === 'scaleY') transforms.push(`scaleY(${raw})`);
  else if (key === 'rotate') transforms.push(`rotate(${parseFloat(raw)}${unit})`);
  else if (key === 'opacity') style.opacity = Number.isFinite(Number(raw)) ? Number(raw) : raw as any;
  else (style as any)[key] = raw;
};

const applyInterpolatedStyles = (
  from: React.CSSProperties,
  to: React.CSSProperties,
  progress: number,
  style: React.CSSProperties,
  transforms: string[]
) => {
  const keys = new Set([...Object.keys(from), ...Object.keys(to)]);

  keys.forEach((key) => {
    const fromVal = (from as any)[key];
    const toVal = (to as any)[key];

    if (fromVal === undefined || toVal === undefined) return;

    const fromNum = parseFloat(fromVal);
    const toNum = parseFloat(toVal);

    if (!Number.isNaN(fromNum) && !Number.isNaN(toNum)) {
      const currentNum = interpolate(progress, [0, 1], [fromNum, toNum]);
      const unit = String(fromVal).replace(/[0-9.-]/g, '') || String(toVal).replace(/[0-9.-]/g, '') || getDefaultTransformUnit(key);
      applyAnimationValue(key, `${currentNum}${unit}`, style, transforms);
    } else {
      applyAnimationValue(key, progress < 0.5 ? fromVal : toVal, style, transforms);
    }
  });
};

const parseKeyframes = (keyframes: string) =>
  keyframes
    .split(';')
    .map(stage => {
      const frame = splitAnimationPair(stage.trim());
      if (!frame) return null;

      const [timeText, propsText] = frame;
      const time = Number(timeText);
      if (!Number.isFinite(time)) return null;

      const props: Record<string, string> = {};
      propsText
        .split(',')
        .map(pair => pair.trim())
        .filter(Boolean)
        .forEach((pair) => {
          const prop = splitAnimationPair(pair);
          if (prop) props[prop[0]] = prop[1];
        });

      return Object.keys(props).length > 0 ? { time, props } : null;
    })
    .filter((stage): stage is { time: number; props: Record<string, string> } => Boolean(stage))
    .sort((a, b) => a.time - b.time);

const applyKeyframes = (
  keyframes: string,
  currentTime: number,
  duration: number,
  easing: EasingType,
  style: React.CSSProperties,
  transforms: string[]
) => {
  const stages = parseKeyframes(keyframes);
  if (stages.length < 2) return;

  const timeline = stages.map(stage => stage.time * Math.max(duration, 0.001));
  for (let i = 1; i < timeline.length; i += 1) {
    if (timeline[i] <= timeline[i - 1]) return;
  }

  const allKeys = new Set<string>();
  stages.forEach(stage => Object.keys(stage.props).forEach(key => allKeys.add(key)));

  allKeys.forEach((key) => {
    let lastValue = stages.find(stage => stage.props[key] !== undefined)?.props[key];
    if (lastValue === undefined) return;

    const rawValues = stages.map((stage) => {
      if (stage.props[key] !== undefined) lastValue = stage.props[key];
      return lastValue as string;
    });
    const numericValues = rawValues.map(value => parseFloat(value));
    const canInterpolate = numericValues.every(value => Number.isFinite(value));

    if (canInterpolate) {
      const currentValue = interpolate(currentTime, timeline, numericValues, {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: getEasingFunction(easing),
      });
      const unit = rawValues.find(value => value.replace(/[0-9.-]/g, ''))?.replace(/[0-9.-]/g, '') || getDefaultTransformUnit(key);
      applyAnimationValue(key, `${currentValue}${unit}`, style, transforms);
      return;
    }

    const activeIndex = timeline.findIndex(time => currentTime <= time);
    const value = rawValues[Math.max(0, activeIndex === -1 ? rawValues.length - 1 : activeIndex)];
    applyAnimationValue(key, value, style, transforms);
  });
};

const AnimateContent: React.FC<{
  from: React.CSSProperties;
  to: React.CSSProperties;
  keyframes?: string;
  start: number;
  duration: number;
  easing: string;
  children: React.ReactNode;
}> = ({ from, to, keyframes, start, duration, easing, children }) => {
  const { playbackFrame, fps } = usePlaybackContext();
  const currentTime = playbackFrame != null && fps ? playbackFrame / fps : 0;
  const animatedStyle = buildAnimationStyle({ from, to, keyframes, currentTime, start, duration, easing });

  return <div style={{ position: 'relative', ...animatedStyle, transition: 'none' }}>{children}</div>;
};

const buildMediaStyles = (attrStr: string, inRow: boolean = false) => {
  const mediaStyle: React.CSSProperties = {
    maxWidth: '100%',
    borderRadius: '4px',
    border: '1px solid var(--image-border)',
    display: 'block',
    margin: '0 auto',
    height: 'auto',
    objectFit: 'contain',
  };

  let maxHeight: string | number = '500px';

  const widthMatch = attrStr.match(/\b(w|width)=([^ \]]+)/);
  if (widthMatch) {
    const val = widthMatch[2];
    mediaStyle.width = isNaN(Number(val)) ? val : `${val}px`;
    mediaStyle.maxWidth = '100%';

    if (val.includes('%')) maxHeight = 'none';
  }

  let isHeightSet = false;
  const heightMatch = attrStr.match(/\b(h|height)=([^ \]]+)/);
  if (heightMatch) {
    const val = heightMatch[2];
    mediaStyle.height = isNaN(Number(val)) ? val : `${val}px`;
    maxHeight = 'none';
    isHeightSet = true;
  }

  const maxHeightMatch = attrStr.match(/\b(mh|max-height)=([^ \]]+)/);
  if (maxHeightMatch) {
    const val = maxHeightMatch[2];
    maxHeight = isNaN(Number(val)) ? val : `${val}px`;
  }

  mediaStyle.maxHeight = maxHeight;

  const mtMatch = attrStr.match(/\bmt=([^ \]]+)/);
  const mbMatch = attrStr.match(/\bmb=([^ \]]+)/);
  const marginTop = mtMatch ? (isNaN(Number(mtMatch[1])) ? mtMatch[1] : `${mtMatch[1]}px`) : (inRow ? '0' : '12px');
  const marginBottom = mbMatch ? (isNaN(Number(mbMatch[1])) ? mbMatch[1] : `${mbMatch[1]}px`) : (inRow ? '0' : '12px');

  const scaleMatch = attrStr.match(/\b(s|scale)=([^ \]]+)/);
  if (scaleMatch) {
    const scale = parseFloat(scaleMatch[2]);
    if (!isNaN(scale)) {
      mediaStyle.width = `${scale * 100}%`;
    }
  }

  const modeMatch = attrStr.match(/\bmode=([^ \]]+)/);
  if (modeMatch) {
    mediaStyle.objectFit = modeMatch[1] as any;
  }

  const posMatch = attrStr.match(/\bpos="([^"]+)"/);
  if (posMatch) {
    mediaStyle.objectPosition = posMatch[1];
  } else {
    const posSimpleMatch = attrStr.match(/\bpos=([^ \]]+)/);
    if (posSimpleMatch) {
      mediaStyle.objectPosition = posSimpleMatch[1].replace(/_/g, ' ');
    }
  }

  const wrapperStyle: React.CSSProperties = {
    marginTop,
    marginBottom,
    marginLeft: 'auto',
    marginRight: 'auto',
    textAlign: 'center',
    display: 'block',
    width: mediaStyle.width || 'auto',
    verticalAlign: 'top',
    position: 'relative',
  };

  return { mediaStyle, wrapperStyle, isHeightSet };
};

// --- Components ---
const MediaContent: React.FC<{
  mediaItems: MediaItem[];
  attrStr: string;
  showControls: boolean;
  inRow?: boolean;
}> = ({ mediaItems, attrStr, showControls, inRow = false }) => {
  const { playbackFrame, fps } = usePlaybackContext();
  const [manualIndex, setManualIndex] = useState(0);
  const [loadedUrls, setLoadedUrls] = useState<Set<string>>(new Set());

  useEffect(() => {
    setManualIndex(0);
    mediaItems.forEach((item) => {
      const img = new Image();
      img.src = item.url;
      img.onload = () => {
        setLoadedUrls((prev) => new Set(prev).add(item.url));
      };
    });
  }, [mediaItems.map((item) => `${item.url}|${item.duration}`).join(',')]);

  const playbackSeconds = playbackFrame != null && fps ? playbackFrame / fps : 0;
  const autoIndex = useMemo(
    () => resolvePlaybackIndex(mediaItems, playbackSeconds),
    [mediaItems, playbackSeconds]
  );
  const currentIndex = mediaItems.length <= 1 ? 0 : (showControls ? manualIndex : autoIndex);
  const currentItem = mediaItems[currentIndex] || mediaItems[0];
  const { mediaStyle, wrapperStyle, isHeightSet } = buildMediaStyles(attrStr, inRow);

  const navButtonStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    border: '1px solid rgba(255,255,255,0.22)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background-color 0.2s, transform 0.2s',
    zIndex: 3,
    boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
    backdropFilter: 'blur(6px)',
  };

  if (!currentItem) return null;

  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setManualIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length);
  };

  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setManualIndex((prev) => (prev + 1) % mediaItems.length);
  };

  return (
    <div key={currentItem.url} style={wrapperStyle}>
      <div style={{ position: 'relative', width: '100%' }}>
        {mediaItems.map((item, index) => (
          <img
            key={item.url}
            src={item.url}
            style={{
              ...mediaStyle,
              width: mediaStyle.width || (isHeightSet ? 'auto' : '100%'),
              display: index === currentIndex ? 'block' : 'none',
              visibility: index === currentIndex && !loadedUrls.has(item.url) ? 'hidden' : 'visible'
            }}
            alt="Content"
            referrerPolicy="no-referrer"
          />
        ))}
      </div>

      {showControls && mediaItems.length > 1 && (
        <>
          <div
            onClick={goPrev}
            style={{
              position: 'absolute',
              left: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              ...navButtonStyle,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.88)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.72)';
              e.currentTarget.style.transform = 'translateY(-50%)';
            }}
          >
            <LeftOutlined style={{ color: 'white', fontSize: 16 }} />
          </div>
          <div
            onClick={goNext}
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              ...navButtonStyle,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.88)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.72)';
              e.currentTarget.style.transform = 'translateY(-50%)';
            }}
          >
            <RightOutlined style={{ color: 'white', fontSize: 16 }} />
          </div>
          <div
            style={{
              position: 'absolute',
              right: 8,
              bottom: 8,
              backgroundColor: 'rgba(0,0,0,0.6)',
              color: 'white',
              padding: '2px 8px',
              borderRadius: 10,
              fontSize: 11,
              zIndex: 2,
            }}
          >
            {currentIndex + 1} / {mediaItems.length}
          </div>
        </>
      )}
    </div>
  );
};

// --- Renderer Logic ---
export interface RenderOptions {
  hideAudio?: boolean;
  showMediaControls?: boolean;
  defaultQuoteFontSize?: number;
  defaultBackgroundColor?: string;
  defaultBorderColor?: string;
  inRow?: boolean;
}

export const renderAST = (nodes: ASTNode[], options: RenderOptions = {}): React.ReactNode => {
  const {
    hideAudio: _hideAudio = false,
    showMediaControls = true,
    defaultQuoteFontSize = 12,
    defaultBackgroundColor,
    defaultBorderColor,
    inRow = false
  } = options;

  return nodes.map((node, index) => {
    switch (node.type) {
      case 'text':
        return <React.Fragment key={index}>{node.content}</React.Fragment>;

      case 'depthLimit': {
        const authorChain = node.authorChain.map((a) => `u/${a}:...`).join('->');
        return (
          <Text key={index} type="secondary" italic style={{ fontSize: '11px' }}>
            {authorChain} (已达到最大嵌套层级)
          </Text>
        );
      }

      case 'quote': {
        const resolvedBg = node.customStyle.backgroundColor || defaultBackgroundColor || 'var(--quote-bg)';
        const resolvedBorderColor = (node.customStyle.borderColor as string) || defaultBorderColor || 'var(--quote-border)';

        return (
          <div
            key={index}
            data-quote-id={node.itemId || undefined}
            style={{
              padding: '8px 12px',
              margin: '4px 0',
              borderRadius: '4px',
              fontSize: `${defaultQuoteFontSize}px`,
              ...node.customStyle,
              border: `1px solid ${resolvedBorderColor}`,
              backgroundColor: resolvedBg,
              borderColor: resolvedBorderColor,
            }}
          >
            <div style={{ color: 'inherit' }}>
              {renderAST(node.children, {
                ...options,
                defaultBackgroundColor: resolvedBg,
                defaultBorderColor: resolvedBorderColor
              })}
            </div>
          </div>
        );
      }

      case 'image':
        return (
          <MediaContent
            key={index}
            mediaItems={node.mediaItems}
            attrStr={node.attrStr}
            showControls={showMediaControls}
            inRow={inRow}
          />
        );

      case 'gallery':
        return (
          <MediaContent
            key={index}
            mediaItems={node.mediaItems}
            attrStr={node.attrStr}
            showControls={showMediaControls}
            inRow={inRow}
          />
        );

      case 'style':
        return (
          <span key={index} style={node.style}>
            {renderAST(node.children, options)}
          </span>
        );

      case 'row':
        return (
          <div key={index} style={node.style} className="script-row">
            {renderAST(node.children, { ...options, inRow: true })}
          </div>
        );

      case 'animate':
        return (
          <AnimateContent
            key={index}
            from={node.from}
            to={node.to}
            keyframes={node.keyframes}
            start={node.start}
            duration={node.duration}
            easing={node.easing}
          >
            {renderAST(node.children, options)}
          </AnimateContent>
        );

      default:
        return null;
    }
  });
};
