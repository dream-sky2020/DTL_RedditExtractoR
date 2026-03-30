import React, { useState } from 'react';
import { Card, Row, Col, Typography, Button, Space, Divider, Alert, Empty } from 'antd';
import { ArrowLeftOutlined, ToolOutlined, BugOutlined } from '@ant-design/icons';
import { VideoScene, VideoContentItem } from '../types';
import { SceneCard } from '../components/SceneCard';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';

const { Title, Text } = Typography;

interface FrameTestPageProps {
  onBack: () => void;
}

export const FrameTestPage: React.FC<FrameTestPageProps> = ({ onBack }) => {
  // 测试用的画面格数据
  const [scene, setScene] = useState<VideoScene>({
    id: 'test-scene-id',
    type: 'comments',
    title: '测试评论画面格',
    duration: 5,
    items: [
      {
        id: 'item-1',
        author: 'RedditUser_01',
        content: '这是第一条评论内容，用于测试卡片在折叠和展开状态下的显示效果。',
        replyChain: [
          { author: 'OriginalPoster', content: '这是原贴的内容预览' }
        ]
      },
      {
        id: 'item-2',
        author: 'RedditUser_02',
        content: '这是第二条带图片的评论。',
        image: 'https://preview.redd.it/6z0q4p3n8xea1.jpg?width=640&crop=smart&auto=webp&v=enabled&s=7e5f0d3a7e5f0d3a7e5f0d3a'
      }
    ]
  });

  const [isExpanded, setIsExpanded] = useState(true);

  const updateScene = (updates: Partial<VideoScene>) => {
    setScene(prev => ({ ...prev, ...updates }));
  };

  const updateItem = (itemId: string, updates: Partial<VideoContentItem>) => {
    setScene(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === itemId ? { ...item, ...updates } : item)
    }));
  };

  const removeItem = (itemId: string) => {
    setScene(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  const addItem = () => {
    setScene(prev => ({
      ...prev,
      items: [...prev.items, {
        id: 'item-' + Date.now(),
        author: 'NewUser',
        content: '新内容...',
      }]
    }));
  };

  return (
    <div className="frame-test-page" style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space size="middle">
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>返回编辑器</Button>
          <Title level={3} style={{ margin: 0 }}>画面格卡片 (SceneCard) 独立测试</Title>
        </Space>
        <Alert message="此页面仅用于开发调试：测试 SceneCard 组件的 UI 交互与样式" type="info" showIcon />
      </div>

      <Row gutter={24}>
        {/* 左侧：组件展示区 */}
        <Col span={14}>
          <div style={{ background: '#fff', padding: '32px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary"><BugOutlined /> 组件预览区域</Text>
            </div>
            
            <DragDropContext onDragEnd={() => {}}>
              <Droppable droppableId="test-list" type="scene">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef}>
                    <SceneCard
                      scene={scene}
                      index={0}
                      isExpanded={isExpanded}
                      onToggleExpand={() => setIsExpanded(!isExpanded)}
                      onUpdateScene={updateScene}
                      onRemoveScene={() => alert('触发删除画面格回调')}
                      onPreviewScene={() => alert('触发预览画面格回调')}
                      onUpdateItem={updateItem}
                      onRemoveItem={removeItem}
                      onAddItem={addItem}
                    />
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
            
            {scene.items.length === 0 && <Empty description="画面格内暂无内容项" />}
          </div>
        </Col>

        {/* 右侧：状态控制与数据监控 */}
        <Col span={10}>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Card title={<span><ToolOutlined /> 快速控制</span>} bordered={false}>
              <Space wrap>
                <Button 
                  type={scene.type === 'post' ? 'primary' : 'default'}
                  onClick={() => updateScene({ type: 'post', title: '切换为原贴模式' })}
                >
                  设为原贴模式
                </Button>
                <Button 
                  type={scene.type === 'comments' ? 'primary' : 'default'}
                  onClick={() => updateScene({ type: 'comments', title: '切换为评论模式' })}
                >
                  设为评论模式
                </Button>
                <Divider type="vertical" />
                <Button onClick={() => setIsExpanded(!isExpanded)}>
                  {isExpanded ? '强制收起卡片' : '强制展开卡片'}
                </Button>
              </Space>
            </Card>

            <Card title="当前画面格数据 (State)" bordered={false}>
              <div style={{ background: '#001529', color: '#a6adb4', padding: '16px', borderRadius: '8px', maxHeight: '500px', overflow: 'auto' }}>
                <pre style={{ margin: 0, fontSize: '12px' }}>
                  {JSON.stringify(scene, null, 2)}
                </pre>
              </div>
            </Card>
          </Space>
        </Col>
      </Row>
    </div>
  );
};
