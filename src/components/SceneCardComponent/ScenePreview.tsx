import React from 'react';
import { Card, Typography, ColorPicker, Button } from 'antd';
import { SoundOutlined } from '@ant-design/icons';
import { VideoConfig, VideoScene } from '@/types';
import { ScriptContentRenderer } from '@components/ScriptContentRenderer';
import { toast } from '@components/Toast';

import { getActiveVideoCanvasSize } from '@/rendering/videoCanvas';

const { Text } = Typography;

const SCENE_PREVIEW_PADDING = 12;

interface ScenePreviewProps {
  scene: VideoScene;
  videoConfig: VideoConfig;
  previewShellRef: React.RefObject<HTMLDivElement | null>;
  previewContentRef: React.RefObject<HTMLDivElement | null>;
  previewMetrics: any;
  isMultiSelectMode: boolean;
  onUpdateScene: (updates: Partial<VideoScene>) => void;
}

export const ScenePreview: React.FC<ScenePreviewProps> = ({
  scene,
  videoConfig,
  previewShellRef,
  previewContentRef,
  previewMetrics,
  isMultiSelectMode,
  onUpdateScene,
}) => {
  const {
    previewAspectRatioLabel,
    previewLayout,
    previewHintText,
    hasPreviewOverflow,
    previewSurfaceHeight,
    previewViewportHeight,
    previewViewportTop,
    previewTopOverflowHeight,
    previewBottomOverflowHeight,
    previewContentOffsetTop,
  } = previewMetrics;

  const activeCanvas = getActiveVideoCanvasSize(videoConfig);

  return (
    <div
      id={`scene-card-items-container-${scene.id}`}
      style={{
        padding: '4px 8px',
        minHeight: '50px',
        borderRadius: 8,
      }}
    >
      <div
        style={{
          marginBottom: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <Text type="secondary" style={{ fontSize: 12 }}>
          画面卡片预览视口固定为 {previewAspectRatioLabel}（{activeCanvas.width} x {activeCanvas.height}），scene.layout={previewLayout}
        </Text>
        <Text type={hasPreviewOverflow ? 'danger' : 'secondary'} style={{ fontSize: 12 }}>
          {previewHintText}
        </Text>
      </div>

      <div ref={previewShellRef} style={{ 
        width: '100%', 
        height: previewSurfaceHeight > 0 ? previewSurfaceHeight : undefined,
        borderRadius: 12,
        border: activeCanvas.height > activeCanvas.width ? '1px solid var(--scene-item-border)' : 'none',
        padding: activeCanvas.height > activeCanvas.width ? '4px' : '0',
        position: 'relative',
      }}>
        <div
          style={{
            width: '100%',
            height: previewSurfaceHeight > 0 ? previewSurfaceHeight : undefined,
            minHeight: previewViewportHeight > 0 ? previewViewportHeight : undefined,
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: previewSurfaceHeight > 0 ? previewSurfaceHeight : undefined,
              minHeight: previewViewportHeight > 0 ? previewViewportHeight : undefined,
              aspectRatio: previewSurfaceHeight > 0 ? undefined : `${activeCanvas.width} / ${activeCanvas.height}`,
              borderRadius: 12,
              overflow: 'hidden',
              border: hasPreviewOverflow
                ? '1px solid rgba(255,77,79,0.45)'
                : '1px solid var(--scene-item-border)',
              background:
                scene.backgroundColor || '#ffffff',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.35)',
            }}
          >
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: previewViewportTop,
              height: previewViewportHeight || 0,
              borderTop: '1px dashed rgba(24,144,255,0.35)',
              borderBottom: '1px dashed rgba(24,144,255,0.35)',
              background: hasPreviewOverflow ? 'rgba(24,144,255,0.03)' : 'transparent',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />

          {previewTopOverflowHeight > 0 && (
            <div
              style={{
                position: 'absolute',
                inset: `0 0 auto 0`,
                height: previewTopOverflowHeight,
                background:
                  'linear-gradient(180deg, rgba(255,77,79,0.18), rgba(255,77,79,0.08))',
                pointerEvents: 'none',
                zIndex: 3,
              }}
            />
          )}

          {previewBottomOverflowHeight > 0 && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: previewBottomOverflowHeight,
                background:
                  'linear-gradient(180deg, rgba(255,77,79,0.08), rgba(255,77,79,0.2))',
                pointerEvents: 'none',
                zIndex: 3,
              }}
            />
          )}

          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: previewContentOffsetTop,
              padding: SCENE_PREVIEW_PADDING,
              zIndex: 2,
            }}
          >
            <div ref={previewContentRef}>
              {scene.items.map((item, idx) => (
                <div id={`scene-card-item-wrapper-${scene.id}-${item.id || idx}`} key={item.id || idx} style={{ marginBottom: 12 }}>
                  <Card
                    id={`scene-card-item-${scene.id}-${item.id || idx}`}
                    size="small"
                    variant="outlined"
                    style={{
                      background: item.backgroundColor || videoConfig.itemBackgroundColor || 'var(--scene-item-bg)',
                      border: '1px dashed var(--scene-item-border)',
                      position: 'relative',
                    }}
                  >
                    {!isMultiSelectMode && (
                      <div style={{ position: 'absolute', right: 4, top: 4, zIndex: 10 }}>
                        <ColorPicker
                          size="small"
                          value={item.backgroundColor || videoConfig.itemBackgroundColor || 'transparent'}
                          onChange={(color) => {
                            const newItems = [...scene.items];
                            newItems[idx] = { ...item, backgroundColor: color.toHexString() };
                            onUpdateScene({ items: newItems });
                          }}
                        />
                      </div>
                    )}
                    <div style={{ padding: '8px 4px' }}>
                      <ScriptContentRenderer 
                        content={item.content} 
                        author={item.author} 
                        hideAudio={true} 
                        maxQuoteDepth={videoConfig.maxQuoteDepth}
                        defaultQuoteMaxLimit={videoConfig.defaultQuoteMaxLimit}
                        defaultQuoteFontSize={videoConfig.quoteFontSize}
                        defaultBackgroundColor={videoConfig.quoteBackgroundColor || item.backgroundColor || videoConfig.itemBackgroundColor}
                        defaultBorderColor={videoConfig.quoteBorderColor}
                      />
                    </div>
                    {(() => {
                      const audioMatches = Array.from(item.content.matchAll(/\[audio src="([^"]+)"(?: start="([^"]*)")?(?: volume="([^"]*)")?\]/g));
                      if (audioMatches.length === 0) return null;
                      return (
                        <div style={{
                          padding: '4px 8px',
                          borderTop: '1px solid var(--scene-item-border)',
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 8,
                          background: 'rgba(0,0,0,0.02)'
                        }}>
                          {audioMatches.map((match, i) => {
                            const src = match[1];
                            const volume = parseFloat(match[3] || '1.0');
                            return (
                              <Button
                                key={i}
                                size="small"
                                type="text"
                                icon={<SoundOutlined />}
                                style={{ fontSize: 12, color: '#1890ff' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const audioUrl = `/audio/shortAudio/Unassigned/${src}`;
                                  const audio = new Audio(audioUrl);
                                  audio.volume = Math.max(0, Math.min(1, volume));
                                  audio.play().catch(err => {
                                    console.error('预览播放失败:', err);
                                    new Audio(`/audio/${src}`).play().catch(() => {
                                      toast.error(`音频文件不存在: ${src}`);
                                    });
                                  });
                                }}
                              >
                                {src}
                              </Button>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};
