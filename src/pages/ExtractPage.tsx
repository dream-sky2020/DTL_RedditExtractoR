import React from 'react';
import {
  Card,
  Input,
  Form,
  Alert,
  Space,
  Button,
  Row,
  Col,
  Statistic,
  Descriptions,
  Typography,
  Tag,
} from 'antd';
import {
  LinkOutlined,
  EditOutlined,
  CopyOutlined,
  CodeOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

interface ExtractPageProps {
  redditUrl: string;
  setRedditUrl: (url: string) => void;
  loading: boolean;
  error: string;
  result: any;
  fetchRedditData: () => void;
  copyToClipboard: () => void;
  goToEditor: () => void;
  goToFilteredData: () => void;
  goToScriptData: () => void;
  toolDesc: string;
  toolButton: string;
}

export const ExtractPage: React.FC<ExtractPageProps> = ({
  redditUrl,
  setRedditUrl,
  loading,
  error,
  result,
  fetchRedditData,
  copyToClipboard,
  goToEditor,
  goToFilteredData,
  goToScriptData,
  toolDesc,
  toolButton,
}) => {
  return (
    <>
      <Card
        title="数据提取"
        className="panel-card"
        bordered={false}
        extra={<Text type="secondary">{toolDesc}</Text>}
      >
        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            banner
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
            {result && (
              <Space>
                <Button 
                  size="large" 
                  icon={<CodeOutlined />}
                  onClick={goToFilteredData}
                >
                  原始数据 JSON
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
          bordered={false}
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
                {result.content && result.content.includes('https://preview.redd.it/') && (
                  <Tag color="green" style={{ marginLeft: 8 }}>检测到图片</Tag>
                )}
              </div>
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}
    </>
  );
};
