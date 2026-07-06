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
  List,
} from 'antd';
import { toast } from '@components/Toast';
import {
  EditOutlined,
  CopyOutlined,
  CodeOutlined,
  DeleteOutlined,
  RocketOutlined,
  PlusOutlined,
  InboxOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { dialogs } from '../../components/Dialogs';
import { useRedditStore, useSettingsStore } from '@/store';

const { Text } = Typography;

interface ExtractPageProps {
  goToEditor: () => void;
  goToFilteredData: () => void;
  goToRawData: () => void;
  goToScriptData: () => void;
  toolDesc: string;
  toolButton: string;
}

export const ExtractPage: React.FC<ExtractPageProps> = ({
  goToEditor,
  goToFilteredData,
  goToRawData,
  goToScriptData,
  toolDesc,
  toolButton,
}) => {
  const {
    redditUrl,
    setRedditUrl,
    loading,
    error,
    errorDebug,
    result,
    results,
    fetchRedditData,
    importRedditRawData,
    clearPersistedData,
    hasStoredRawData,
    removeRawResult,
  } = useRedditStore();

  const { commentSortMode, replyOrderMode, colorArrangement } = useSettingsStore();
  const previewResults = results.length > 0 ? results : result ? [result] : [];
  const hasExtractedData = previewResults.length > 0 || hasStoredRawData;

  const stripDslTags = (value: string) => value.replace(/\[\/?[^\]]+\]/g, '').trim();

  const handleFetch = () => {
    fetchRedditData(commentSortMode, replyOrderMode, colorArrangement);
  };

  const handleFetchAndAppend = () => {
    fetchRedditData(commentSortMode, replyOrderMode, colorArrangement, 'append');
  };

  const handleManualImport = async () => {
    await handleManualImportByMode('replace');
  };

  const handleManualImportAndAppend = async () => {
    await handleManualImportByMode('append');
  };

  const handleManualImportByMode = async (mode: 'replace' | 'append') => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText.trim()) {
        toast.error('剪贴板为空，请先复制 Reddit JSON');
        return;
      }
      const parsed = JSON.parse(clipboardText);
      await importRedditRawData(parsed, commentSortMode, replyOrderMode, colorArrangement, mode);
    } catch (err) {
      console.error(err);
      toast.error('读取剪贴板失败或 JSON 格式无效');
    }
  };

  const tryExtractRawUrl = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return '';

    // 支持日志整行复制：GET /fetch_reddit?url=... HTTP/1.1
    const lineMatch = trimmed.match(/\/fetch_reddit\?url=([^\s"]+)/);
    if (lineMatch?.[1]) {
      return decodeURIComponent(lineMatch[1]);
    }

    // 支持完整代理 URL：http://localhost:5000/fetch_reddit?url=...
    try {
      const parsed = new URL(trimmed);
      if (parsed.pathname.includes('/fetch_reddit')) {
        const wrapped = parsed.searchParams.get('url');
        return wrapped ? decodeURIComponent(wrapped) : '';
      }
    } catch (e) {
      // 不是标准 URL，继续按普通 query 片段处理
    }

    // 支持直接粘贴 query 片段：/fetch_reddit?url=...
    const queryMatch = trimmed.match(/url=([^&\s]+)/);
    if (queryMatch?.[1]) {
      return decodeURIComponent(queryMatch[1]);
    }

    return '';
  };

  const handlePasteAndExtractUrl = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText.trim()) {
        toast.error('剪贴板为空，请先复制代理 URL 或日志行');
        return;
      }

      const extractedUrl = tryExtractRawUrl(clipboardText);
      if (!extractedUrl) {
        toast.error('未识别到 fetch_reddit?url=... 中的原始链接');
        return;
      }

      setRedditUrl(extractedUrl);
      toast.success('已解析并填入原始 JSON 链接');
    } catch (err) {
      console.error(err);
      toast.error('读取剪贴板失败');
    }
  };

  const copyToClipboard = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      toast.success('JSON 已复制到剪贴板');
    } catch (err) {
      toast.error('复制失败');
    }
  };

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
              onPressEnter={handleFetch}
            />
          </Form.Item>
          <Space>
            <Button
              type="primary"
              size="large"
              loading={loading}
              disabled={!redditUrl.trim()}
              onClick={handleFetch}
            >
              {toolButton}
            </Button>
            <Button
              size="large"
              loading={loading}
              disabled={!redditUrl.trim()}
              icon={<PlusOutlined />}
              onClick={handleFetchAndAppend}
            >
              提取并追加到当前脚本
            </Button>
            <Button
              size="large"
              loading={loading}
              icon={<InboxOutlined />}
              onClick={handleManualImport}
            >
              手动导入（剪贴板 JSON）
            </Button>
            <Button
              size="large"
              loading={loading}
              icon={<PlusOutlined />}
              onClick={handleManualImportAndAppend}
            >
              手动导入并追加（剪贴板 JSON）
            </Button>
            <Button
              size="large"
              icon={<LinkOutlined />}
              onClick={handlePasteAndExtractUrl}
            >
              粘贴并解析代理 URL
            </Button>
            <Button
              danger
              size="large"
              icon={<DeleteOutlined />}
              onClick={() => {
                dialogs.confirm({
                  title: '确认清除本地缓存？',
                  content: '这将删除所有已提取的 Reddit 原始数据、视频配置和作者配置。此操作不可撤销。',
                  okType: 'danger',
                  onOk: clearPersistedData
                });
              }}
              disabled={!hasStoredRawData}
            >
              清除本地原始数据缓存
            </Button>
            {hasExtractedData && (
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

        {previewResults.length > 0 && (
          <List
            style={{ marginTop: 16 }}
            header={<Text strong>已提取帖子（{previewResults.length}）</Text>}
            bordered
            dataSource={previewResults}
            renderItem={(item, index) => (
              <List.Item
                actions={[
                  <Button
                    key="remove"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => removeRawResult(index)}
                  >
                    移除
                  </Button>
                ]}
              >
                <List.Item.Meta
                  title={stripDslTags(item.title || '未命名帖子') || '未命名帖子'}
                  description={
                    <Space size="middle" wrap>
                      <Text type="secondary">作者：{item.author || '-'}</Text>
                      <Text type="secondary">评论数：{item.stats?.commentCount ?? 0}</Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
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
