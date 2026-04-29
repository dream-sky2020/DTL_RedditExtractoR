import React from 'react';
import {
  Alert,
  Button,
  Card,
  Divider,
  List,
  Progress,
  Space,
  Tag,
  Typography,
} from 'antd';
import {
  DeleteOutlined,
  DownloadOutlined,
  StopOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { RenderTask } from '../../hooks/useVideoRender';

const { Text } = Typography;

interface RenderTasksPageProps {
  isAutoRendering: boolean;
  isSubmittingTask: boolean;
  autoRenderStatus: any;
  renderProgress: { percent: number; task: string; detail?: string } | null;
  renderTasks: RenderTask[];
  activeTaskId: string | null;
  startAutoRender: () => Promise<void>;
  cancelRenderTask: (taskId: string) => Promise<void>;
  removeRenderTask: (taskId: string) => Promise<void>;
  clearFinishedTasks: (statuses?: Array<'success' | 'error' | 'cancelled'>) => Promise<void>;
  downloadVideoConfig: () => void;
}

export const RenderTasksPage: React.FC<RenderTasksPageProps> = ({
  isAutoRendering,
  isSubmittingTask,
  autoRenderStatus,
  renderProgress,
  renderTasks,
  activeTaskId,
  startAutoRender,
  cancelRenderTask,
  removeRenderTask,
  clearFinishedTasks,
  downloadVideoConfig,
}) => {
  const getTaskTag = (status: RenderTask['status']) => {
    switch (status) {
      case 'queued':
        return <Tag color="default">排队中</Tag>;
      case 'running':
        return <Tag color="processing">渲染中</Tag>;
      case 'success':
        return <Tag color="success">已完成</Tag>;
      case 'error':
        return <Tag color="error">失败</Tag>;
      case 'cancelled':
        return <Tag color="warning">已取消</Tag>;
      default:
        return <Tag>未知</Tag>;
    }
  };

  return (
    <Card className="panel-card" bordered={false}>
      <Alert
        type="success"
        message="✨ 导出视频与渲染任务"
        description={
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button
              type="primary"
              size="large"
              icon={<VideoCameraOutlined />}
              loading={isSubmittingTask}
              onClick={startAutoRender}
            >
              立即在本地生成 MP4
            </Button>
            {renderProgress && (
              <div>
                <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <Text strong>{renderProgress.task}</Text>
                  <Text type="secondary">{renderProgress.percent}%</Text>
                </div>
                <Progress
                  percent={renderProgress.percent}
                  status={isAutoRendering ? 'active' : 'success'}
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                />
                {renderProgress.detail && (
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary">{renderProgress.detail}</Text>
                  </div>
                )}
              </div>
            )}
            {autoRenderStatus && (
              <Alert
                type={autoRenderStatus.type}
                message={autoRenderStatus.message}
                showIcon
              />
            )}
          </Space>
        }
      />

      <Divider orientation="left" plain style={{ marginTop: 20 }}>
        渲染任务队列
      </Divider>
      <Space size="small" style={{ marginBottom: 8 }}>
        <Button
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => void clearFinishedTasks(['error'])}
        >
          清理失败任务
        </Button>
        <Button
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => void clearFinishedTasks(['success', 'error', 'cancelled'])}
        >
          清理已结束任务
        </Button>
      </Space>
      <List
        size="small"
        bordered
        dataSource={renderTasks}
        locale={{ emptyText: '暂无渲染任务' }}
        renderItem={(task) => (
          <List.Item
            actions={[
              (task.status === 'queued' || task.status === 'running') ? (
                <Button
                  key="cancel"
                  danger
                  size="small"
                  icon={<StopOutlined />}
                  onClick={() => void cancelRenderTask(task.id)}
                  disabled={task.cancelRequested}
                >
                  {task.cancelRequested ? '取消中...' : '取消'}
                </Button>
              ) : (
                <Button
                  key="remove"
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => void removeRenderTask(task.id)}
                >
                  清除
                </Button>
              )
            ].filter(Boolean)}
          >
            <div style={{ width: '100%' }}>
              <Space size={8} style={{ marginBottom: 6 }}>
                <Text strong>{task.title || task.id}</Text>
                {getTaskTag(task.status)}
                {activeTaskId === task.id && task.status === 'running' && (
                  <Tag color="blue">当前执行</Tag>
                )}
              </Space>
              {task.progress && (
                <Progress
                  percent={task.progress.percent}
                  size="small"
                  status={task.status === 'error' ? 'exception' : task.status === 'success' ? 'success' : 'active'}
                />
              )}
              <Text type="secondary">{task.message || task.progress?.task || '-'}</Text>
              {task.outputPath && (
                <div>
                  <Text type="secondary">输出：{task.outputPath}</Text>
                </div>
              )}
            </div>
          </List.Item>
        )}
      />

      <Divider orientation="left" plain style={{ marginTop: 20 }}>
        手动模式 (备选)
      </Divider>
      <Space direction="vertical">
        <Button icon={<DownloadOutlined />} onClick={downloadVideoConfig}>
          下载配置文件
        </Button>
        <Text type="secondary">
          下载后放入根目录并运行：<code>node scripts/render.js</code>
        </Text>
      </Space>
    </Card>
  );
};
