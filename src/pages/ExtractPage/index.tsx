import React from 'react';
import {
  Card,
  Input,
  Form,
  Alert,
  Space,
  Button,
  Statistic,
  Descriptions,
  Typography,
  Tag,
  Row,
  Col,
  Divider,
} from 'antd';
import {
  LinkOutlined,
  EditOutlined,
  CopyOutlined,
  CodeOutlined,
  DeleteOutlined,
  RocketOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

interface ExtractPageProps {
  redditUrl: string;
  setRedditUrl: (url: string) => void;
  loading: boolean;
  error: string;
  errorDebug: string;
  result: any;
  fetchRedditData: () => void;
  clearStoredRawData: () => void;
  hasStoredRawData: boolean;
  copyToClipboard: () => void;
  goToEditor: () => void;
  goToFilteredData: () => void;
  goToRawData: () => void;
  goToScriptData: () => void;
  toolDesc: string;
  toolButton: string;
}

export const ExtractPage: React.FC<ExtractPageProps> = ({
  redditUrl,
  setRedditUrl,
  loading,
  error,
  errorDebug,
  result,
  fetchRedditData,
  clearStoredRawData,
  hasStoredRawData,
  copyToClipboard,
  goToEditor,
  goToFilteredData,
  goToRawData,
  goToScriptData,
  toolDesc,
  toolButton,
}) => {
  return (
    <>
      <Card
        size="small"
        className="panel-card"
        variant="outlined"
        style={{ marginBottom: 16, background: 'var(--guide-card-bg)', border: '1px solid var(--guide-card-border)' }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--guide-card-text)' }}>
            <RocketOutlined />
            <Text strong style={{ color: 'var(--guide-card-text)' }}>操作指南：启动 Python 后端以确保正常抓取与导出</Text>
          </div>
          <Text type="secondary" style={{ fontSize: '13px' }}>
            为了绕过浏览器跨域限制并支持视频渲染，请确保在终端中运行以下命令启动后端服务：
          </Text>
          <div style={{ background: 'var(--guide-code-bg)', padding: '8px 12px', borderRadius: 4, border: '1px dashed var(--guide-code-border)' }}>
            <code style={{ color: 'var(--guide-code-text)' }}>python scripts/server.py</code>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: '12px' }}>
            <span><Tag color="blue">Step 1</Tag> 启动 Python 后端</span>
            <span><Tag color="cyan">Step 2</Tag> 输入 Reddit 链接提取数据</span>
            <span><Tag color="purple">Step 3</Tag> 进入编辑器调整并导出视频</span>
          </div>
        </Space>
      </Card>

      <Card
        title="数据提取"
        className="panel-card"
        variant="borderless"
        extra={<Text type="secondary">{toolDesc}</Text>}
      >
        {error && (
          <Alert
            message={error}
            description={
              errorDebug ? (
                <pre
                  style={{
                    margin: 0,
                    marginTop: 8,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: 220,
                    overflow: 'auto',
                  }}
                >
                  {errorDebug}
                </pre>
              ) : null
            }
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        <Form layout="vertical">
          <Form.Item label="Reddit 帖子链接">
            <Input
              value={redditUrl}
              onChange={(e) => setRedditUrl(e.target.value)}
              placeholder="https://www.reddit.com/r/.../comments/..."
              size="large"
              allowClear
              onPressEnter={fetchRedditData}
            />
          </Form.Item>
          <Space>
            <Button
              type="primary"
              size="large"
              loading={loading}
              disabled={!redditUrl.trim()}
              onClick={fetchRedditData}
            >
              {toolButton}
            </Button>
            <Button
              danger
              size="large"
              icon={<DeleteOutlined />}
              onClick={clearStoredRawData}
              disabled={!hasStoredRawData}
            >
              清除本地原始数据缓存
            </Button>
            {result && (
              <Space>
                <Button 
                  size="large" 
                  icon={<CodeOutlined />}
                  onClick={goToFilteredData}
                >
                  过滤后 Reddit JSON
                </Button>
                <Button 
                  size="large" 
                  icon={<CodeOutlined />}
                  onClick={goToRawData}
                >
                  未处理 Reddit JSON
                </Button>
                <Button 
                  size="large" 
                  icon={<EditOutlined />}
                  onClick={goToScriptData}
                  type="primary"
                  ghost
                >
                  生成的视频脚本
                </Button>
                <Button 
                  size="large" 
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={goToEditor}
                >
                  进入编辑器
                </Button>
              </Space>
            )}
          </Space>
        </Form>
      </Card>

      {result && (
        <Card
          title="数据预览"
          className="panel-card result-card"
          variant="borderless"
          extra={
            <Space>
              <Button onClick={copyToClipboard} icon={<CopyOutlined />}>
                复制 JSON
              </Button>
            </Space>
          }
        >
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12} md={6}>
              <Statistic title="点赞总数" value={result.stats.upvotes} />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic title="评论总数" value={result.stats.commentCount} />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic title="Subreddit" value={result.subreddit || '-'} />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic title="发布者" value={result.author || '-'} />
            </Col>
          </Row>

          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="标题">{result.title}</Descriptions.Item>
            <Descriptions.Item label="正文">
              <div className="content-preview">
                {result.content || '无正文'}
                {result.image && (
                  <Tag color="green" style={{ marginLeft: 8 }}>检测到媒体内容</Tag>
                )}
              </div>
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}
    </>
  );
};
