import React from 'react';
import { Row, Col, Form, Typography, Space, Radio, InputNumber, Button, Divider } from 'antd';
import { VideoConfig, VideoCanvasPreset } from '../../../types';
import {
  DEFAULT_VIDEO_CANVAS_PRESETS,
  getActiveVideoCanvasSize,
  getAspectRatioLabel,
  normalizeVideoCanvasConfig,
} from '../../../rendering/videoCanvas';

const { Text } = Typography;

interface CanvasConfigSectionProps {
  idPrefix: string;
  draftConfig: VideoConfig;
  setDraftConfig: (config: VideoConfig) => void;
}

export const CanvasConfigSection: React.FC<CanvasConfigSectionProps> = ({
  idPrefix,
  draftConfig,
  setDraftConfig,
}) => {
  const getId = (suffix: string) => `${idPrefix}-${suffix}`;
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
    <Row gutter={16}>
      <Col span={24}>
        <Form.Item id={getId('canvas-config-item')} label={<Text style={{ color: 'var(--text-secondary)' }}>视频画布配置</Text>}>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Radio.Group
              id={getId('canvas-preset-radio')}
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
                  id={getId('canvas-width-item')}
                  label={<Text style={{ color: 'var(--text-secondary)' }}>当前模式宽度</Text>}
                  style={{ marginBottom: 0 }}
                >
                  <InputNumber
                    id={getId('canvas-width-input')}
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
                  id={getId('canvas-height-item')}
                  label={<Text style={{ color: 'var(--text-secondary)' }}>当前模式高度</Text>}
                  style={{ marginBottom: 0 }}
                >
                  <InputNumber
                    id={getId('canvas-height-input')}
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
              <Button id={getId('canvas-reset-btn')} size="small" onClick={resetActiveCanvasPreset}>
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
  );
};
