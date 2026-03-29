import React from 'react';
import {
  Card,
  Button,
  Space,
  Row,
  Col,
  Typography,
  Divider,
  Modal,
  Alert,
} from 'antd';
import {
  EditOutlined,
  VideoCameraOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { Player } from '@remotion/player';
import { MyVideo } from '../remotion/MyVideo';

const { Text } = Typography;

import { VideoConfig } from '../types';

interface PreviewPageProps {
  videoConfig: VideoConfig;
  onBackToEditor: () => void;
  isExportModalVisible: boolean;
  setIsExportModalVisible: (visible: boolean) => void;
  isAutoRendering: boolean;
  autoRenderStatus: any;
  startAutoRender: () => void;
  downloadVideoConfig: () => void;
}

export const PreviewPage: React.FC<PreviewPageProps> = ({
  videoConfig,
  onBackToEditor,
  isExportModalVisible,
  setIsExportModalVisible,
  isAutoRendering,
  autoRenderStatus,
  startAutoRender,
  downloadVideoConfig,
}) => {
  const fps = 30;
  const totalDurationInSeconds = videoConfig.segments.reduce((acc, seg) => acc + seg.duration, 0);
  const totalFrames = Math.max(1, totalDurationInSeconds * fps);

  return (
    <Row gutter={24}>
      <Col span={24}>
        <Card
          title="最终预览"
          className="panel-card"
          bordered={false}
          extra={
            <Button onClick={onBackToEditor} icon={<EditOutlined />}>
              返回修改内容
            </Button>
          }
          styles={{ body: { background: '#000', padding: 0 } }}
        >
          <Player
            component={MyVideo}
            durationInFrames={totalFrames}
            compositionWidth={1280}
            compositionHeight={720}
            fps={fps}
            style={{
              width: '100%',
              aspectRatio: '16 / 9',
            }}
            inputProps={videoConfig}
            controls
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
              icon={<DownloadOutlined />}
              onClick={() => setIsExportModalVisible(true)}
            >
              导出本地 MP4
            </Button>
            <Text type="secondary">导出功能需在本地运行渲染脚本</Text>
          </Space>
        </Card>
      </Col>

      <Modal
        title="导出视频"
        open={isExportModalVisible}
        onCancel={() => !isAutoRendering && setIsExportModalVisible(false)}
        footer={[
          <Button 
            key="close" 
            onClick={() => setIsExportModalVisible(false)}
            disabled={isAutoRendering}
          >
            {isAutoRendering ? '正在导出中...' : '关闭'}
          </Button>
        ]}
        width={700}
      >
        <div style={{ padding: '10px 0' }}>
          <Alert
            type="success"
            message="✨ 一键全自动导出 (推荐)"
            description={
              <div>
                <p>如果你已经开启了 Python 后端，可以直接点击下方按钮全自动生成视频。</p>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button 
                    type="primary" 
                    size="large" 
                    icon={<VideoCameraOutlined />} 
                    loading={isAutoRendering}
                    onClick={startAutoRender}
                  >
                    立即在本地生成 MP4
                  </Button>
                  {autoRenderStatus && (
                    <Alert 
                      type={autoRenderStatus.type} 
                      message={autoRenderStatus.message} 
                      showIcon 
                    />
                  )}
                </Space>
              </div>
            }
            style={{ marginBottom: 20 }}
          />

          <Divider orientation="left" plain>手动模式 (备选)</Divider>
          <p>如果 Python 后端不可用，你可以手动操作：</p>
          <Space direction="vertical">
            <Button icon={<DownloadOutlined />} onClick={downloadVideoConfig}>
              下载配置文件
            </Button>
            <Text type="secondary">
              下载后放入根目录并运行：<code>node scripts/render.js</code>
            </Text>
          </Space>
        </div>
      </Modal>
    </Row>
  );
};
