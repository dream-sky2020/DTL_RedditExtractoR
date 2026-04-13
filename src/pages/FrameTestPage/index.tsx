import React, { useState, useMemo } from 'react';
import { Card, Typography, Button, Space, Alert, InputNumber, message, Modal, Divider } from 'antd';
import {
  ArrowLeftOutlined,
  ToolOutlined,
  BugOutlined,
  VideoCameraOutlined,
  FileImageOutlined,
  CopyOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { VideoScene, VideoConfig } from '../../types';
import { SceneCard } from '../../components/SceneCard';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { VideoPreviewPlayer, DEFAULT_PREVIEW_FPS } from '../../components/VideoPreviewPlayer';

const { Title, Text } = Typography;

interface FrameTestPageProps {
  onBack: () => void;
}

export const FrameTestPage: React.FC<FrameTestPageProps> = ({ onBack }) => {
  const DEFAULT_SIDEBAR_WIDTH = 500;
  const SIDEBAR_MIN_WIDTH = 400;
  const SIDEBAR_MAX_WIDTH = 800;
  const FIXED_SIDEBAR_TOP_OFFSET = 64;

  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isSidebarResizing, setIsSidebarResizing] = useState(false);
  const sidebarResizeRef = React.useRef<{ startX: number; startWidth: number } | null>(null);

  // 预设示例数据
  const PRESET_EXAMPLES: Record<string, VideoScene> = {
    '基础样式': {
      id: 'style-demo',
      type: 'comments',
      title: '文本样式演示',
      duration: 5,
      items: [{
        id: 'item-style',
        author: 'StyleMaster',
        content: '[style align=center size=32 b color=#ff4500]居中大标题[/style]\n\n这是普通文本。[style color=#1890ff b]加粗蓝色[/style]，[style i u]斜体下划线[/style]。\n\n[style align=right color=#52c41a]右对齐绿色文本[/style]',
      }]
    },
    '引用嵌套': {
      id: 'quote-demo',
      type: 'comments',
      title: '多层引用演示',
      duration: 8,
      items: [{
        id: 'item-quote',
        author: 'QuoteCollector',
        content: '[quote=Alice]第一层引用\n[quote=Bob max=30]第二层引用（限长30字）\n[quote=Charlie]第三层引用[/quote]\n[/quote]\n[/quote]\n回复内容放在最下面。',
      }]
    },
    '两列并排': {
      id: 'row-2-demo',
      type: 'comments',
      title: '两列并排演示',
      duration: 5,
      items: [{
        id: 'item-row-2',
        author: 'LayoutExpert',
        content: '两列并排 (w=45%)：\n[row gap=12 justify=center]\n  [image w=45%]https://i.redd.it/vfxlybaze6tg1.jpeg[/image]\n  [image w=45%]https://i.redd.it/vfxlybaze6tg1.jpeg[/image]\n[/row]',
      }]
    },
    '三列分布': {
      id: 'row-3-demo',
      type: 'comments',
      title: '三列分布演示',
      duration: 5,
      items: [{
        id: 'item-row-3',
        author: 'LayoutExpert',
        content: '三列分布 (w=30%)：\n[row gap=8 justify=between]\n  [image w=30%]https://i.redd.it/vfxlybaze6tg1.jpeg[/image]\n  [image w=30%]https://i.redd.it/vfxlybaze6tg1.jpeg[/image]\n  [image w=30%]https://i.redd.it/vfxlybaze6tg1.jpeg[/image]\n[/row]',
      }]
    },
    '单图演示': {
      id: 'image-single-demo',
      type: 'comments',
      title: '单张图片演示',
      duration: 5,
      items: [{
        id: 'item-image-single',
        author: 'MediaExpert',
        content: '1. 原始比例 (默认高度限制):\n[image]https://i.redd.it/vfxlybaze6tg1.jpeg[/image]\n\n2. 指定宽度 (w=300):\n[image w=300]https://media.giphy.com/media/Ce2jJ1GCZOmD51CjJV/giphy.gif[/image]\n\n3. 等比例缩放 (s=0.4):\n[image s=0.4]https://i.redd.it/vfxlybaze6tg1.jpeg[/image]',
      }]
    },
    '图像裁切': {
      id: 'image-crop-demo',
      type: 'comments',
      title: '图像裁切与填充演示',
      duration: 5,
      items: [{
        id: 'item-image-crop',
        author: 'MediaExpert',
        content: '1. 强制宽高并裁切填满 (w=200 h=100 mode=cover):\n[image w=200 h=100 mode=cover]https://i.redd.it/vfxlybaze6tg1.jpeg[/image]\n\n2. 强制宽高并包含显示 (w=200 h=100 mode=contain):\n[image w=200 h=100 mode=contain]https://i.redd.it/vfxlybaze6tg1.jpeg[/image]\n\n3. 强制拉伸填满 (w=200 h=100 mode=fill):\n[image w=200 h=100 mode=fill]https://i.redd.it/vfxlybaze6tg1.jpeg[/image]',
      }]
    },
    '轮播图集': {
      id: 'gallery-demo',
      type: 'comments',
      title: '轮播图集演示',
      duration: 10,
      items: [{
        id: 'item-gallery',
        author: 'MediaExpert',
        content: '自动轮播图集 (gallery)：\n[gallery]https://preview.redd.it/jujnstfkj8tg1.jpg?width=774&format=pjpg&auto=webp&s=a30b5e0cf23eed1ed12fe82e9e09b0f0d4a058a6,https://preview.redd.it/nv4b0ufkj8tg1.jpg?width=763&format=pjpg&auto=webp&s=1543bea7205d1615b44142ae485b55b9787f64e3[/gallery]',
      }]
    },
    '音频音效': {
      id: 'audio-demo',
      type: 'comments',
      title: '音频标签演示',
      duration: 5,
      items: [{
        id: 'item-audio',
        author: 'SoundDesigner',
        content: '点击下方按钮试听音效：\n\n[audio src="among-us-role-reveal-sound.mp3" volume=0.8]\n\n[audio src="vine-boom.mp3" start=0.2]',
      }]
    }
  };

  const [scene, setScene] = useState<VideoScene>(PRESET_EXAMPLES['基础样式']);
  const [isExpanded, setIsExpanded] = useState(true);
  const [frameOffset, setFrameOffset] = useState(15);
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);

  React.useEffect(() => {
    if (!isSidebarResizing) return;

    const handleMouseMove = (event: MouseEvent) => {
      const resizeSnapshot = sidebarResizeRef.current;
      if (!resizeSnapshot) return;
      const deltaX = resizeSnapshot.startX - event.clientX;
      const nextWidth = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, resizeSnapshot.startWidth + deltaX));
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

  const previewConfig: VideoConfig = useMemo(() => ({
    title: '测试预览',
    subreddit: 'test',
    scenes: [scene],
  }), [scene]);

  const updateScene = (updates: Partial<VideoScene>) => {
    setScene(prev => ({ ...prev, ...updates }));
  };

  const replaceScene = (sceneId: string, nextScene: VideoScene) => {
    setScene(nextScene);
    return { ok: true, message: '场景已更新' };
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
    <div className="frame-test-page" style={{ position: 'relative', minHeight: '100vh', background: 'var(--test-page-bg)' }}>
      {/* 顶部导航栏 */}

      <div style={{ display: 'flex', minHeight: `calc(100vh - ${FIXED_SIDEBAR_TOP_OFFSET}px)` }}>
        {/* 左侧：主编辑区 */}
        <div style={{ flex: 1, padding: '24px', marginRight: sidebarWidth }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Space align="center">
              <Typography.Title level={4} style={{ marginBottom: 0 }}>画面格增强测试终端</Typography.Title>
            </Space>
          </div>

          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Alert
              type="info"
              showIcon
              message={
                <div id="frame-test-dsl-guide">
                  <Text strong>DSL 语法全指南：</Text>
                  <div style={{ marginTop: 8, fontSize: '12px' }}>
                    <Space direction="vertical" size={0}>
                      <div>• <Text code>[style color=#ff4500 size=24 align=center b i u]文本[/style]</Text> : 颜色、字号、对齐、加粗、斜体、下划线</div>
                      <div>• <Text code>[quote=Author id=123 max=100]内容[/quote]</Text> : 引用块，支持嵌套、ID追踪和字数截断</div>
                      <div>• <Text code>[image w=300 h=200 mode=cover]URL[/image]</Text> : 图片，支持宽高、缩放、填充模式</div>
                      <div>• <Text code>[row gap=10 align=center justify=between]...[/row]</Text> : 行容器，用于图片并排</div>
                      <div>• <Text code>[gallery]URL1,URL2[/gallery]</Text> : 自动轮播图集</div>
                      <div>• <Text code>[audio src="file.mp3" volume=1.0 start=0]</Text> : 插入音效/背景音</div>
                      <div>• <Text code>[\n]</Text> : 强制换行符</div>
                    </Space>
                  </div>
                </div>
              }
            />

            <Card
              size="small"
              variant="outlined"
              style={{ background: 'var(--panel-bg-translucent)', borderRadius: 12 }}
              title={<span><ToolOutlined /> 快速加载测试预设</span>}
            >
              <Space wrap size="small">
                {Object.keys(PRESET_EXAMPLES).map(name => (
                  <Button
                    key={name}
                    size="small"
                    type={scene.id === PRESET_EXAMPLES[name].id ? 'primary' : 'default'}
                    onClick={() => {
                      setScene(PRESET_EXAMPLES[name]);
                      message.success(`已加载“${name}”示例`);
                    }}
                    icon={<BugOutlined />}
                  >
                    {name}
                  </Button>
                ))}
              </Space>
            </Card>

            <Card
              title={<span><BugOutlined /> 画面编辑卡片</span>}
              variant="outlined"
              style={{ borderRadius: 12 }}
            >
              <DragDropContext onDragEnd={() => { }}>
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
                        onPreviewScene={() => setIsPreviewModalVisible(true)}
                        onReplaceScene={(next) => replaceScene('', next)}
                        previewDisabled={false}
                      />
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </Card>
          </Space>
        </div>

        {/* 右侧：固定预览面板 */}
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

          <div style={{ padding: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <Card
                title={<span><VideoCameraOutlined /> 实时动画预览</span>}
                size="small"
                variant="outlined"
                styles={{ body: { padding: 0, background: '#000', overflow: 'hidden' } }}
              >
                <VideoPreviewPlayer
                  videoConfig={previewConfig}
                  durationInFrames={Math.floor(scene.duration) * DEFAULT_PREVIEW_FPS}
                  compositionWidth={1280}
                  compositionHeight={720}
                  fps={DEFAULT_PREVIEW_FPS}
                  style={{ width: '100%', aspectRatio: '16/9' }}
                  focusedSceneId={scene.id}
                  controls
                  autoPlay
                  key={`video-${scene.id}`}
                />
              </Card>

              <Card
                title={<span><FileImageOutlined /> 略缩图快照</span>}
                size="small"
                variant="outlined"
                extra={
                  <Space>
                    <InputNumber
                      size="small"
                      min={0}
                      max={Math.floor(scene.duration) * DEFAULT_PREVIEW_FPS}
                      value={frameOffset}
                      onChange={(val) => setFrameOffset(Number(val) || 0)}
                      style={{ width: 60 }}
                    />
                    <Text type="secondary" style={{ fontSize: '11px' }}>帧</Text>
                  </Space>
                }
              >
                <div style={{ background: '#000', borderRadius: 4, overflow: 'hidden' }}>
                  <VideoPreviewPlayer
                    videoConfig={previewConfig}
                    durationInFrames={Math.floor(scene.duration) * DEFAULT_PREVIEW_FPS}
                    fps={DEFAULT_PREVIEW_FPS}
                    initialFrame={frameOffset}
                    style={{ width: '100%', aspectRatio: '16/9' }}
                    controls={false}
                    autoPlay={false}
                    focusedSceneId={scene.id}
                    key={`static-${scene.id}-${frameOffset}`}
                  />
                </div>
              </Card>

              <Card title="JSON 状态监控" size="small" variant="outlined">
                <pre style={{ margin: 0, fontSize: '10px', fontFamily: 'monospace', maxHeight: '200px', overflow: 'auto', background: '#1e1e1e', color: '#d4d4d4', padding: '8px', borderRadius: '4px' }}>
                  {JSON.stringify(scene, null, 2)}
                </pre>
              </Card>
            </Space>
          </div>
        </div>
      </div>

      <Modal
        title="全屏实时预览"
        open={isPreviewModalVisible}
        onCancel={() => setIsPreviewModalVisible(false)}
        footer={null}
        width={1000}
        styles={{ body: { padding: 0, background: '#000' } }}
        destroyOnHidden
      >
        <VideoPreviewPlayer
          videoConfig={previewConfig}
          durationInFrames={Math.floor(scene.duration) * DEFAULT_PREVIEW_FPS}
          compositionWidth={1280}
          compositionHeight={720}
          fps={DEFAULT_PREVIEW_FPS}
          style={{ width: '100%', aspectRatio: '16/9' }}
          focusedSceneId={scene.id}
          controls
          autoPlay
        />
      </Modal>
    </div>
  );
};
