import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Typography, Tooltip } from 'antd';
import { LeftOutlined, RightOutlined, SoundOutlined } from '@ant-design/icons';
import axios from 'axios';
import { toast } from '../../components/Toast';
import { ASTNode, MediaItem } from './types';

const { Text } = Typography;

// --- Context ---
export const PlaybackContext = createContext<{
  playbackFrame?: number;
  fps?: number;
}>({});

export const usePlaybackContext = () => useContext(PlaybackContext);

// --- Constants ---
const AUDIO_ITEMS_STORAGE_KEY = 'reddit-extractor.audio-items.v1';

// --- Utilities ---
const refreshAudioCache = async () => {
  try {
    const response = await axios.get('http://localhost:5000/list_audio');
    if (response.data.success) {
      const files: string[] = response.data.files;
      const items = files.map((path: string) => {
        const fileName = path.split('/').pop() || path;
        const name = fileName.replace(/\.[^/.]+$/, '');
        const url = '/' + path.replace(/^public\//, '');
        return { name, path, url };
      });
      localStorage.setItem(AUDIO_ITEMS_STORAGE_KEY, JSON.stringify(items));
      return items;
    }
  } catch (err) {
    console.error('自动刷新音频缓存失败:', err);
  }
  return null;
};

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

  const heightMatch = attrStr.match(/\b(h|height)=([^ \]]+)/);
  if (heightMatch) {
    const val = heightMatch[2];
    mediaStyle.height = isNaN(Number(val)) ? val : `${val}px`;
    maxHeight = 'none';
  }

  mediaStyle.maxHeight = maxHeight;

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

  const wrapperStyle: React.CSSProperties = {
    margin: inRow ? '0' : '12px auto',
    textAlign: 'center',
    display: 'block',
    width: mediaStyle.width || 'auto',
    verticalAlign: 'top',
    position: 'relative',
  };

  return { mediaStyle, wrapperStyle };
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
  const { mediaStyle, wrapperStyle } = buildMediaStyles(attrStr, inRow);
  
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
              width: '100%',
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
    hideAudio = false,
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

      case 'audio':
        if (hideAudio) return null;
        return (
          <Tooltip key={index} title={`音频: ${node.src} (Vol: ${node.volume}, Start: ${node.start}s)`}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: 'rgba(24, 144, 255, 0.1)',
                border: '1px solid #1890ff',
                borderRadius: '4px',
                padding: '0 4px',
                margin: '0 2px',
                cursor: 'pointer',
                color: '#1890ff',
                fontSize: '12px'
              }}
              onClick={(e) => {
                e.stopPropagation();
                const audioUrl = `/audio/shortAudio/Unassigned/${node.src}`;
                const audio = new Audio(audioUrl);
                audio.volume = Math.max(0, Math.min(1, node.volume));
                audio.play().catch(() => {
                  new Audio(`/audio/${node.src}`).play().catch(() => {
                    toast.error(`音频文件不存在: ${node.src}`);
                    refreshAudioCache();
                  });
                });
              }}
            >
              <SoundOutlined style={{ marginRight: 4 }} />
              {node.src}
            </span>
          </Tooltip>
        );

      case 'row':
        return (
          <div key={index} style={node.style} className="script-row">
            {renderAST(node.children, { ...options, inRow: true })}
          </div>
        );

      default:
        return null;
    }
  });
};
