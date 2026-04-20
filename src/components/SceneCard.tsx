import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Card,
  Input,
  Space,
  Button,
  Checkbox,
  Typography,
  Modal,
  message,
  ColorPicker,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  HolderOutlined,
  SoundOutlined,
} from '@ant-design/icons';
import { VideoConfig, VideoScene } from '../types';
import { ScriptContentRenderer } from './ScriptContentRenderer';
import { SceneDslWarning, sceneToDsl, parseSceneDsl } from '../rendering/sceneDsl';
import { getActiveVideoCanvasSize, getAspectRatioLabel, getVideoAspectRatio } from '../rendering/videoCanvas';

import { toast } from '../components/Toast';

const { Text } = Typography;
const { TextArea } = Input;

const SCENE_PREVIEW_PADDING = 12;

interface SceneCardProps {
  videoConfig: VideoConfig;
  scene: VideoScene;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdateScene: (updates: Partial<VideoScene>) => void;
  onRemoveScene: () => void;
  onPreviewScene: () => void;
  onReplaceScene: (nextScene: VideoScene) => { ok: boolean; message?: string };
  // 以下是 dnd 相关
  draggableProps?: any;
  dragHandleProps?: any;
  innerRef?: (element: HTMLElement | null) => void;
  isDragging?: boolean;
  previewDisabled?: boolean;
  isMultiSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: () => void;
}

export const SceneCard: React.FC<SceneCardProps> = ({
  videoConfig,
  scene,
  index,
  isExpanded,
  onToggleExpand,
  onUpdateScene,
  onRemoveScene,
  onPreviewScene,
  onReplaceScene,
  draggableProps,
  dragHandleProps,
  innerRef,
  isDragging,
  previewDisabled = false,
  isMultiSelectMode = false,
  isSelected = false,
  onToggleSelection,
}) => {
  const [isSceneEditorVisible, setIsSceneEditorVisible] = useState(false);
  const [sceneEditorText, setSceneEditorText] = useState('');
  const [sceneEditorBackup, setSceneEditorBackup] = useState('');
  const [autoApplySceneDsl, setAutoApplySceneDsl] = useState(false);
  const [isFormatErrorOpen, setIsFormatErrorOpen] = useState(false);
  const [formatErrorMessage, setFormatErrorMessage] = useState('');
  const [isUnsavedConfirmOpen, setIsUnsavedConfirmOpen] = useState(false);
  const [isDslWarningOpen, setIsDslWarningOpen] = useState(false);
  const [dslWarnings, setDslWarnings] = useState<SceneDslWarning[]>([]);
  const [pendingApply, setPendingApply] = useState<{ scene: VideoScene; text: string; successMessage?: string } | null>(null);
  const [closeAfterWarningApply, setCloseAfterWarningApply] = useState(false);
  const previewShellRef = useRef<HTMLDivElement | null>(null);
  const previewContentRef = useRef<HTMLDivElement | null>(null);
  const [previewWidth, setPreviewWidth] = useState(0);
  const [previewContentHeight, setPreviewContentHeight] = useState(0);

  const openSceneEditor = () => {
    const snapshot = sceneToDsl(scene);
    setSceneEditorText(snapshot);
    setSceneEditorBackup(snapshot);
    setIsUnsavedConfirmOpen(false);
    setIsDslWarningOpen(false);
    setDslWarnings([]);
    setPendingApply(null);
    setCloseAfterWarningApply(false);
    setIsSceneEditorVisible(true);
  };

  const hasUnsavedChanges = sceneEditorText !== sceneEditorBackup;

  const closeSceneEditor = () => {
    if (hasUnsavedChanges) {
      setIsUnsavedConfirmOpen(true);
      return;
    }
    setIsSceneEditorVisible(false);
  };

  const toggleSceneEditor = () => {
    if (!isSceneEditorVisible) {
      openSceneEditor();
      return;
    }
    closeSceneEditor();
  };

  const commitSceneEditor = (
    nextScene: VideoScene,
    sourceText: string,
    silent = false,
    successMessage?: string
  ) => {
    const result = onReplaceScene(nextScene);
    if (!result.ok) {
      if (!silent) {
        setFormatErrorMessage(result.message || '场景脚本应用失败');
        setIsFormatErrorOpen(true);
      }
      return false;
    }

    if (!silent) {
      message.success(successMessage || result.message || '场景脚本已应用');
    }
    setSceneEditorBackup(sourceText);
    return true;
  };

  const tryApplySceneEditor = (text: string, silent = false, successMessage?: string) => {
    const parsed = parseSceneDsl(text, scene);
    if (!parsed.ok) {
      if (!silent) {
        setFormatErrorMessage(`场景脚本解析失败：${parsed.error}`);
        setIsFormatErrorOpen(true);
      }
      return false;
    }

    if (!silent && parsed.warnings.length > 0) {
      setDslWarnings(parsed.warnings);
      setPendingApply({ scene: parsed.scene, text, successMessage });
      setIsDslWarningOpen(true);
      return false;
    }

    return commitSceneEditor(parsed.scene, text, silent, successMessage);
  };

  const applySceneEditor = () => {
    setCloseAfterWarningApply(false);
    tryApplySceneEditor(sceneEditorText, false, '场景脚本已应用');
  };

  const saveSceneEditor = () => {
    setCloseAfterWarningApply(false);
    tryApplySceneEditor(sceneEditorText, false, '场景脚本已保存');
  };

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
  }, [scene.id, scene.layout, scene.items]);

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
  const previewHintText = useMemo(() => {
    if (hasPreviewOverflow) {
      return previewLayout === 'center'
        ? `超出 ${previewAspectRatioLabel} 的上下区域会以淡红色标出`
        : `超出 ${previewAspectRatioLabel} 的底部区域会以淡红色标出`;
    }
    return previewLayout === 'center'
      ? `内容不足时按 center 在 ${previewAspectRatioLabel} 视口内垂直居中`
      : `内容不足时按 top 在 ${previewAspectRatioLabel} 视口内从顶部开始排布`;
  }, [hasPreviewOverflow, previewAspectRatioLabel, previewLayout]);

  return (
    <div
      id={`scene-card-wrapper-${scene.id}`}
      ref={innerRef}
      {...draggableProps}
      style={{ ...draggableProps?.style, marginBottom: 20 }}
    >
      <Card
        id={`scene-card-${scene.id}`}
        size="small"
        className={`scene-card ${isExpanded ? 'expanded' : 'collapsed'} ${isSelected ? 'selected' : ''}`}
        variant="outlined"
        style={{ 
          borderLeft: scene.type === 'post' ? '6px solid var(--scene-post-border)' : '6px solid var(--scene-comment-border)',
          boxShadow: isDragging ? '0 12px 32px var(--scene-card-shadow-dragging)' : (isExpanded ? '0 8px 24px var(--scene-card-shadow-expanded)' : '0 2px 8px var(--scene-card-shadow)'),
          background: isSelected ? 'var(--brand-primary-light)' : (isExpanded ? 'var(--scene-card-bg)' : 'var(--scene-card-bg-collapsed)'),
          borderRadius: 12,
          cursor: isMultiSelectMode ? 'pointer' : 'default',
          border: isSelected ? '2px solid var(--brand-primary)' : '1px solid transparent',
        }}
        onClick={() => {
          if (isMultiSelectMode && onToggleSelection) {
            onToggleSelection();
          }
        }}
        title={
          <Space>
            {isMultiSelectMode && (
              <Checkbox 
                checked={isSelected} 
                onChange={(e) => {
                  e.stopPropagation();
                  onToggleSelection?.();
                }} 
              />
            )}
            <div id={`scene-card-drag-handle-${scene.id}`} {...dragHandleProps}>
              <HolderOutlined style={{ color: 'var(--scene-holder-icon)' }} />
            </div>
          </Space>
        }
        extra={
          <Space id={`scene-card-actions-${scene.id}`} size="middle">
            {!isMultiSelectMode && (
              <>
                <ColorPicker
                  size="small"
                  value={scene.backgroundColor || videoConfig.sceneBackgroundColor || '#ffffff'}
                  onChange={(color) => onUpdateScene({ backgroundColor: color.toHexString() })}
                  showText
                />
                <Button id={`scene-card-edit-btn-${scene.id}`} name="edit-dsl-btn" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); toggleSceneEditor(); }}>
                  {isSceneEditorVisible ? '收起场景脚本' : '编辑场景脚本'}
                </Button>
                <Button id={`scene-card-preview-btn-${scene.id}`} name="preview-scene-btn" size="small" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); onPreviewScene(); }} disabled={previewDisabled}>预览</Button>
                <Button id={`scene-card-delete-btn-${scene.id}`} name="delete-scene-btn" size="small" danger icon={<DeleteOutlined />} onClick={(e) => { e.stopPropagation(); onRemoveScene(); }} />
              </>
            )}
            {isMultiSelectMode && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {isSelected ? '已选中' : '未选中'}
              </Text>
            )}
          </Space>
        }
      >
        {isSceneEditorVisible && (
          <Card
            id={`scene-card-dsl-editor-${scene.id}`}
            size="small"
            variant="outlined"
            style={{ marginBottom: 12, background: 'var(--scene-card-bg-collapsed)', border: '1px solid var(--scene-item-border)' }}
            title="场景脚本（DSL）"
            extra={
              <Space id={`scene-card-dsl-actions-${scene.id}`}>
                <Button
                  id={`scene-card-dsl-reload-btn-${scene.id}`}
                  name="dsl-reload-btn"
                  size="small"
                  onClick={() => {
                    const snapshot = sceneToDsl(scene);
                    setSceneEditorText(snapshot);
                    setSceneEditorBackup(snapshot);
                    message.info('已从当前场景重载脚本');
                  }}
                >
                  从当前场景重载
                </Button>
                <Button
                  id={`scene-card-dsl-rollback-btn-${scene.id}`}
                  name="dsl-rollback-btn"
                  size="small"
                  onClick={() => {
                    setSceneEditorText(sceneEditorBackup);
                    message.info('已回退到打开编辑器时的快照');
                  }}
                >
                  回退
                </Button>
                <Button id={`scene-card-dsl-apply-btn-${scene.id}`} name="dsl-apply-btn" size="small" onClick={applySceneEditor}>
                  应用
                </Button>
                <Button id={`scene-card-dsl-save-btn-${scene.id}`} name="dsl-save-btn" size="small" type="primary" onClick={saveSceneEditor}>
                  保存
                </Button>
                <Checkbox
                  id={`scene-card-dsl-auto-apply-checkbox-${scene.id}`}
                  name="dsl-auto-apply-checkbox"
                  checked={autoApplySceneDsl}
                  onChange={(e) => setAutoApplySceneDsl(e.target.checked)}
                >
                  自动保存
                </Checkbox>
              </Space>
            }
          >
            <Text id={`scene-card-dsl-desc-${scene.id}`} type="secondary">
              直接编辑场景 DSL。可在 scene 上使用 layout="top|center" 控制内容格垂直布局；在 item 正文中写 [\n] 可强制换行。
            </Text>
            <TextArea
              id={`scene-card-dsl-textarea-${scene.id}`}
              name="dsl-textarea"
              value={sceneEditorText}
              onChange={(e) => {
                const nextText = e.target.value;
                setSceneEditorText(nextText);
                if (autoApplySceneDsl) {
                  tryApplySceneEditor(nextText, true);
                }
              }}
              rows={14}
              style={{ marginTop: 8, fontFamily: 'monospace' }}
            />
          </Card>
        )}

        <div
          id={`scene-card-items-container-${scene.id}`}
          style={{
            padding: '4px 8px',
            minHeight: isExpanded ? '50px' : '0px',
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
                            defaultBackgroundColor={item.backgroundColor || videoConfig.itemBackgroundColor}
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
                                const start = parseFloat(match[2] || '0');
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
    </Card>

      <Modal
        title="场景格式错误"
        open={isFormatErrorOpen}
        onCancel={() => setIsFormatErrorOpen(false)}
        destroyOnHidden
        footer={[
          <Button id={`scene-card-format-error-continue-btn-${scene.id}`} key="continue" onClick={() => setIsFormatErrorOpen(false)}>
            继续修改
          </Button>,
          <Button
            id={`scene-card-format-error-rollback-btn-${scene.id}`}
            key="rollback"
            danger
            onClick={() => {
              setSceneEditorText(sceneEditorBackup);
              setIsFormatErrorOpen(false);
              message.info('已回退到打开脚本编辑器时的数据快照');
            }}
          >
            回退数据
          </Button>,
        ]}
      >
        <div id={`scene-card-format-error-modal-content-${scene.id}`}>
          <Typography.Paragraph id={`scene-card-format-error-msg-${scene.id}`} style={{ marginBottom: 0 }}>
            {formatErrorMessage}
          </Typography.Paragraph>
        </div>
      </Modal>
      <Modal
        title="场景脚本存在警告"
        open={isDslWarningOpen}
        onCancel={() => {
          setIsDslWarningOpen(false);
          setPendingApply(null);
          setDslWarnings([]);
          setCloseAfterWarningApply(false);
        }}
        destroyOnHidden
        footer={[
          <Button
            id={`scene-card-dsl-warning-back-btn-${scene.id}`}
            key="back-edit"
            onClick={() => {
              setIsDslWarningOpen(false);
              setPendingApply(null);
              setDslWarnings([]);
              setCloseAfterWarningApply(false);
            }}
          >
            返回修改
          </Button>,
          <Button
            id={`scene-card-dsl-warning-ignore-btn-${scene.id}`}
            key="ignore-warning"
            type="primary"
            onClick={() => {
              if (!pendingApply) return;
              const ok = commitSceneEditor(
                pendingApply.scene,
                pendingApply.text,
                false,
                pendingApply.successMessage || '场景脚本已应用（含警告）'
              );
              if (!ok) return;
              setIsDslWarningOpen(false);
              setPendingApply(null);
              setDslWarnings([]);
              if (closeAfterWarningApply) {
                setIsUnsavedConfirmOpen(false);
                setIsSceneEditorVisible(false);
                setCloseAfterWarningApply(false);
              }
            }}
          >
            忽略警告并应用
          </Button>,
        ]}
      >
        <div id={`scene-card-dsl-warning-modal-content-${scene.id}`}>
          <Typography.Paragraph id={`scene-card-dsl-warning-desc-${scene.id}`}>
            检测到以下警告，已给出修复建议。你可以返回修改，或忽略警告继续应用：
          </Typography.Paragraph>
          {dslWarnings.map((warning, idx) => (
            <Typography.Paragraph id={`scene-card-dsl-warning-item-${scene.id}-${idx}`} key={`dsl-warning-${idx}`} style={{ marginBottom: 8 }}>
              {idx + 1}. {warning.message}
              <br />
              <Text type="secondary">建议：{warning.suggestion}</Text>
            </Typography.Paragraph>
          ))}
        </div>
      </Modal>
      <Modal
        title="场景脚本有未保存修改"
        open={isUnsavedConfirmOpen}
        onCancel={() => setIsUnsavedConfirmOpen(false)}
        destroyOnHidden
        footer={[
          <Button id={`scene-card-unsaved-continue-btn-${scene.id}`} key="continue-editing" onClick={() => setIsUnsavedConfirmOpen(false)}>
            继续编辑
          </Button>,
          <Button
            id={`scene-card-unsaved-discard-btn-${scene.id}`}
            key="discard-and-close"
            danger
            onClick={() => {
              setSceneEditorText(sceneEditorBackup);
              setIsUnsavedConfirmOpen(false);
              setIsSceneEditorVisible(false);
              message.info('已放弃未保存的场景脚本修改');
            }}
          >
            不保存并退出
          </Button>,
          <Button
            id={`scene-card-unsaved-save-btn-${scene.id}`}
            key="save-and-close"
            type="primary"
            onClick={() => {
              setCloseAfterWarningApply(true);
              const ok = tryApplySceneEditor(sceneEditorText, false, '场景脚本已保存');
              if (!ok) return;
              setIsUnsavedConfirmOpen(false);
              setIsSceneEditorVisible(false);
            }}
          >
            保存并退出
          </Button>,
        ]}
      >
        <div id={`scene-card-unsaved-modal-content-${scene.id}`}>
          <Typography.Paragraph id={`scene-card-unsaved-msg-${scene.id}`} style={{ marginBottom: 0 }}>
            你修改了场景脚本但还未保存，是否先保存再退出？
          </Typography.Paragraph>
        </div>
      </Modal>
    </div>
  );
};
