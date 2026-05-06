import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Typography } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { interpolate, Easing } from 'remotion';
import { ASTNode, MediaItem, EasingType } from './types';

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

const AnimateContent: React.FC<{
  from: React.CSSProperties;
  to: React.CSSProperties;
  start: number;
  duration: number;
  easing: EasingType;
  children: React.ReactNode;
}> = ({ from, to, start, duration, easing, children }) => {
  const { playbackFrame, fps } = usePlaybackContext();
  const currentTime = playbackFrame != null && fps ? playbackFrame / fps : 0;

  const progress = interpolate(
    currentTime,
    [start, start + duration],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: getEasingFunction(easing),
    }
  );

  const animatedStyle: React.CSSProperties = { ...from };
  const keys = new Set([...Object.keys(from), ...Object.keys(to)]);

  keys.forEach((key) => {
    const fromVal = (from as any)[key];
    const toVal = (to as any)[key];

    if (fromVal === undefined || toVal === undefined) return;

    // Handle numeric values
    const fromNum = parseFloat(fromVal);
    const toNum = parseFloat(toVal);

    if (!isNaN(fromNum) && !isNaN(toNum)) {
      const currentNum = interpolate(progress, [0, 1], [fromNum, toNum]);
      const unit = String(fromVal).replace(/[0-9.-]/g, '') || String(toVal).replace(/[0-9.-]/g, '');
      (animatedStyle as any)[key] = `${currentNum}${unit}`;
    } else {
      // Non-numeric values (like colors or display) - switch at 0.5 progress
      (animatedStyle as any)[key] = progress < 0.5 ? fromVal : toVal;
    }
  });

  // Special handling for scale and translate if specified as x, y
  const transforms: string[] = [];
  if ((animatedStyle as any).scale !== undefined) {
    transforms.push(`scale(${(animatedStyle as any).scale})`);
    delete (animatedStyle as any).scale;
  }

  // If left/top are used for x/y in animate node, we might want to use translate for better performance
  // but for now we'll stick to what the user provides in from/to.

  if (transforms.length > 0) {
    animatedStyle.transform = transforms.join(' ');
  }

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
