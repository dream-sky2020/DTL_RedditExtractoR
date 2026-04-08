import React, { useState } from 'react';
import {
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
import { VideoConfig, VideoScene } from '../types';
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
  const DEFAULT_SIDEBAR_WIDTH = 420;
  const SIDEBAR_MIN_WIDTH = 300;
  const SIDEBAR_MAX_WIDTH = 760;
  const FIXED_SIDEBAR_TOP_OFFSET = 64;
  const clampSidebarWidth = (nextWidth: number): number => {
    const viewportMax =
      typeof window === 'undefined' ? SIDEBAR_MAX_WIDTH : Math.floor(window.innerWidth * 0.72);
    const maxAllowed = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, viewportMax));
    return Math.min(maxAllowed, Math.max(SIDEBAR_MIN_WIDTH, Math.round(nextWidth)));
  };

  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isSidebarResizing, setIsSidebarResizing] = useState(false);
  const sidebarResizeRef = React.useRef<{ startX: number; startWidth: number } | null>(null);
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

  React.useEffect(() => {
    if (!isSidebarResizing) return;

    const handleMouseMove = (event: MouseEvent) => {
      const resizeSnapshot = sidebarResizeRef.current;
      if (!resizeSnapshot) return;
      const deltaX = resizeSnapshot.startX - event.clientX;
      const nextWidth = clampSidebarWidth(resizeSnapshot.startWidth + deltaX);
      setSidebarWidth(nextWidth);
    };

    const handleMouseUp = () => {
      setIsSidebarResizing(false);
      sidebarResizeRef.current = null;
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isSidebarResizing]);

  const startSidebarResize = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    sidebarResizeRef.current = {
      startX: event.clientX,
      startWidth: sidebarWidth,
    };
    setIsSidebarResizing(true);
  };

  const updateSidebarWidthByInput = (value: number | null) => {
    if (value == null || Number.isNaN(value)) return;
    setSidebarWidth(clampSidebarWidth(value));
  };

  const resetSidebarWidthToDefault = () => {
    Modal.confirm({
      title: '还原右侧面板宽度',
      content: `确认将右侧面板宽度还原为默认值 ${DEFAULT_SIDEBAR_WIDTH}px 吗？`,
      okText: '确认还原',
      cancelText: '取消',
      onOk: () => {
        setSidebarWidth(clampSidebarWidth(DEFAULT_SIDEBAR_WIDTH));
        message.success('右侧面板宽度已还原为默认值');
      },
    });
  };

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

  const removeScene = (id: string) => {
    const newScenes = draftConfig.scenes.filter(s => s.id !== id);
    setDraftConfig({ ...draftConfig, scenes: newScenes });
  };

  const setAllSceneLayouts = (layout: 'top' | 'center') => {
    const newScenes = draftConfig.scenes.map((s) => ({ ...s, layout }));
    setDraftConfig({ ...draftConfig, scenes: newScenes });
    message.success(`已将全部画面格布局设为 ${layout}`);
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
      layout: 'top',
      duration: 5,
      items: [{
        id: 'item-' + Date.now(),
        author: 'NewUser',
        content: '',
      }]
    };
    setDraftConfig({ ...draftConfig, scenes: [...draftConfig.scenes, newScene] });
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
    <div className="editor-page-container" style={{ position: 'relative' }}>
      <div style={{ paddingRight: sidebarWidth + 24 }}>
        <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Space align="center">
            <Typography.Title level={4} style={{ marginBottom: 0 }}>视频画面格流</Typography.Title>
          </Space>
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
      </div>

      <div
        style={{
          position: 'fixed',
          right: 0,
          top: FIXED_SIDEBAR_TOP_OFFSET,
          bottom: 0,
          width: sidebarWidth,
          overflowY: 'auto',
          zIndex: 20,
          borderLeft: '1px solid var(--brand-border)',
          background: 'var(--brand-dark)',
        }}
      >
        <div
          role="separator"
          aria-label="调整右侧面板宽度"
          onMouseDown={startSidebarResize}
          style={{
            position: 'absolute',
            left: -4,
            top: 0,
            bottom: 0,
            width: 8,
            cursor: 'col-resize',
            zIndex: 21,
            background: isSidebarResizing ? 'rgba(24,144,255,0.22)' : 'transparent',
          }}
        />
        <div
          style={{
            borderRadius: 0,
            border: 'none',
            background: 'transparent',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--brand-border)',
              background: 'var(--brand-dark)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Space size="small">
              <EditOutlined style={{ color: 'var(--text-primary)' }} />
              <Text strong style={{ color: 'var(--text-primary)' }}>右侧操作面板</Text>
            </Space>
            <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{toolDesc}</Text>
          </div>

          <div style={{ padding: 16 }}>
                <div
                  style={{
                    marginBottom: 16,
                    padding: 12,
                    borderRadius: 8,
                    border: '1px solid var(--brand-border)',
                    background: 'var(--panel-bg-translucent)',
                  }}
                >
                  <Text strong style={{ color: 'var(--text-primary)' }}>侧栏宽度</Text>
                  <Space style={{ marginTop: 8 }} wrap>
                    <InputNumber
                      min={SIDEBAR_MIN_WIDTH}
                      max={SIDEBAR_MAX_WIDTH}
                      value={sidebarWidth}
                      onChange={updateSidebarWidthByInput}
                      addonAfter="px"
                      style={{ width: 120, color: 'var(--text-primary)', background: 'var(--input-bg)' }}
                    />
                    <Button onClick={resetSidebarWidthToDefault} size="small" style={{ color: 'var(--text-light-blue)', borderColor: 'var(--btn-primary-border)', background: 'transparent' }}>还原默认</Button>
                  </Space>
                </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text strong style={{ color: 'var(--text-primary)' }}>整体配置</Text>
              <Button
                size="small"
                type="text"
                onClick={() => setIsConfigCollapsed((prev) => !prev)}
                icon={isConfigCollapsed ? <DownOutlined style={{ color: 'var(--text-primary)' }} /> : <UpOutlined style={{ color: 'var(--text-primary)' }} />}
                style={{ color: 'var(--text-primary)' }}
              >
                {isConfigCollapsed ? '展开' : '收起'}
              </Button>
            </div>
            {!isConfigCollapsed && (
              <div style={{ 
                padding: 12, 
                borderRadius: 8, 
                background: 'var(--panel-bg-darker)', 
                border: '1px solid var(--brand-border)',
                marginBottom: 16 
              }}>
                <Form layout="vertical" variant="filled">
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item label={<Text style={{ color: 'var(--text-secondary)' }}>视频标题</Text>}>
                        <Input
                          value={draftConfig.title}
                          onChange={(e) => setDraftConfig({ ...draftConfig, title: e.target.value })}
                          style={{ color: 'var(--text-primary)', background: 'var(--input-bg)' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item label={<Text style={{ color: 'var(--text-secondary)' }}>Subreddit (r/)</Text>}>
                        <Input
                          value={draftConfig.subreddit}
                          onChange={(e) => setDraftConfig({ ...draftConfig, subreddit: e.target.value })}
                          style={{ color: 'var(--text-primary)', background: 'var(--input-bg)' }}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item label={<Text style={{ color: 'var(--text-secondary)' }}>评论排序方式</Text>}>
                        <Select<CommentSortMode>
                          value={editorSortMode}
                          onChange={setEditorSortMode}
                          style={{ width: '100%' }}
                          dropdownStyle={{ background: 'var(--brand-border)' }}
                          className="custom-blue-select"
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
                    <Col span={24}>
                      <Form.Item label={<Text style={{ color: 'var(--text-secondary)' }}>回复关系策略</Text>}>
                        <Select<ReplyOrderMode>
                          value={editorReplyOrderMode}
                          onChange={setEditorReplyOrderMode}
                          style={{ width: '100%' }}
                          dropdownStyle={{ background: 'var(--brand-border)' }}
                          className="custom-blue-select"
                          options={[
                            { label: '保持回复关系（默认）', value: 'preserve' },
                            { label: '全量排序（不考虑回复关系）', value: 'global' },
                          ]}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Space direction="vertical" style={{ width: '100%' }} size="small">
                        <Button
                          type="primary"
                          block
                          disabled={!canApplyCommentSort}
                          onClick={() => onApplyCommentSort(editorSortMode, editorReplyOrderMode)}
                          style={{ background: 'var(--btn-primary-bg)', borderColor: 'var(--btn-primary-border)' }}
                        >
                          应用排序与代号并重建脚本
                        </Button>
                        <Row gutter={8}>
                          <Col span={12}>
                            <Button
                              block
                              disabled={!canApplyCommentSort || allAuthors.length === 0}
                              onClick={() => onRandomizeAliasesAndApply(editorSortMode, editorReplyOrderMode)}
                              style={{ color: 'var(--text-light-blue)', borderColor: 'var(--btn-primary-border)', background: 'transparent' }}
                            >
                              随机代号
                            </Button>
                          </Col>
                          <Col span={12}>
                            <Button
                              block
                              disabled={!canApplyCommentSort || allAuthors.length === 0}
                              onClick={() => onClearAliasesAndApply(editorSortMode, editorReplyOrderMode)}
                              style={{ color: 'var(--text-light-blue)', borderColor: 'var(--btn-primary-border)', background: 'transparent' }}
                            >
                              清空代号
                            </Button>
                          </Col>
                        </Row>
                      </Space>
                    </Col>
                  </Row>
                </Form>
              </div>
            )}

            <Divider style={{ margin: '16px 0', borderColor: 'var(--brand-border)' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text strong style={{ color: 'var(--text-primary)' }}>用户隐私与身份映射</Text>
              <Button
                size="small"
                type="text"
                onClick={() => setIsPrivacyCollapsed((prev) => !prev)}
                icon={isPrivacyCollapsed ? <DownOutlined style={{ color: 'var(--text-primary)' }} /> : <UpOutlined style={{ color: 'var(--text-primary)' }} />}
                style={{ color: 'var(--text-primary)' }}
              >
                {isPrivacyCollapsed ? '展开' : '收起'}
              </Button>
            </div>
            {!isPrivacyCollapsed && (
              <div style={{ 
                padding: 12, 
                borderRadius: 8, 
                background: 'var(--panel-bg-darker)', 
                border: '1px solid var(--brand-border)' 
              }}>
                <Typography.Paragraph style={{ marginBottom: 16, color: 'var(--text-muted)', fontSize: 12 }}>
                  扫描到的所有发言用户会显示在这里。你可以为每个用户设置代号和颜色。
                </Typography.Paragraph>
                
                <div style={{ marginBottom: 16 }}>
                  <Text style={{ color: 'var(--text-secondary)', fontSize: 12, display: 'block', marginBottom: 8 }}>颜色生成规则</Text>
                  <Row gutter={[8, 8]}>
                    <Col span={12}>
                      <Select<ColorArrangementMode>
                        size="small"
                        value={editorColorArrangement.mode}
                        onChange={(mode) => setEditorColorArrangement((prev) => ({ ...prev, mode }))}
                        dropdownStyle={{ background: 'var(--brand-border)' }}
                        className="custom-blue-select"
                        options={[
                          { label: '均匀分布', value: 'uniform' },
                          { label: '随机打散', value: 'randomized' },
                        ]}
                        style={{ width: '100%' }}
                      />
                    </Col>
                    <Col span={6}>
                      <InputNumber
                        size="small"
                        min={0}
                        max={359}
                        value={editorColorArrangement.hueOffset}
                        onChange={(value) => setEditorColorArrangement((prev) => ({ ...prev, hueOffset: Number(value ?? 0) }))}
                        placeholder="色相"
                        style={{ width: '100%', color: 'var(--text-primary)', background: 'var(--input-bg)' }}
                      />
                    </Col>
                    <Col span={6}>
                      <InputNumber
                        size="small"
                        min={1}
                        max={359}
                        value={editorColorArrangement.hueStep}
                        onChange={(value) => setEditorColorArrangement((prev) => ({ ...prev, hueStep: Number(value ?? 1) }))}
                        placeholder="步进"
                        style={{ width: '100%', color: 'var(--text-primary)', background: 'var(--input-bg)' }}
                      />
                    </Col>
                  </Row>
                  <Button 
                    size="small" 
                    block 
                    style={{ marginTop: 8, color: 'var(--text-light-blue)', borderColor: 'var(--btn-primary-border)', background: 'transparent' }}
                    onClick={() => onRearrangeColorsAndApply(editorSortMode, editorReplyOrderMode, editorColorArrangement)}
                  >
                    重排颜色
                  </Button>
                </div>

                <Table<AuthorIdentityRow>
                  rowKey={(record) => record.author}
                  size="small"
                  pagination={{ pageSize: 10, size: 'small' }}
                  dataSource={allAuthors.map((author) => ({
                    author,
                    alias: authorProfiles[author]?.alias || '',
                    color: authorProfiles[author]?.color || '#1890ff',
                  }))}
                  style={{ 
                    background: 'transparent',
                    marginTop: 12
                  }}
                  columns={[
                    {
                      title: <Text style={{ color: 'var(--text-muted)', fontSize: 12 }}>原用户名</Text>,
                      dataIndex: 'author',
                      key: 'author',
                      render: (value: string) => <Text style={{ color: 'var(--text-primary)', fontSize: 12 }}>u/{value}</Text>,
                    },
                    {
                      title: <Text style={{ color: 'var(--text-muted)', fontSize: 12 }}>代号/颜色</Text>,
                      dataIndex: 'alias',
                      key: 'alias',
                      width: 150,
                      render: (_: string, record: AuthorIdentityRow) => (
                        <Space size={4}>
                          <Input
                            size="small"
                            value={record.alias}
                            placeholder="代号"
                            onChange={(e) => onUpdateAuthorProfile(record.author, { alias: e.target.value })}
                            style={{ width: 80 }}
                          />
                          <Input
                            size="small"
                            type="color"
                            value={record.color}
                            onChange={(e) => onUpdateAuthorProfile(record.author, { color: e.target.value })}
                            style={{ width: 32, padding: 0, border: 'none', height: 24 }}
                          />
                        </Space>
                      ),
                    },
                  ]}
                />
              </div>
            )}

            <Divider style={{ margin: '16px 0', borderColor: 'var(--brand-border)' }} />

            <div style={{ marginBottom: 8 }}>
              <Text strong style={{ color: 'var(--text-primary)' }}>画面流快捷操作</Text>
            </div>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button.Group size="small" style={{ width: '100%' }}>
                <Button style={{ flex: 1, color: 'var(--text-light-blue)', borderColor: 'var(--btn-primary-border)', background: 'transparent' }} onClick={() => setAllSceneLayouts('top')}>全部 Top</Button>
                <Button style={{ flex: 1, color: 'var(--text-light-blue)', borderColor: 'var(--btn-primary-border)', background: 'transparent' }} onClick={() => setAllSceneLayouts('center')}>全部 Center</Button>
              </Button.Group>
              <Button type="primary" block icon={<PlusOutlined />} onClick={addScene} style={{ background: 'var(--btn-primary-bg)', borderColor: 'var(--btn-primary-border)' }}>
                新增画面格
              </Button>
            </Space>
          </div>
        </div>
      </div>

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
