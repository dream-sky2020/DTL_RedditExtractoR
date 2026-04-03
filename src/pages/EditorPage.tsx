import React, { useState } from 'react';
import {
  Card,
  Input,
  InputNumber,
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
  Select,
  Table,
} from 'antd';
import {
  EditOutlined,
  VideoCameraOutlined,
  PlusOutlined,
  DownOutlined,
  UpOutlined,
} from '@ant-design/icons';
import { VideoConfig, VideoScene, VideoContentItem } from '../types';
import { AuthorProfile, CommentSortMode, ReplyOrderMode } from '../utils/redditTransformer';
import { VideoPreviewPlayer, DEFAULT_PREVIEW_FPS } from '../components/VideoPreviewPlayer';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { SceneCard } from '../components/SceneCard';

const { Text } = Typography;

interface AuthorIdentityRow {
  author: string;
  alias: string;
  color: string;
}

type ColorArrangementMode = 'uniform' | 'randomized';
interface ColorArrangementSettings {
  mode: ColorArrangementMode;
  hueOffset: number;
  hueStep: number;
  saturation: number;
  lightness: number;
  seed: number;
}

interface EditorPageProps {
  draftConfig: VideoConfig;
  setDraftConfig: (config: VideoConfig) => void;
  commentSortMode: CommentSortMode;
  replyOrderMode: ReplyOrderMode;
  onApplyCommentSort: (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => void;
  onRandomizeAliasesAndApply: (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => void;
  onClearAliasesAndApply: (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => void;
  colorArrangement: ColorArrangementSettings;
  onRearrangeColorsAndApply: (
    sortMode: CommentSortMode,
    replyOrder: ReplyOrderMode,
    settings: ColorArrangementSettings,
  ) => void;
  canApplyCommentSort: boolean;
  allAuthors: string[];
  authorProfiles: Record<string, AuthorProfile>;
  onUpdateAuthorProfile: (author: string, updates: Partial<AuthorProfile>) => void;
  onApply: () => void;
  onBack: () => void;
  toolDesc: string;
}

export const EditorPage: React.FC<EditorPageProps> = ({
  draftConfig,
  setDraftConfig,
  commentSortMode,
  replyOrderMode,
  onApplyCommentSort,
  onRandomizeAliasesAndApply,
  onClearAliasesAndApply,
  colorArrangement,
  onRearrangeColorsAndApply,
  canApplyCommentSort,
  allAuthors,
  authorProfiles,
  onUpdateAuthorProfile,
  onApply,
  onBack,
  toolDesc,
}) => {
  const [expandedSceneIds, setExpandedSceneIds] = useState<Record<string, boolean>>({});
  const [previewSceneId, setPreviewSceneId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editorSortMode, setEditorSortMode] = useState<CommentSortMode>(commentSortMode);
  const [editorReplyOrderMode, setEditorReplyOrderMode] = useState<ReplyOrderMode>(replyOrderMode);
  const [editorColorArrangement, setEditorColorArrangement] = useState<ColorArrangementSettings>(colorArrangement);
  const [isConfigCollapsed, setIsConfigCollapsed] = useState(false);
  const [isPrivacyCollapsed, setIsPrivacyCollapsed] = useState(false);

  React.useEffect(() => {
    setEditorSortMode(commentSortMode);
  }, [commentSortMode]);

  React.useEffect(() => {
    setEditorReplyOrderMode(replyOrderMode);
  }, [replyOrderMode]);

  React.useEffect(() => {
    setEditorColorArrangement(colorArrangement);
  }, [colorArrangement]);

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

  const replaceScene = (sceneId: string, nextScene: VideoScene): { ok: boolean; message?: string } => {
    const duplicatedId = draftConfig.scenes.some((s) => s.id === nextScene.id && s.id !== sceneId);
    if (duplicatedId) {
      return { ok: false, message: `scene.id "${nextScene.id}" 已存在，请改成唯一值` };
    }
    const newScenes = draftConfig.scenes.map((s) => (s.id === sceneId ? nextScene : s));
    setDraftConfig({ ...draftConfig, scenes: newScenes });
    return { ok: true, message: '场景 JSON 已应用到画面格' };
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
        extra={
          <Space>
            <Text type="secondary">{toolDesc}</Text>
            <Button
              size="small"
              onClick={() => setIsConfigCollapsed((prev) => !prev)}
              icon={isConfigCollapsed ? <DownOutlined /> : <UpOutlined />}
            >
              {isConfigCollapsed ? '展开' : '收起'}
            </Button>
          </Space>
        }
      >
        {!isConfigCollapsed && (
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
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item label="评论排序方式">
                <Select<CommentSortMode>
                  value={editorSortMode}
                  onChange={setEditorSortMode}
                  options={[
                    { label: '最佳排序', value: 'best' },
                    { label: '点赞排序', value: 'top' },
                    { label: '时间排序（最新优先）', value: 'new' },
                    { label: '时间排序（最旧优先）', value: 'old' },
                    { label: '有争议排序', value: 'controversial' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="回复关系策略">
                <Select<ReplyOrderMode>
                  value={editorReplyOrderMode}
                  onChange={setEditorReplyOrderMode}
                  options={[
                    { label: '保持回复关系（默认）', value: 'preserve' },
                    { label: '全量排序（不考虑回复关系）', value: 'global' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label=" ">
                <Space wrap>
                  <Button
                    type="default"
                    disabled={!canApplyCommentSort}
                    onClick={() => onApplyCommentSort(editorSortMode, editorReplyOrderMode)}
                  >
                    应用排序与代号并重建脚本
                  </Button>
                  <Button
                    type="primary"
                    ghost
                    disabled={!canApplyCommentSort || allAuthors.length === 0}
                    onClick={() => onRandomizeAliasesAndApply(editorSortMode, editorReplyOrderMode)}
                  >
                    一键随机代号并应用
                  </Button>
                  <Button
                    danger
                    disabled={!canApplyCommentSort || allAuthors.length === 0}
                    onClick={() => onClearAliasesAndApply(editorSortMode, editorReplyOrderMode)}
                  >
                    一键清空代号
                  </Button>
                </Space>
              </Form.Item>
            </Col>
          </Row>
        </Form>
        )}
      </Card>

      <Card
        title="用户隐私与身份映射"
        className="panel-card"
        bordered={false}
        style={{ marginTop: 16 }}
        extra={
          <Button
            size="small"
            onClick={() => setIsPrivacyCollapsed((prev) => !prev)}
            icon={isPrivacyCollapsed ? <DownOutlined /> : <UpOutlined />}
          >
            {isPrivacyCollapsed ? '展开' : '收起'}
          </Button>
        }
      >
        {!isPrivacyCollapsed && (
        <>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          扫描到的所有发言用户会显示在这里。你可以为每个用户设置代号和颜色，点击“应用排序与代号并重建脚本”后生效。
        </Typography.Paragraph>
        <Row gutter={12} style={{ marginBottom: 12 }}>
          <Col xs={24} md={6}>
            <Form.Item label="颜色模式" style={{ marginBottom: 8 }}>
              <Select<ColorArrangementMode>
                value={editorColorArrangement.mode}
                onChange={(mode) => setEditorColorArrangement((prev) => ({ ...prev, mode }))}
                options={[
                  { label: '均匀分布', value: 'uniform' },
                  { label: '随机打散', value: 'randomized' },
                ]}
              />
            </Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item label="色相起点" style={{ marginBottom: 8 }}>
              <InputNumber
                min={0}
                max={359}
                value={editorColorArrangement.hueOffset}
                onChange={(value) => setEditorColorArrangement((prev) => ({ ...prev, hueOffset: Number(value ?? 0) }))}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item label="色相步进" style={{ marginBottom: 8 }}>
              <InputNumber
                min={1}
                max={359}
                value={editorColorArrangement.hueStep}
                onChange={(value) => setEditorColorArrangement((prev) => ({ ...prev, hueStep: Number(value ?? 1) }))}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item label="饱和度%" style={{ marginBottom: 8 }}>
              <InputNumber
                min={20}
                max={90}
                value={editorColorArrangement.saturation}
                onChange={(value) => setEditorColorArrangement((prev) => ({ ...prev, saturation: Number(value ?? 68) }))}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item label="亮度%" style={{ marginBottom: 8 }}>
              <InputNumber
                min={20}
                max={80}
                value={editorColorArrangement.lightness}
                onChange={(value) => setEditorColorArrangement((prev) => ({ ...prev, lightness: Number(value ?? 52) }))}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={2}>
            <Form.Item label="随机种子" style={{ marginBottom: 8 }}>
              <InputNumber
                min={1}
                max={99999999}
                value={editorColorArrangement.seed}
                onChange={(value) => setEditorColorArrangement((prev) => ({ ...prev, seed: Number(value ?? 1) }))}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>
        <Space style={{ marginBottom: 12 }}>
          <Button
            disabled={!canApplyCommentSort || allAuthors.length === 0}
            onClick={() => onRearrangeColorsAndApply(editorSortMode, editorReplyOrderMode, editorColorArrangement)}
          >
            按当前设置重排颜色并应用
          </Button>
        </Space>
        <Table<AuthorIdentityRow>
          rowKey={(record) => record.author}
          size="small"
          pagination={false}
          dataSource={allAuthors.map((author) => ({
            author,
            alias: authorProfiles[author]?.alias || '',
            color: authorProfiles[author]?.color || '#1890ff',
          }))}
          columns={[
            {
              title: '原用户名',
              dataIndex: 'author',
              key: 'author',
              width: 280,
              render: (value: string) => <Text code>u/{value}</Text>,
            },
            {
              title: '代号',
              dataIndex: 'alias',
              key: 'alias',
              render: (_: string, record: AuthorIdentityRow) => (
                <Input
                  value={record.alias}
                  placeholder="留空则使用原用户名"
                  onChange={(e) => onUpdateAuthorProfile(record.author, { alias: e.target.value })}
                />
              ),
            },
            {
              title: '颜色',
              dataIndex: 'color',
              key: 'color',
              width: 180,
              render: (_: string, record: AuthorIdentityRow) => (
                <Input
                  type="color"
                  value={record.color}
                  onChange={(e) => onUpdateAuthorProfile(record.author, { color: e.target.value })}
                  style={{ width: 80 }}
                />
              ),
            },
          ]}
        />
        </>
        )}
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
                          onReplaceScene={(nextScene) => replaceScene(scene.id, nextScene)}
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
          <VideoPreviewPlayer
            videoConfig={draftConfig}
            durationInFrames={(draftConfig.scenes.find(s => s.id === previewSceneId)?.duration || 5) * DEFAULT_PREVIEW_FPS}
            compositionWidth={1280}
            compositionHeight={720}
            fps={DEFAULT_PREVIEW_FPS}
            style={{ width: '100%', aspectRatio: '16/9' }}
            focusedSceneId={previewSceneId}
            controls
            autoPlay
          />
        )}
      </Modal>
    </div>
  );
};
