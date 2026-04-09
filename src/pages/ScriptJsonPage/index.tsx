import React from 'react';
import { Card, Button, Space, Typography, Empty, message } from 'antd';
import { CopyOutlined, ArrowLeftOutlined, DownloadOutlined } from '@ant-design/icons';
import { VideoConfig } from '../../types';

const { Text } = Typography;

interface ScriptJsonPageProps {
  config: VideoConfig;
  onBack: () => void;
  toolDesc: string;
}

export const ScriptJsonPage: React.FC<ScriptJsonPageProps> = ({
  config,
  onBack,
  toolDesc,
}) => {
  const copyToClipboard = async () => {
    if (!config) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
      message.success('配置 JSON 已复制到剪贴板');
    } catch (err) {
      console.error(err);
      message.error('复制失败');
    }
  };

  const downloadConfig = () => {
    if (!config) return;
    const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(config, null, 2))}`;
    const anchor = document.createElement('a');
    anchor.setAttribute('href', dataStr);
    anchor.setAttribute('download', `video-config-${Date.now()}.json`);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    message.success('配置文件已下载');
  };

  return (
    <Card
      title="视频脚本 JSON 数据"
      className="panel-card"
      bordered={false}
      extra={
        <Space>
          <Text type="secondary">{toolDesc}</Text>
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
            返回提取
          </Button>
          <Button
            icon={<CopyOutlined />}
            onClick={copyToClipboard}
            disabled={!config}
          >
            复制脚本 JSON
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={downloadConfig}
            disabled={!config}
          >
            导出 JSON 文件
          </Button>
        </Space>
      }
    >
      {config ? (
        <div
          style={{
            background: 'var(--code-bg)',
            padding: '16px',
            borderRadius: '8px',
            overflowX: 'auto',
          }}
        >
          <pre
            style={{
              margin: 0,
              color: 'var(--code-text)',
              fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
              fontSize: '14px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {JSON.stringify(config, null, 2)}
          </pre>
        </div>
      ) : (
        <Empty description="暂无脚本数据" />
      )}
    </Card>
  );
};
