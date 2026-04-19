import React from 'react';
import { Form, Row, Col, Input, Select, Typography, Divider, InputNumber, Radio, Space, Button } from 'antd';
import { VideoConfig, ImageLayoutMode, SceneLayoutType, TitleAlignmentType, VideoCanvasPreset } from '../../../types';
import { CommentSortMode, ReplyOrderMode } from '../../../utils/redditTransformer';
import {
  DEFAULT_VIDEO_CANVAS_PRESETS,
  getActiveVideoCanvasSize,
  getAspectRatioLabel,
  normalizeVideoCanvasConfig,
} from '../../../rendering/videoCanvas';

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
  titleAlignment: TitleAlignmentType;
  setTitleAlignment: (alignment: TitleAlignmentType) => void;
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
  titleAlignment,
  setTitleAlignment,
}) => {
  const canvasConfig = normalizeVideoCanvasConfig(draftConfig.canvas);
  const activePreset = canvasConfig.activePreset;
  const activeCanvas = getActiveVideoCanvasSize(canvasConfig);
  const activeRatioLabel = getAspectRatioLabel(activeCanvas.width, activeCanvas.height);

  const updateCanvasConfig = (nextCanvas: typeof canvasConfig) => {
    setDraftConfig({ ...draftConfig, canvas: nextCanvas });
  };

  const switchCanvasPreset = (preset: VideoCanvasPreset) => {
    updateCanvasConfig({ ...canvasConfig, activePreset: preset });
  };

  const updateActiveCanvasDimension = (key: 'width' | 'height', value: number | null) => {
    if (value == null || Number.isNaN(value)) return;
    updateCanvasConfig({
      ...canvasConfig,
      presets: {
        ...canvasConfig.presets,
        [activePreset]: {
          ...canvasConfig.presets[activePreset],
          [key]: Math.max(240, Math.round(value)),
        },
      },
    });
  };

  const resetActiveCanvasPreset = () => {
    updateCanvasConfig({
      ...canvasConfig,
      presets: {
        ...canvasConfig.presets,
        [activePreset]: { ...DEFAULT_VIDEO_CANVAS_PRESETS[activePreset] },
      },
    });
  };

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
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item id="editor-page-title-alignment-item" label={<Text style={{ color: 'var(--text-secondary)' }}>标题对齐方式</Text>}>
                      <Select<TitleAlignmentType>
                        id="editor-page-title-alignment-select"
                        value={titleAlignment}
                        onChange={setTitleAlignment}
                        style={{ width: '100%' }}
                        styles={{ popup: { root: { background: 'var(--brand-border)' } } }}
                        className="custom-blue-select"
                        options={[
                          { label: '居中对齐', value: 'center' },
                          { label: '靠左对齐', value: 'left' },
                          { label: '靠右对齐', value: 'right' },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Divider style={{ margin: '12px 0', borderColor: 'var(--brand-border)' }} />
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item id="editor-page-canvas-config-item" label={<Text style={{ color: 'var(--text-secondary)' }}>视频画布配置</Text>}>
                      <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        <Radio.Group
                          id="editor-page-canvas-preset-radio"
                          optionType="button"
                          buttonStyle="solid"
                          value={activePreset}
                          onChange={(e) => switchCanvasPreset(e.target.value)}
                        >
                          <Radio.Button value="landscape">横版视频</Radio.Button>
                          <Radio.Button value="portrait">竖版短视频</Radio.Button>
                        </Radio.Group>
                        <Text style={{ color: 'var(--text-secondary)' }}>
                          当前生效比例：{activeRatioLabel}（{activeCanvas.width} x {activeCanvas.height}）
                        </Text>
                        <Row gutter={12}>
                          <Col span={12}>
                            <Form.Item
                              id="editor-page-canvas-width-item"
                              label={<Text style={{ color: 'var(--text-secondary)' }}>当前模式宽度</Text>}
                              style={{ marginBottom: 0 }}
                            >
                              <InputNumber
                                id="editor-page-canvas-width-input"
                                min={240}
                                step={10}
                                value={activeCanvas.width}
                                onChange={(value) => updateActiveCanvasDimension('width', value)}
                                style={{ width: '100%', color: 'var(--text-primary)', background: 'var(--input-bg)' }}
                              />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item
                              id="editor-page-canvas-height-item"
                              label={<Text style={{ color: 'var(--text-secondary)' }}>当前模式高度</Text>}
                              style={{ marginBottom: 0 }}
                            >
                              <InputNumber
                                id="editor-page-canvas-height-input"
                                min={240}
                                step={10}
                                value={activeCanvas.height}
                                onChange={(value) => updateActiveCanvasDimension('height', value)}
                                style={{ width: '100%', color: 'var(--text-primary)', background: 'var(--input-bg)' }}
                              />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Space wrap>
                          <Button id="editor-page-canvas-reset-btn" size="small" onClick={resetActiveCanvasPreset}>
                            恢复当前模式默认尺寸
                          </Button>
                        </Space>
                        <Text style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                          横版和竖版会各自保存一套宽高。切换后，`SceneCard`、本页单画面预览、视频预览、画面预览和导出都会使用当前模式。
                        </Text>
                      </Space>
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
                          { label: '多图轮播', value: 'gallery' },
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
