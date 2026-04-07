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
import { sceneToDsl, parseSceneDsl } from '../utils/sceneDsl';

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

  const openSceneEditor = () => {
    const snapshot = sceneToDsl(scene);
    setSceneEditorText(snapshot);
    setSceneEditorBackup(snapshot);
    setIsSceneEditorVisible(true);
  };

  const toggleSceneEditor = () => {
    if (!isSceneEditorVisible) {
      openSceneEditor();
      return;
    }
    setIsSceneEditorVisible(false);
  };

  const tryApplySceneEditor = (text: string, silent = false) => {
    const parsed = parseSceneDsl(text, scene);
    if (!parsed.ok) {
      if (!silent) {
        setFormatErrorMessage(`场景脚本解析失败：${parsed.error}`);
        setIsFormatErrorOpen(true);
      }
      return false;
    }

    const result = onReplaceScene(parsed.scene);
    if (!result.ok) {
      if (!silent) {
        setFormatErrorMessage(result.message || '场景脚本应用失败');
        setIsFormatErrorOpen(true);
      }
      return false;
    }

    if (!silent) {
      message.success(result.message || '场景脚本已应用');
    }
    return true;
  };

  const applySceneEditor = () => {
    tryApplySceneEditor(sceneEditorText, false);
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
          borderLeft: scene.type === 'post' ? '6px solid #ff4500' : '6px solid #1890ff',
          boxShadow: isDragging ? '0 12px 32px rgba(0,0,0,0.2)' : (isExpanded ? '0 8px 24px rgba(0,0,0,0.12)' : '0 2px 8px rgba(0,0,0,0.05)'),
          background: isExpanded ? '#fff' : '#fafafa',
          borderRadius: 12,
        }}
        title={<div {...dragHandleProps}><HolderOutlined style={{ color: '#bfbfbf' }} /></div>}
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
            style={{ marginBottom: 12, background: '#fafafa', border: '1px solid #e8e8e8' }}
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
                <Button size="small" type="primary" onClick={applySceneEditor}>
                  应用脚本
                </Button>
                <Checkbox
                  checked={autoApplySceneDsl}
                  onChange={(e) => setAutoApplySceneDsl(e.target.checked)}
                >
                  自动应用
                </Checkbox>
              </Space>
            }
          >
            <Text type="secondary">
              直接编辑场景 DSL。语法示例：&lt;scene ...&gt;&lt;item ...&gt;...&lt;/item&gt;&lt;/scene&gt;
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
                  background: '#f8f9fa',
                  border: '1px dashed #d9d9d9',
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
    </div>
  );
};
