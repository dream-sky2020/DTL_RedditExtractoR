import React, { useState, useMemo } from 'react';
import { Card, Row, Col, Typography, Button, Space, Divider, Alert, Empty, InputNumber, message } from 'antd';
import { ArrowLeftOutlined, ToolOutlined, BugOutlined, VideoCameraOutlined, FileImageOutlined, CopyOutlined } from '@ant-design/icons';
import { VideoScene, VideoContentItem, VideoConfig } from '../types';
import { SceneCard } from '../components/SceneCard';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { VideoPreviewPlayer, DEFAULT_PREVIEW_FPS } from '../components/VideoPreviewPlayer';

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
  const [frameOffset, setFrameOffset] = useState(15);
  
  const previewConfig: VideoConfig = useMemo(() => ({
    title: '测试预览',
    subreddit: 'test',
    scenes: [scene],
  }), [scene]);

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

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(scene, null, 2));
      message.success('画面格 JSON 已复制到剪贴板');
    } catch (err) {
      console.error(err);
      message.error('复制失败');
    }
  };

  return (
    <div className="frame-test-page" style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space size="middle">
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>返回编辑器</Button>
          <Title level={3} style={{ margin: 0 }}>画面格增强测试终端</Title>
        </Space>
        <Alert message="实时联动预览已开启：左侧编辑，右侧即时生效" type="success" showIcon />
      </div>

      <Row gutter={24}>
        {/* 左侧：编辑区 */}
        <Col span={10}>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Card title={<span><BugOutlined /> 画面编辑卡片</span>} bordered={false}>
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
                        onPreviewScene={() => {}} // 已经在右侧实时预览，不再需要 Modal
                        onUpdateItem={updateItem}
                        onRemoveItem={removeItem}
                        onAddItem={addItem}
                        previewDisabled={true}
                      />
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
              {scene.items.length === 0 && <Empty description="画面格内暂无内容项" />}
            </Card>

            <Card 
              title={<span><ToolOutlined /> 调试控制台</span>} 
              bordered={false}
              extra={<Button size="small" icon={<CopyOutlined />} onClick={copyToClipboard}>复制 JSON</Button>}
            >
              <Space wrap>
                <Button 
                  type={scene.type === 'post' ? 'primary' : 'default'}
                  onClick={() => updateScene({ type: 'post', title: '原贴测试画面' })}
                >
                  设为原贴模式
                </Button>
                <Button 
                  type={scene.type === 'comments' ? 'primary' : 'default'}
                  onClick={() => updateScene({ type: 'comments', title: '评论测试画面' })}
                >
                  设为评论模式
                </Button>
                <Button onClick={() => setIsExpanded(!isExpanded)}>
                  {isExpanded ? '折叠编辑区' : '展开编辑区'}
                </Button>
              </Space>
              
              <Divider style={{ margin: '16px 0' }} />
              
              <div style={{ background: '#1e1e1e', color: '#d4d4d4', padding: '12px', borderRadius: '8px', maxHeight: '300px', overflow: 'auto' }}>
                <div style={{ marginBottom: 8, fontSize: '11px', color: '#888' }}>JSON 状态监控</div>
                <pre style={{ margin: 0, fontSize: '11px', fontFamily: 'monospace' }}>
                  {JSON.stringify(scene, null, 2)}
                </pre>
              </div>
            </Card>
          </Space>
        </Col>

        {/* 右侧：预览区 */}
        <Col span={14}>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* 动态预览 */}
            <Card 
              title={<span><VideoCameraOutlined /> 实时动画预览</span>} 
              bordered={false}
              styles={{ body: { padding: 0, background: '#000', overflow: 'hidden', borderRadius: '0 0 8px 8px' } }}
            >
              <VideoPreviewPlayer
                videoConfig={previewConfig}
                // 使用 Math.floor 确保数值稳定
                durationInFrames={Math.floor(scene.duration) * DEFAULT_PREVIEW_FPS}
                compositionWidth={1280}
                compositionHeight={720}
                fps={DEFAULT_PREVIEW_FPS}
                style={{ width: '100%', aspectRatio: '16/9' }}
                focusedSceneId={scene.id}
                controls
                autoPlay
                // 仅在 ID、类型或内容变化时刷新播放器，时长变化通过 InputProps 传递给 Remotion 而不是销毁播放器
                key={`video-${scene.id}-${scene.type}`}
              />
            </Card>

            {/* 静态预览 */}
            <Card 
              title={<span><FileImageOutlined /> 略缩图快照预览</span>} 
              bordered={false}
              extra={
                <Space>
                  <Text type="secondary" style={{ fontSize: '12px' }}>偏移</Text>
                  <InputNumber 
                    size="small" 
                    min={0} 
                    max={Math.floor(scene.duration) * DEFAULT_PREVIEW_FPS} 
                    value={frameOffset} 
                    onChange={(val) => setFrameOffset(Number(val) || 0)} 
                    style={{ width: 60 }}
                  />
                  <Text type="secondary" style={{ fontSize: '12px' }}>帧</Text>
                </Space>
              }
            >
              <div style={{ 
                background: '#000', 
                borderRadius: 8, 
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                position: 'relative'
              }}>
                <VideoPreviewPlayer
                  videoConfig={previewConfig}
                  durationInFrames={Math.floor(scene.duration) * DEFAULT_PREVIEW_FPS}
                  fps={DEFAULT_PREVIEW_FPS}
                  initialFrame={frameOffset}
                  style={{
                    width: '100%',
                    aspectRatio: '16 / 9',
                  }}
                  controls={false}
                  autoPlay={false}
                  focusedSceneId={scene.id}
                  // 静态预览需要根据偏移和内容变化刷新，但 key 应该更精准
                  key={`static-${scene.id}-${frameOffset}-${JSON.stringify(scene.items)}-${scene.type}`}
                />
                <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: '11px' }}>
                  Snapshot @ Frame {frameOffset}
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <Text type="secondary" italic style={{ fontSize: '12px' }}>
                  * 模拟 SlidePreviewPage 的渲染效果，通过调整“偏移帧”来检查不同时间点的画面渲染是否正确。
                </Text>
              </div>
            </Card>
          </Space>
        </Col>
      </Row>
    </div>
  );
};
