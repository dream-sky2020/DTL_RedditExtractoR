import React, { useState } from 'react';
import {
  Card,
  Input,
  Space,
  Button,
  Row,
  Col,
  Typography,
  Divider,
  InputNumber,
  Tag,
  Modal,
  message,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  HolderOutlined,
  PlusOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { VideoScene, VideoContentItem } from '../types';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { ScriptContentRenderer } from './ScriptContentRenderer';

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
  onUpdateItem: (itemId: string, updates: Partial<VideoContentItem>) => void;
  onRemoveItem: (itemId: string) => void;
  onAddItem: () => void;
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
  onUpdateItem,
  onRemoveItem,
  onAddItem,
  draggableProps,
  dragHandleProps,
  innerRef,
  isDragging,
  previewDisabled = false,
}) => {
  const [editingItemIds, setEditingItemIds] = useState<Record<string, boolean>>({});
  const [isSceneEditorOpen, setIsSceneEditorOpen] = useState(false);
  const [sceneEditorText, setSceneEditorText] = useState('');
  const [sceneEditorBackup, setSceneEditorBackup] = useState('');
  const [isFormatErrorOpen, setIsFormatErrorOpen] = useState(false);
  const [formatErrorMessage, setFormatErrorMessage] = useState('');

  const toggleItemEdit = (itemId: string) => {
    setEditingItemIds(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const openSceneEditor = () => {
    const snapshot = JSON.stringify(scene, null, 2);
    setSceneEditorText(snapshot);
    setSceneEditorBackup(snapshot);
    setIsSceneEditorOpen(true);
  };

  const validateSceneJson = (raw: unknown): string | null => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return '场景数据必须是 JSON 对象';
    const candidate = raw as any;
    if (typeof candidate.id !== 'string' || !candidate.id.trim()) return 'scene.id 必须是非空字符串';
    if (candidate.type !== 'post' && candidate.type !== 'comments') return 'scene.type 只能是 post 或 comments';
    if (candidate.title !== undefined && typeof candidate.title !== 'string') return 'scene.title 必须是字符串';
    if (typeof candidate.duration !== 'number' || !Number.isFinite(candidate.duration) || candidate.duration <= 0) {
      return 'scene.duration 必须是大于 0 的数字';
    }
    if (!Array.isArray(candidate.items) || candidate.items.length === 0) return 'scene.items 必须是非空数组';
    for (let i = 0; i < candidate.items.length; i += 1) {
      const item = candidate.items[i];
      if (!item || typeof item !== 'object' || Array.isArray(item)) return `items[${i}] 必须是对象`;
      if (typeof item.id !== 'string' || !item.id.trim()) return `items[${i}].id 必须是非空字符串`;
      if (typeof item.author !== 'string' || !item.author.trim()) return `items[${i}].author 必须是非空字符串`;
      if (typeof item.content !== 'string') return `items[${i}].content 必须是字符串`;
      if (item.image !== undefined && typeof item.image !== 'string') return `items[${i}].image 必须是字符串`;
      if (item.replyChain !== undefined) {
        if (!Array.isArray(item.replyChain)) return `items[${i}].replyChain 必须是数组`;
        for (let j = 0; j < item.replyChain.length; j += 1) {
          const reply = item.replyChain[j];
          if (!reply || typeof reply !== 'object' || Array.isArray(reply)) return `items[${i}].replyChain[${j}] 必须是对象`;
          if (typeof reply.author !== 'string' || typeof reply.content !== 'string') {
            return `items[${i}].replyChain[${j}] 需要 author/content 字符串`;
          }
        }
      }
    }
    return null;
  };

  const applySceneEditor = () => {
    try {
      const parsed = JSON.parse(sceneEditorText);
      const validationError = validateSceneJson(parsed);
      if (validationError) {
        setFormatErrorMessage(validationError);
        setIsFormatErrorOpen(true);
        return;
      }
      const result = onReplaceScene(parsed as VideoScene);
      if (!result.ok) {
        setFormatErrorMessage(result.message || '场景数据应用失败');
        setIsFormatErrorOpen(true);
        return;
      }
      setIsSceneEditorOpen(false);
      message.success(result.message || '场景数据已应用');
    } catch (err) {
      setFormatErrorMessage(`JSON 解析失败：${err instanceof Error ? err.message : String(err)}`);
      setIsFormatErrorOpen(true);
    }
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
        title={
          <Space size="large">
            <div {...dragHandleProps}><HolderOutlined style={{ color: '#bfbfbf' }} /></div>
            <Tag color={scene.type === 'post' ? 'orange' : 'blue'}>
              {scene.type === 'post' ? '画面格: 原贴' : '画面格: 评论'}
            </Tag>
            {isExpanded ? (
              <Input 
                size="small" 
                value={scene.title} 
                onChange={(e) => onUpdateScene({ title: e.target.value })} 
                style={{ width: 200 }}
                placeholder="画面名称"
              />
            ) : (
              <div onClick={onToggleExpand} style={{ cursor: 'pointer' }}>
                <Text strong style={{ color: '#555' }}>{scene.title || (scene.type === 'post' ? '主贴' : '评论组')}</Text>
              </div>
            )}
            <Text type="secondary" style={{ fontSize: '12px' }}>({scene.items.length} 个项)</Text>
          </Space>
        }
        extra={
          <Space size="middle">
            <Space><Text type="secondary">时长</Text>
              <InputNumber size="small" min={1} value={scene.duration} onChange={(val) => onUpdateScene({ duration: val || 3 })} addonAfter="s" style={{ width: 80 }} />
            </Space>
            <Divider type="vertical" />
            <Button size="small" icon={<EditOutlined />} onClick={openSceneEditor}>编辑场景内容</Button>
            <Button size="small" icon={<EyeOutlined />} onClick={onPreviewScene} disabled={previewDisabled}>预览</Button>
            <Button size="small" danger icon={<DeleteOutlined />} onClick={onRemoveScene} />
          </Space>
        }
      >
        <Droppable droppableId={scene.id} type="item">
          {(itemProvided, itemSnapshot) => (
            <div 
              {...itemProvided.droppableProps} 
              ref={itemProvided.innerRef}
              style={{
                padding: '4px 8px',
                minHeight: isExpanded ? '50px' : '0px',
                background: itemSnapshot.isDraggingOver ? '#f0f5ff' : 'transparent',
                borderRadius: 8
              }}
            >
              {scene.items.map((item, itemIdx) => (
                <Draggable key={item.id} draggableId={item.id} index={itemIdx}>
                  {(itemDProvided, itemDSnapshot) => (
                    <div ref={itemDProvided.innerRef} {...itemDProvided.draggableProps} style={{ ...itemDProvided.draggableProps.style, marginBottom: 12 }}>
                      <Card 
                        size="small" 
                        style={{ 
                          background: itemDSnapshot.isDragging ? '#e6f7ff' : '#f8f9fa',
                          border: itemDSnapshot.isDragging ? '1px solid #1890ff' : '1px dashed #d9d9d9'
                        }}
                        title={<div {...itemDProvided.dragHandleProps}><HolderOutlined style={{ color: '#bfbfbf' }} /></div>}
                        extra={
                          <Space>
                            <Button 
                              size="small" 
                              type={editingItemIds[item.id] ? "primary" : "default"}
                              icon={editingItemIds[item.id] ? <CheckOutlined /> : <EditOutlined />} 
                              onClick={() => toggleItemEdit(item.id)}
                            >
                              {editingItemIds[item.id] ? "确认" : "编辑内容"}
                            </Button>
                            <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => onRemoveItem(item.id)} />
                          </Space>
                        }
                      >
                        {editingItemIds[item.id] ? (
                          <Row gutter={16}>
                            <Col span={24}>
                              <div style={{ marginBottom: 8 }}>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                  支持 [quote=作者]内容[/quote]、[image w=300 h=200 mode=contain]URL[/image] (支持 w, h, s/scale, mode 属性) 和 [style] 标签
                                </Text>
                              </div>
                              <TextArea 
                                rows={8} 
                                value={item.content} 
                                onChange={(e) => onUpdateItem(item.id, { content: e.target.value })} 
                                placeholder="输入内容..." 
                                style={{ marginBottom: 8, fontFamily: 'monospace' }} 
                              />
                            </Col>
                            <Col span={24}>
                              <Input size="small" placeholder="快捷添加图片 URL" onChange={(e) => {
                                if (e.target.value) {
                                  onUpdateItem(item.id, { content: item.content + `\n[image]${e.target.value}[/image]` });
                                  e.target.value = '';
                                }
                              }} />
                            </Col>
                          </Row>
                        ) : (
                          <div style={{ padding: '8px 4px' }}>
                            <ScriptContentRenderer content={item.content} author={item.author} />
                          </div>
                        )}
                      </Card>
                    </div>
                  )}
                </Draggable>
              ))}
              {itemProvided.placeholder}
              {isExpanded && <Button block type="dashed" icon={<PlusOutlined />} onClick={onAddItem} style={{ marginTop: 8 }}>在此画面下新增内容项</Button>}
            </div>
          )}
        </Droppable>
      </Card>

      <Modal
        title="编辑场景 JSON"
        open={isSceneEditorOpen}
        onCancel={() => setIsSceneEditorOpen(false)}
        onOk={applySceneEditor}
        okText="应用修改"
        cancelText="取消"
        width={860}
      >
        <Text type="secondary">
          你可以直接编辑完整场景对象（包含 id / type / title / duration / items）。
        </Text>
        <TextArea
          value={sceneEditorText}
          onChange={(e) => setSceneEditorText(e.target.value)}
          rows={20}
          style={{ marginTop: 12, fontFamily: 'monospace' }}
        />
      </Modal>

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
              message.info('已回退到打开弹窗时的数据快照');
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
