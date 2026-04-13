import React, { useState } from 'react';
import {
  Card,
  Input,
  Space,
  Button,
  Checkbox,
  Typography,
  Modal,
  message,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  HolderOutlined,
  SoundOutlined,
} from '@ant-design/icons';
import { VideoScene } from '../types';
import { ScriptContentRenderer } from './ScriptContentRenderer';
import { SceneDslWarning, sceneToDsl, parseSceneDsl } from '../utils/sceneDsl';

import { toast } from '../components/Toast';

const { Text } = Typography;
const { TextArea } = Input;

interface SceneCardProps {
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
          {scene.items.map((item, idx) => (
            <div id={`scene-card-item-wrapper-${scene.id}-${item.id || idx}`} key={item.id || idx} style={{ marginBottom: 12 }}>
              <Card
                id={`scene-card-item-${scene.id}-${item.id || idx}`}
                size="small"
                variant="outlined"
                style={{
                  background: 'var(--scene-item-bg)',
                  border: '1px dashed var(--scene-item-border)',
                }}
              >
                <div style={{ padding: '8px 4px' }}>
                  <ScriptContentRenderer content={item.content} author={item.author} hideAudio={true} />
                </div>
                {/* 渲染隐藏的音频按钮 */}
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
