import React from 'react';
import { Card, Button, Space, Typography, Empty, message } from 'antd';
import { CopyOutlined, ArrowLeftOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface FilteredJsonPageProps {
  data: any;
  onBack: () => void;
  toolDesc: string;
}

export const FilteredJsonPage: React.FC<FilteredJsonPageProps> = ({
  data,
  onBack,
  toolDesc,
}) => {
  const copyToClipboard = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      message.success('JSON 已复制到剪贴板');
    } catch (err) {
      console.error(err);
      message.error('复制失败');
    }
  };

  return (
    <Card
      title="过滤后 Reddit JSON 数据"
      className="panel-card"
      bordered={false}
      extra={
        <Space>
          <Text type="secondary">{toolDesc}</Text>
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
            返回提取
          </Button>
          <Button
            type="primary"
            icon={<CopyOutlined />}
            onClick={copyToClipboard}
            disabled={!data}
          >
            复制过滤后 JSON
          </Button>
        </Space>
      }
    >
      {data ? (
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
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      ) : (
        <Empty description="暂无过滤后数据" />
      )}
    </Card>
  );
};
