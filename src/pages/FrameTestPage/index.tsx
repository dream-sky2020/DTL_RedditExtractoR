import React, { useState, useMemo } from 'react';
import { Typography, Space, Modal } from 'antd';
import { VideoScene, VideoConfig } from '../../types';
import { VideoPreviewPlayer, DEFAULT_PREVIEW_FPS } from '../../components/VideoPreviewPlayer';
import { DslGuide } from './components/DslGuide';
import { PresetPanel } from './components/PresetPanel';
import { EditorSection } from './components/EditorSection';
import { Sidebar } from './components/Sidebar';

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
    '多图轮播': {
      id: 'gallery-demo',
      type: 'comments',
      title: '多图轮播演示',
      duration: 10,
      items: [{
        id: 'item-gallery',
        author: 'MediaExpert',
        content: '多图轮播 ([image] 内写多个 URL)：\n[image]https://preview.redd.it/jujnstfkj8tg1.jpg?width=774&format=pjpg&auto=webp&s=a30b5e0cf23eed1ed12fe82e9e09b0f0d4a058a6,https://preview.redd.it/nv4b0ufkj8tg1.jpg?width=763&format=pjpg&auto=webp&s=1543bea7205d1615b44142ae485b55b9787f64e3[/image]',
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

  return (
    <div className="frame-test-page" style={{ position: 'relative', minHeight: '100vh', background: 'var(--test-page-bg)' }}>
      <div style={{ display: 'flex', minHeight: `calc(100vh - ${FIXED_SIDEBAR_TOP_OFFSET}px)` }}>
        {/* 左侧：主编辑区 */}
        <div style={{ flex: 1, padding: '24px', marginRight: sidebarWidth }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Space align="center">
              <Typography.Title level={4} style={{ marginBottom: 0 }}>画面格增强测试终端</Typography.Title>
            </Space>
          </div>

          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <DslGuide />

            <PresetPanel
              presets={PRESET_EXAMPLES}
              activeSceneId={scene.id}
              onSelect={(nextScene) => setScene(nextScene)}
            />

            <EditorSection
              scene={scene}
              isExpanded={isExpanded}
              onToggleExpand={() => setIsExpanded(!isExpanded)}
              onUpdateScene={updateScene}
              onPreviewScene={() => setIsPreviewModalVisible(true)}
              onReplaceScene={(next) => replaceScene('', next)}
            />
          </Space>
        </div>

        {/* 右侧：固定预览面板 */}
        <Sidebar
          sidebarWidth={sidebarWidth}
          isSidebarResizing={isSidebarResizing}
          FIXED_SIDEBAR_TOP_OFFSET={FIXED_SIDEBAR_TOP_OFFSET}
          startSidebarResize={startSidebarResize}
          scene={scene}
          previewConfig={previewConfig}
          frameOffset={frameOffset}
          setFrameOffset={setFrameOffset}
          isPreviewModalVisible={isPreviewModalVisible}
        />
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

