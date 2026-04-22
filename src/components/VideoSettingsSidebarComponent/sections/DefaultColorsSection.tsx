import React from 'react';
import { Row, Col, Form, Input, Typography, ColorPicker } from 'antd';

const { Text } = Typography;

interface DefaultColorsSectionProps {
  sceneBackgroundColor: string;
  setSceneBackgroundColor: (color: string) => void;
  itemBackgroundColor: string;
  setItemBackgroundColor: (color: string) => void;
}

export const DefaultColorsSection: React.FC<DefaultColorsSectionProps> = ({
  sceneBackgroundColor,
  setSceneBackgroundColor,
  itemBackgroundColor,
  setItemBackgroundColor,
}) => {
  return (
    <Row gutter={16}>
      <Col span={24}>
        <Form.Item label={<Text style={{ color: 'var(--text-secondary)' }}>默认场景背景颜色</Text>}>
          <div style={{ display: 'flex', gap: 8 }}>
            <ColorPicker value={sceneBackgroundColor} onChange={(color) => setSceneBackgroundColor(color.toHexString())} showText />
            <Input
              value={sceneBackgroundColor}
              onChange={(e) => setSceneBackgroundColor(e.target.value)}
              placeholder="#ffffff"
              style={{ flex: 1, color: 'var(--text-primary)', background: 'var(--input-bg)' }}
            />
          </div>
        </Form.Item>
      </Col>
      <Col span={24}>
        <Form.Item label={<Text style={{ color: 'var(--text-secondary)' }}>默认项 (Item) 背景颜色</Text>}>
          <div style={{ display: 'flex', gap: 8 }}>
            <ColorPicker value={itemBackgroundColor} onChange={(color) => setItemBackgroundColor(color.toHexString())} showText />
            <Input
              value={itemBackgroundColor}
              onChange={(e) => setItemBackgroundColor(e.target.value)}
              placeholder="transparent"
              style={{ flex: 1, color: 'var(--text-primary)', background: 'var(--input-bg)' }}
            />
          </div>
        </Form.Item>
      </Col>
    </Row>
  );
};
