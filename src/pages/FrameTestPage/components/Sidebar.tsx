import React from 'react';
import { Card, Space, Typography, InputNumber } from 'antd';
import { VideoCameraOutlined, FileImageOutlined } from '@ant-design/icons';
import { VideoPreviewPlayer, DEFAULT_PREVIEW_FPS } from '../../../components/VideoPreviewPlayer';
import { VideoScene, VideoConfig } from '../../../types';

const { Text } = Typography;

interface SidebarProps {
  sidebarWidth: number;
  isSidebarResizing: boolean;
  FIXED_SIDEBAR_TOP_OFFSET: number;
  startSidebarResize: (event: React.MouseEvent<HTMLDivElement>) => void;
  scene: VideoScene;
  previewConfig: VideoConfig;
  frameOffset: number;
  setFrameOffset: (offset: number) => void;
  isPreviewModalVisible: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sidebarWidth,
  isSidebarResizing,
  FIXED_SIDEBAR_TOP_OFFSET,
  startSidebarResize,
  scene,
  previewConfig,
  frameOffset,
  setFrameOffset,
}) => {
  return (
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
  );
};
