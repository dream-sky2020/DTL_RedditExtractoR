import React from 'react';
import {
  Card,
  Input,
  Form,
  Space,
  Button,
  Row,
  Col,
  Typography,
  Divider,
  InputNumber,
  List,
  Tag,
} from 'antd';
import {
  EditOutlined,
  VideoCameraOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { VideoConfig, VideoSegment } from '../types';

const { Text } = Typography;
const { TextArea } = Input;

interface EditorPageProps {
  draftConfig: VideoConfig;
  setDraftConfig: (config: VideoConfig) => void;
  onApply: () => void;
  onBack: () => void;
  toolDesc: string;
}

export const EditorPage: React.FC<EditorPageProps> = ({
  draftConfig,
  setDraftConfig,
  onApply,
  onBack,
  toolDesc,
}) => {
  const updateSegment = (id: string, updates: Partial<VideoSegment>) => {
    const newSegments = draftConfig.segments.map(seg => 
      seg.id === id ? { ...seg, ...updates } : seg
    );
    setDraftConfig({ ...draftConfig, segments: newSegments });
  };

  const removeSegment = (id: string) => {
    const newSegments = draftConfig.segments.filter(seg => seg.id !== id);
    setDraftConfig({ ...draftConfig, segments: newSegments });
  };

  const moveSegment = (index: number, direction: 'up' | 'down') => {
    const newSegments = [...draftConfig.segments];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newSegments.length) {
      [newSegments[index], newSegments[targetIndex]] = [newSegments[targetIndex], newSegments[index]];
      setDraftConfig({ ...draftConfig, segments: newSegments });
    }
  };

  const addSegment = () => {
    const newSegment: VideoSegment = {
      id: 'custom-' + Date.now(),
      type: 'comment',
      author: 'Custom User',
      content: '',
      duration: 3,
      image: '',
      depth: 0
    };
    setDraftConfig({ ...draftConfig, segments: [...draftConfig.segments, newSegment] });
  };

  return (
    <div className="editor-page-container">
      <Card
        title={<span><EditOutlined /> 整体配置</span>}
        className="panel-card"
        bordered={false}
        extra={<Text type="secondary">{toolDesc}</Text>}
      >
        <Form layout="vertical">
          <Row gutter={24}>
            <Col span={16}>
              <Form.Item label="视频标题">
                <Input
                  value={draftConfig.title}
                  onChange={(e) => setDraftConfig({ ...draftConfig, title: e.target.value })}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Subreddit (r/)">
                <Input
                  value={draftConfig.subreddit}
                  onChange={(e) => setDraftConfig({ ...draftConfig, subreddit: e.target.value })}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Typography.Title level={4}>视频卡片流 (垂直排列)</Typography.Title>
          <Button type="dashed" icon={<PlusOutlined />} onClick={addSegment}>
            添加自定义卡片
          </Button>
        </div>

        <List
          dataSource={draftConfig.segments}
          renderItem={(item, index) => (
            <Card
              size="small"
              className="segment-card"
              style={{ 
                marginBottom: 16, 
                marginLeft: (item.depth || 0) * 20,
                borderLeft: item.type === 'post' ? '6px solid #ff4500' : '6px solid #1890ff',
                backgroundColor: item.depth && item.depth > 0 ? '#f9f9f9' : '#fff'
              }}
              title={
                <Space>
                  <Tag color={item.type === 'post' ? 'orange' : 'blue'}>
                    {item.type === 'post' ? '贴子正文' : '贴子评论'}
                  </Tag>
                  {item.parentAuthor && (
                    <Tag color="cyan">回复 u/{item.parentAuthor}</Tag>
                  )}
                  <Input 
                    size="small" 
                    value={item.author} 
                    onChange={(e) => updateSegment(item.id, { author: e.target.value })} 
                    style={{ width: 150 }}
                    placeholder="作者 (u/)"
                  />
                </Space>
              }
              extra={
                <Space>
                  <Button 
                    size="small" 
                    icon={<ArrowUpOutlined />} 
                    disabled={index === 0} 
                    onClick={() => moveSegment(index, 'up')}
                  />
                  <Button 
                    size="small" 
                    icon={<ArrowDownOutlined />} 
                    disabled={index === draftConfig.segments.length - 1} 
                    onClick={() => moveSegment(index, 'down')}
                  />
                  <Button 
                    size="small" 
                    danger 
                    icon={<DeleteOutlined />} 
                    onClick={() => removeSegment(item.id)}
                  />
                </Space>
              }
            >
              <Form layout="vertical">
                <Row gutter={16}>
                  <Col span={16}>
                    <Form.Item label={item.type === 'post' ? "贴子正文内容" : "评论内容"} style={{ marginBottom: 12 }}>
                      <TextArea
                        rows={item.type === 'post' ? 4 : 2}
                        value={item.content}
                        onChange={(e) => updateSegment(item.id, { content: e.target.value })}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Form.Item label="播放时间 (秒)" style={{ marginBottom: 12 }}>
                      <InputNumber
                        min={1}
                        max={60}
                        style={{ width: '100%' }}
                        value={item.duration}
                        onChange={(val) => updateSegment(item.id, { duration: val || 3 })}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Form.Item label="图片 (URL)" style={{ marginBottom: 0 }}>
                      <Input
                        placeholder="可选图片地址"
                        value={item.image}
                        onChange={(e) => updateSegment(item.id, { image: e.target.value })}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            </Card>
          )}
        />
      </div>

      <Divider />
      <Space size="large" style={{ marginBottom: 40 }}>
        <Button
          type="primary"
          size="large"
          icon={<VideoCameraOutlined />}
          onClick={onApply}
        >
          保存并进入预览
        </Button>
        <Button 
          size="large"
          onClick={onBack}
        >
          返回上一步
        </Button>
      </Space>
    </div>
  );
};
