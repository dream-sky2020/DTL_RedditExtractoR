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
import { parseQuotes } from '../utils/quoteParser';

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
  onUpdateItem: (itemId: string, updates: Partial<VideoContentItem>) => void;
  onRemoveItem: (itemId: string) => void;
  onAddItem: () => void;
  // 以下是 dnd 相关
  draggableProps?: any;
  dragHandleProps?: any;
  innerRef?: (element: HTMLElement | null) => void;
  isDragging?: boolean;
}

export const SceneCard: React.FC<SceneCardProps> = ({
  scene,
  index,
  isExpanded,
  onToggleExpand,
  onUpdateScene,
  onRemoveScene,
  onPreviewScene,
  onUpdateItem,
  onRemoveItem,
  onAddItem,
  draggableProps,
  dragHandleProps,
  innerRef,
  isDragging,
}) => {
  const [editingItemIds, setEditingItemIds] = useState<Record<string, boolean>>({});

  const toggleItemEdit = (itemId: string) => {
    setEditingItemIds(prev => ({ ...prev, [itemId]: !prev[itemId] }));
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
            <Button size="small" icon={<EyeOutlined />} onClick={onPreviewScene}>预览</Button>
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
                        title={
                          <Space>
                            <div {...itemDProvided.dragHandleProps}><HolderOutlined style={{ color: '#bfbfbf' }} /></div>
                            <Tag icon={<EditOutlined />}>项 #{itemIdx + 1}</Tag>
                            <Input size="small" value={item.author} onChange={(e) => onUpdateItem(item.id, { author: e.target.value })} placeholder="作者" prefix="u/" style={{ width: 140 }} />
                          </Space>
                        }
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
                              <div style={{ marginBottom: 8 }}><Text type="secondary" style={{ fontSize: '12px' }}>支持 [quote=作者]内容[/quote] 和 [image]URL[/image] 标签</Text></div>
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
                            {parseQuotes(item.content)}
                            {!item.content && <Text type="secondary" italic>(无内容)</Text>}
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
    </div>
  );
};
