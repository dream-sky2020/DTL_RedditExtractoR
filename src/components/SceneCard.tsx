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
} from '@ant-design/icons';
import { VideoScene } from '../types';
import { ScriptContentRenderer } from './ScriptContentRenderer';
import { SceneDslWarning, sceneToDsl, parseSceneDsl } from '../utils/sceneDsl';

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
      ref={innerRef}
      {...draggableProps}
      style={{ ...draggableProps?.style, marginBottom: 20 }}
    >
      <Card
        size="small"
        className={`scene-card ${isExpanded ? 'expanded' : 'collapsed'}`}
        style={{ 
          borderLeft: scene.type === 'post' ? '6px solid var(--scene-post-border)' : '6px solid var(--scene-comment-border)',
          boxShadow: isDragging ? '0 12px 32px var(--scene-card-shadow-dragging)' : (isExpanded ? '0 8px 24px var(--scene-card-shadow-expanded)' : '0 2px 8px var(--scene-card-shadow)'),
          background: isExpanded ? 'var(--scene-card-bg)' : 'var(--scene-card-bg-collapsed)',
          borderRadius: 12,
        }}
        title={<div {...dragHandleProps}><HolderOutlined style={{ color: 'var(--scene-holder-icon)' }} /></div>}
        extra={
          <Space size="middle">
            <Button size="small" icon={<EditOutlined />} onClick={toggleSceneEditor}>
              {isSceneEditorVisible ? '收起场景脚本' : '编辑场景脚本'}
            </Button>
            <Button size="small" icon={<EyeOutlined />} onClick={onPreviewScene} disabled={previewDisabled}>预览</Button>
            <Button size="small" danger icon={<DeleteOutlined />} onClick={onRemoveScene} />
          </Space>
        }
      >
        {isSceneEditorVisible && (
          <Card
            size="small"
            style={{ marginBottom: 12, background: 'var(--scene-card-bg-collapsed)', border: '1px solid var(--scene-item-border)' }}
            title="场景脚本（DSL）"
            extra={
              <Space>
                <Button
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
                  size="small"
                  onClick={() => {
                    setSceneEditorText(sceneEditorBackup);
                    message.info('已回退到打开编辑器时的快照');
                  }}
                >
                  回退
                </Button>
                <Button size="small" onClick={applySceneEditor}>
                  应用
                </Button>
                <Button size="small" type="primary" onClick={saveSceneEditor}>
                  保存
                </Button>
                <Checkbox
                  checked={autoApplySceneDsl}
                  onChange={(e) => setAutoApplySceneDsl(e.target.checked)}
                >
                  自动保存
                </Checkbox>
              </Space>
            }
          >
            <Text type="secondary">
              直接编辑场景 DSL。可在 scene 上使用 layout="top|center" 控制内容格垂直布局；在 item 正文中写 [\n] 可强制换行。
            </Text>
            <TextArea
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
          style={{
            padding: '4px 8px',
            minHeight: isExpanded ? '50px' : '0px',
            borderRadius: 8,
          }}
        >
          {scene.items.map((item) => (
            <div key={item.id} style={{ marginBottom: 12 }}>
              <Card
                size="small"
                style={{
                  background: 'var(--scene-item-bg)',
                  border: '1px dashed var(--scene-item-border)',
                }}
              >
                <div style={{ padding: '8px 4px' }}>
                  <ScriptContentRenderer content={item.content} author={item.author} />
                </div>
              </Card>
            </div>
          ))}
        </div>
      </Card>

      <Modal
        title="场景格式错误"
        open={isFormatErrorOpen}
        onCancel={() => setIsFormatErrorOpen(false)}
        footer={[
          <Button key="continue" onClick={() => setIsFormatErrorOpen(false)}>
            继续修改
          </Button>,
          <Button
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
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          {formatErrorMessage}
        </Typography.Paragraph>
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
        footer={[
          <Button
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
        <Typography.Paragraph>
          检测到以下警告，已给出修复建议。你可以返回修改，或忽略警告继续应用：
        </Typography.Paragraph>
        {dslWarnings.map((warning, idx) => (
          <Typography.Paragraph key={`dsl-warning-${idx}`} style={{ marginBottom: 8 }}>
            {idx + 1}. {warning.message}
            <br />
            <Text type="secondary">建议：{warning.suggestion}</Text>
          </Typography.Paragraph>
        ))}
      </Modal>
      <Modal
        title="场景脚本有未保存修改"
        open={isUnsavedConfirmOpen}
        onCancel={() => setIsUnsavedConfirmOpen(false)}
        footer={[
          <Button key="continue-editing" onClick={() => setIsUnsavedConfirmOpen(false)}>
            继续编辑
          </Button>,
          <Button
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
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          你修改了场景脚本但还未保存，是否先保存再退出？
        </Typography.Paragraph>
      </Modal>
    </div>
  );
};
