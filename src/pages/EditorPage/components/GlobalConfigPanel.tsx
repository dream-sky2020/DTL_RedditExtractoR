import React from 'react';
import { Form, Row, Col, Input, Select, Typography, Divider } from 'antd';
import { VideoConfig, ImageLayoutMode, SceneLayoutType } from '../../../types';
import { CommentSortMode, ReplyOrderMode } from '../../../utils/redditTransformer';

const { Text } = Typography;

interface GlobalConfigPanelProps {
  draftConfig: VideoConfig;
  setDraftConfig: (config: VideoConfig) => void;
  editorSortMode: CommentSortMode;
  setEditorSortMode: (mode: CommentSortMode) => void;
  editorReplyOrderMode: ReplyOrderMode;
  setEditorReplyOrderMode: (mode: ReplyOrderMode) => void;
  imageLayoutMode: ImageLayoutMode;
  setImageLayoutMode: (mode: ImageLayoutMode) => void;
  sceneLayout: SceneLayoutType;
  setSceneLayout: (layout: SceneLayoutType) => void;
}

export const GlobalConfigPanel: React.FC<GlobalConfigPanelProps> = ({
  draftConfig,
  setDraftConfig,
  editorSortMode,
  setEditorSortMode,
  editorReplyOrderMode,
  setEditorReplyOrderMode,
  imageLayoutMode,
  setImageLayoutMode,
  sceneLayout,
  setSceneLayout,
}) => {
  return (
    <div id="editor-page-global-config-panel" style={{ 
      padding: 12, 
      borderRadius: 8, 
      background: 'var(--panel-bg-darker)', 
      border: '1px solid var(--brand-border)',
      marginBottom: 16 
    }}>
      <Form id="editor-page-global-config-form" layout="vertical" variant="filled">
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item id="editor-page-video-title-item" label={<Text style={{ color: 'var(--text-secondary)' }}>视频标题</Text>}>
                      <Input
                        id="editor-page-video-title-input"
                        name="video-title-input"
                        value={draftConfig.title}
                        onChange={(e) => setDraftConfig({ ...draftConfig, title: e.target.value })}
                        style={{ color: 'var(--text-primary)', background: 'var(--input-bg)' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item id="editor-page-subreddit-item" label={<Text style={{ color: 'var(--text-secondary)' }}>Subreddit (r/)</Text>}>
                      <Input
                        id="editor-page-subreddit-input"
                        name="subreddit-input"
                        value={draftConfig.subreddit}
                        onChange={(e) => setDraftConfig({ ...draftConfig, subreddit: e.target.value })}
                        style={{ color: 'var(--text-primary)', background: 'var(--input-bg)' }}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item id="editor-page-sort-mode-item" label={<Text style={{ color: 'var(--text-secondary)' }}>评论排序方式</Text>}>
                      <Select<CommentSortMode>
                        id="editor-page-sort-mode-select"
                        value={editorSortMode}
                        onChange={setEditorSortMode}
                        style={{ width: '100%' }}
                        styles={{ popup: { root: { background: 'var(--brand-border)' } } }}
                        className="custom-blue-select"
                        options={[
                          { label: '最佳排序', value: 'best' },
                          { label: '点赞排序', value: 'top' },
                          { label: '时间排序（最新优先）', value: 'new' },
                          { label: '时间排序（最旧优先）', value: 'old' },
                          { label: '有争议排序', value: 'controversial' },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item id="editor-page-reply-order-item" label={<Text style={{ color: 'var(--text-secondary)' }}>回复关系策略</Text>}>
                      <Select<ReplyOrderMode>
                        id="editor-page-reply-order-select"
                        value={editorReplyOrderMode}
                        onChange={setEditorReplyOrderMode}
                        style={{ width: '100%' }}
                        styles={{ popup: { root: { background: 'var(--brand-border)' } } }}
                        className="custom-blue-select"
                        options={[
                          { label: '保持回复关系（默认）', value: 'preserve' },
                          { label: '全量排序（不考虑回复关系）', value: 'global' },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Divider style={{ margin: '12px 0', borderColor: 'var(--brand-border)' }} />
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item id="editor-page-image-layout-item" label={<Text style={{ color: 'var(--text-secondary)' }}>多图排列模式</Text>}>
                      <Select<ImageLayoutMode>
                        id="editor-page-image-layout-select"
                        value={imageLayoutMode}
                        onChange={setImageLayoutMode}
                        style={{ width: '100%' }}
                        styles={{ popup: { root: { background: 'var(--brand-border)' } } }}
                        className="custom-blue-select"
                        options={[
                          { label: '图集轮播 (Gallery)', value: 'gallery' },
                          { label: '并列排列 (Row)', value: 'row' },
                          { label: '单图竖排 (Single)', value: 'single' },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item id="editor-page-scene-layout-item" label={<Text style={{ color: 'var(--text-secondary)' }}>脚本场景布局</Text>}>
                      <Select<SceneLayoutType>
                        id="editor-page-scene-layout-select"
                        value={sceneLayout}
                        onChange={setSceneLayout}
                        style={{ width: '100%' }}
                        styles={{ popup: { root: { background: 'var(--brand-border)' } } }}
                        className="custom-blue-select"
                        options={[
                          { label: '居中布局 (Center)', value: 'center' },
                          { label: '顶部布局 (Top)', value: 'top' },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                </Row>
      </Form>
    </div>
  );
};
