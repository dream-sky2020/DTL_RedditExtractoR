import React from 'react';
import {
  Card,
  Button,
  Space,
  Row,
  Col,
  Typography,
} from 'antd';
import {
  EditOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import { VideoPreviewPlayer, getTotalFrames } from '../../components/VideoPreviewPlayer';
import { getActiveVideoCanvasSize, getAspectRatioLabel } from '../../rendering/videoCanvas';

const { Text } = Typography;

import { VideoConfig } from '../../types';

interface VideoPreviewPageProps {
  videoConfig: VideoConfig;
  onBackToEditor: () => void;
  onGoToRenderTasks: () => void;
}

export const VideoPreviewPage: React.FC<VideoPreviewPageProps> = ({
  videoConfig,
  onBackToEditor,
  onGoToRenderTasks,
}) => {
  const totalFrames = getTotalFrames(videoConfig);
  const activeCanvas = getActiveVideoCanvasSize(videoConfig);
  const activeAspectRatioLabel = getAspectRatioLabel(activeCanvas.width, activeCanvas.height);

  return (
    <Row gutter={24}>
      <Col span={24}>
        <Card
          title={`视频动画预览 (Dynamic Video) · ${activeAspectRatioLabel}`}
          className="panel-card"
          bordered={false}
          extra={
            <Button onClick={onBackToEditor} icon={<EditOutlined />}>
              返回修改内容
            </Button>
          }
          styles={{ body: { background: 'var(--brand-dark)', padding: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' } }}
        >
          <VideoPreviewPlayer
            videoConfig={videoConfig}
            durationInFrames={totalFrames}
            style={{
              width: '100%',
              maxWidth: '100%',
              maxHeight: 'calc(100vh - 300px)',
              aspectRatio: `${activeCanvas.width} / ${activeCanvas.height}`,
              margin: '0 auto',
            }}
            loop
          />
        </Card>
      </Col>
      <Col span={24}>
        <Card className="panel-card" bordered={false}>
          <Space size="middle">
            <Button
              type="primary"
              size="large"
              icon={<ExportOutlined />}
              onClick={onGoToRenderTasks}
            >
              前往导出与任务管理
            </Button>
            <Text type="secondary">渲染任务已独立到专属页面管理</Text>
          </Space>
        </Card>
      </Col>
    </Row>
  );
};
