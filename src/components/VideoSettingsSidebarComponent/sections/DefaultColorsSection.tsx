import React from 'react';
import { Row, Col, Form, Input, Typography, ColorPicker, Switch, Space } from 'antd';

const { Text } = Typography;

interface DefaultColorsSectionProps {
  sceneBackgroundColor: string;
  setSceneBackgroundColor: (color: string) => void;
  sceneBackgroundColorEnd: string;
  setSceneBackgroundColorEnd: (color: string) => void;
  sceneBackgroundGradientMode: boolean;
  setSceneBackgroundGradientMode: (mode: boolean) => void;
  itemBackgroundColor: string;
  setItemBackgroundColor: (color: string) => void;
  itemBackgroundColorEnd: string;
  setItemBackgroundColorEnd: (color: string) => void;
  itemBackgroundGradientMode: boolean;
  setItemBackgroundGradientMode: (mode: boolean) => void;
}

export const DefaultColorsSection: React.FC<DefaultColorsSectionProps> = ({
  sceneBackgroundColor,
  setSceneBackgroundColor,
  sceneBackgroundColorEnd,
  setSceneBackgroundColorEnd,
  sceneBackgroundGradientMode,
  setSceneBackgroundGradientMode,
  itemBackgroundColor,
  setItemBackgroundColor,
  itemBackgroundColorEnd,
  setItemBackgroundColorEnd,
  itemBackgroundGradientMode,
  setItemBackgroundGradientMode,
}) => {
  return (
    <Row gutter={[16, 16]}>
      <Col span={24}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ color: 'var(--text-secondary)' }}>默认场景背景颜色</Text>
          <Space size="small">
            <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>渐变模式</Text>
            <Switch 
              size="small" 
              checked={sceneBackgroundGradientMode} 
              onChange={setSceneBackgroundGradientMode} 
            />
          </Space>
        </div>
        <Form.Item style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <ColorPicker value={sceneBackgroundColor} onChange={(color) => setSceneBackgroundColor(color.toHexString())} showText />
              <Input
                value={sceneBackgroundColor}
                onChange={(e) => setSceneBackgroundColor(e.target.value)}
                placeholder="#ffffff"
                style={{ flex: 1, color: 'var(--text-primary)', background: 'var(--input-bg)' }}
              />
            </div>
            {sceneBackgroundGradientMode && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ width: 24, textAlign: 'center' }}>
                  <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>至</Text>
                </div>
                <ColorPicker value={sceneBackgroundColorEnd} onChange={(color) => setSceneBackgroundColorEnd(color.toHexString())} showText />
                <Input
                  value={sceneBackgroundColorEnd}
                  onChange={(e) => setSceneBackgroundColorEnd(e.target.value)}
                  placeholder="#ffffff"
                  style={{ flex: 1, color: 'var(--text-primary)', background: 'var(--input-bg)' }}
                />
              </div>
            )}
          </div>
        </Form.Item>
      </Col>

      <Col span={24}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ color: 'var(--text-secondary)' }}>默认项 (Item) 背景颜色</Text>
          <Space size="small">
            <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>渐变模式</Text>
            <Switch 
              size="small" 
              checked={itemBackgroundGradientMode} 
              onChange={setItemBackgroundGradientMode} 
            />
          </Space>
        </div>
        <Form.Item style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <ColorPicker value={itemBackgroundColor} onChange={(color) => setItemBackgroundColor(color.toHexString())} showText />
              <Input
                value={itemBackgroundColor}
                onChange={(e) => setItemBackgroundColor(e.target.value)}
                placeholder="transparent"
                style={{ flex: 1, color: 'var(--text-primary)', background: 'var(--input-bg)' }}
              />
            </div>
            {itemBackgroundGradientMode && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ width: 24, textAlign: 'center' }}>
                  <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>至</Text>
                </div>
                <ColorPicker value={itemBackgroundColorEnd} onChange={(color) => setItemBackgroundColorEnd(color.toHexString())} showText />
                <Input
                  value={itemBackgroundColorEnd}
                  onChange={(e) => setItemBackgroundColorEnd(e.target.value)}
                  placeholder="transparent"
                  style={{ flex: 1, color: 'var(--text-primary)', background: 'var(--input-bg)' }}
                />
              </div>
            )}
          </div>
        </Form.Item>
      </Col>
    </Row>
  );
};
