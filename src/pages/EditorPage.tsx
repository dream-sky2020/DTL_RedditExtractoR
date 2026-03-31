import React, { useState } from 'react';
import {
  Card,
  Input,
  Form,
  Space,
  Button,
  Row,
  Col,
  Typography,
  Divider,
  Modal,
  message,
  Pagination,
} from 'antd';
import {
  EditOutlined,
  VideoCameraOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { VideoConfig, VideoScene, VideoContentItem } from '../types';
import { Player } from '@remotion/player';
import { MyVideo } from '../remotion/MyVideo';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { SceneCard } from '../components/SceneCard';

const { Text } = Typography;

interface EditorPageProps {
  draftConfig: VideoConfig;
  setDraftConfig: (config: VideoConfig) => void;
  onApply: () => void;
  onBack: () => void;
  toolDesc: string;
}

export const EditorPage: React.FC<EditorPageProps> = ({
  draftConfig,
  setDraftConfig,
  onApply,
  onBack,
  toolDesc,
}) => {
  const [expandedSceneIds, setExpandedSceneIds] = useState<Record<string, boolean>>({});
  const [previewSceneId, setPreviewSceneId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 计算当前分页的数据
  const pagedScenes = draftConfig.scenes.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSceneExpand = (id: string) => {
    setExpandedSceneIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const updateScene = (sceneId: string, updates: Partial<VideoScene>) => {
    const newScenes = draftConfig.scenes.map(s => 
      s.id === sceneId ? { ...s, ...updates } : s
    );
    setDraftConfig({ ...draftConfig, scenes: newScenes });
  };

  const updateItem = (sceneId: string, itemId: string, updates: Partial<VideoContentItem>) => {
    const newScenes = draftConfig.scenes.map(s => {
      if (s.id === sceneId) {
        return {
          ...s,
          items: s.items.map(item => item.id === itemId ? { ...item, ...updates } : item)
        };
      }
      return s;
    });
    setDraftConfig({ ...draftConfig, scenes: newScenes });
  };

  const removeScene = (id: string) => {
    const newScenes = draftConfig.scenes.filter(s => s.id !== id);
    setDraftConfig({ ...draftConfig, scenes: newScenes });
  };

  const removeItem = (sceneId: string, itemId: string) => {
    const newScenes = draftConfig.scenes.map(s => {
      if (s.id === sceneId) {
        return { ...s, items: s.items.filter(item => item.id !== itemId) };
      }
      return s;
    }).filter(s => s.items.length > 0);
    setDraftConfig({ ...draftConfig, scenes: newScenes });
  };

  const moveScene = (index: number, direction: 'up' | 'down') => {
    const newScenes = [...draftConfig.scenes];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newScenes.length) {
      [newScenes[index], newScenes[targetIndex]] = [newScenes[targetIndex], newScenes[index]];
      setDraftConfig({ ...draftConfig, scenes: newScenes });
    }
  };

  const addScene = () => {
    const newScene: VideoScene = {
      id: 'scene-' + Date.now(),
      type: 'comments',
      title: '新建画面格',
      duration: 5,
      items: [{
        id: 'item-' + Date.now(),
        author: 'NewUser',
        content: '',
      }]
    };
    setDraftConfig({ ...draftConfig, scenes: [...draftConfig.scenes, newScene] });
  };

  const addItemToScene = (sceneId: string) => {
    const newScenes = draftConfig.scenes.map(s => {
      if (s.id === sceneId) {
        return {
          ...s,
          items: [...s.items, {
            id: 'item-' + Date.now(),
            author: 'NewUser',
            content: '',
          }]
        };
      }
      return s;
    });
    setDraftConfig({ ...draftConfig, scenes: newScenes });
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination, combine, type } = result;

    if (combine && type === 'scene') {
      const sourceIndex = source.index;
      const destinationSceneId = combine.draggableId;
      const sourceScene = draftConfig.scenes[sourceIndex];
      const newScenes = draftConfig.scenes.filter((_, idx) => idx !== sourceIndex).map(s => {
        if (s.id === destinationSceneId) {
          return {
            ...s,
            items: [...s.items, ...sourceScene.items],
            duration: s.duration + sourceScene.duration
          };
        }
        return s;
      });
      setDraftConfig({ ...draftConfig, scenes: newScenes });
      message.success('已合并两个画面格');
      return;
    }

    if (!destination) return;

    if (type === 'scene') {
      const newScenes = [...draftConfig.scenes];
      const [moved] = newScenes.splice(source.index, 1);
      newScenes.splice(destination.index, 0, moved);
      setDraftConfig({ ...draftConfig, scenes: newScenes });
      return;
    }

    if (type === 'item') {
      const sourceSceneId = source.droppableId;
      const destSceneId = destination.droppableId;
      const newScenes = draftConfig.scenes.map(s => ({ ...s, items: [...s.items] }));
      const sourceScene = newScenes.find(s => s.id === sourceSceneId);
      const destScene = newScenes.find(s => s.id === destSceneId);
      if (!sourceScene || !destScene) return;
      const [movedItem] = sourceScene.items.splice(source.index, 1);
      destScene.items.splice(destination.index, 0, movedItem);
      const finalScenes = newScenes.filter(s => s.items.length > 0 || s.id === destSceneId);
      setDraftConfig({ ...draftConfig, scenes: finalScenes });
      if (sourceSceneId !== destSceneId) message.info('已将内容移动到新画面');
    }
  };

  return (
    <div className="editor-page-container">
      <Card
        title={<span><EditOutlined /> 整体配置</span>}
        className="panel-card"
        bordered={false}
        extra={<Text type="secondary">{toolDesc}</Text>}
      >
        <Form layout="vertical">
          <Row gutter={24}>
            <Col span={16}>
              <Form.Item label="视频标题">
                <Input
                  value={draftConfig.title}
                  onChange={(e) => setDraftConfig({ ...draftConfig, title: e.target.value })}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Subreddit (r/)">
                <Input
                  value={draftConfig.subreddit}
                  onChange={(e) => setDraftConfig({ ...draftConfig, subreddit: e.target.value })}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Space align="center">
            <Typography.Title level={4} style={{ marginBottom: 0 }}>视频画面格流</Typography.Title>
            <Button.Group size="small" style={{ marginLeft: 16 }}>
              <Button onClick={() => {
                const all = draftConfig.scenes.reduce((acc, s) => ({ ...acc, [s.id]: true }), {});
                setExpandedSceneIds(all);
              }}>全部展开</Button>
              <Button onClick={() => setExpandedSceneIds({})}>全部收起</Button>
            </Button.Group>
          </Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={addScene}>
            新增画面格
          </Button>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="scene-list" type="scene" isCombineEnabled>
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef}>
                {pagedScenes.map((scene, localIdx) => {
                  const globalIdx = (currentPage - 1) * pageSize + localIdx;
                  return (
                    <Draggable key={scene.id} draggableId={scene.id} index={globalIdx}>
                      {(draggableProvided, snapshot) => (
                        <SceneCard
                          scene={scene}
                          index={globalIdx}
                          isExpanded={expandedSceneIds[scene.id]}
                          onToggleExpand={() => toggleSceneExpand(scene.id)}
                          onUpdateScene={(updates) => updateScene(scene.id, updates)}
                          onRemoveScene={() => removeScene(scene.id)}
                          onPreviewScene={() => setPreviewSceneId(scene.id)}
                          onUpdateItem={(itemId, updates) => updateItem(scene.id, itemId, updates)}
                          onRemoveItem={(itemId) => removeItem(scene.id, itemId)}
                          onAddItem={() => addItemToScene(scene.id)}
                          innerRef={draggableProvided.innerRef}
                          draggableProps={draggableProvided.draggableProps}
                          dragHandleProps={draggableProvided.dragHandleProps}
                          isDragging={snapshot.isDragging}
                        />
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={draftConfig.scenes.length}
            onChange={(page, size) => {
              setCurrentPage(page);
              setPageSize(size || 10);
              // 切页后回到顶部，避免视觉断层
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            showSizeChanger
            pageSizeOptions={['10', '20', '50', '100']}
          />
        </div>
      </div>

      <Divider />
      <Space size="large" style={{ marginBottom: 40 }}>
        <Button type="primary" size="large" icon={<VideoCameraOutlined />} onClick={onApply}>保存并进入预览</Button>
        <Button size="large" onClick={onBack}>返回上一步</Button>
      </Space>

      <Modal
        title="单画面实时预览"
        open={!!previewSceneId}
        onCancel={() => setPreviewSceneId(null)}
        footer={null}
        width={800}
        styles={{ body: { padding: 0, background: '#000' } }}
        destroyOnClose
      >
        {previewSceneId && (
          <Player
            component={MyVideo as React.FC<any>}
            durationInFrames={(draftConfig.scenes.find(s => s.id === previewSceneId)?.duration || 5) * 30}
            compositionWidth={1280}
            compositionHeight={720}
            fps={30}
            style={{ width: '100%', aspectRatio: '16/9' }}
            inputProps={{ ...draftConfig, focusedSceneId: previewSceneId }}
            controls
            autoPlay
          />
        )}
      </Modal>
    </div>
  );
};
