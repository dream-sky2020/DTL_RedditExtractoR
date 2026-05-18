import React, { useState, useEffect } from 'react';
import { Row, Col, Form, InputNumber, Typography, Radio, Space, Button, Slider } from 'antd';
import { SyncOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface AvatarSettingsSectionProps {
  avatarSize: number;
  setAvatarSize: (size: number) => void;
  avatarShape: 'circle' | 'square';
  setAvatarShape: (shape: 'circle' | 'square') => void;
  avatarOffset: number;
  setAvatarOffset: (offset: number) => void;
  onRefreshAvatars: () => void;
}

export const AvatarSettingsSection: React.FC<AvatarSettingsSectionProps> = ({
  avatarSize,
  setAvatarSize,
  avatarShape,
  setAvatarShape,
  avatarOffset,
  setAvatarOffset,
  onRefreshAvatars,
}) => {
  const [localSize, setLocalSize] = useState(avatarSize);
  const [localShape, setLocalShape] = useState(avatarShape);
  const [localOffset, setLocalOffset] = useState(avatarOffset);

  useEffect(() => {
    setLocalSize(avatarSize);
  }, [avatarSize]);

  useEffect(() => {
    setLocalShape(avatarShape);
  }, [avatarShape]);

  useEffect(() => {
    setLocalOffset(avatarOffset);
  }, [avatarOffset]);

  const handleApply = () => {
    setAvatarSize(localSize);
    setAvatarShape(localShape);
    setAvatarOffset(localOffset);
    onRefreshAvatars();
  };

  return (
    <Form layout="vertical" variant="filled">
      <Row gutter={[16, 8]}>
        <Col span={12}>
          <Form.Item label={<Text style={{ color: 'var(--text-secondary)' }}>头像大小</Text>} style={{ marginBottom: 12 }}>
            <Space.Compact style={{ width: '100%' }}>
              <InputNumber
                min={8}
                max={200}
                value={localSize}
                onChange={(val) => setLocalSize(val || 24)}
                style={{ width: '100%', color: 'var(--text-primary)', background: 'var(--input-bg)' }}
              />
              <span style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                padding: '0 8px', 
                background: 'var(--input-bg)', 
                border: '1px solid #d9d9d9',
                borderLeft: 0,
                fontSize: '12px',
                color: 'rgba(0,0,0,0.45)'
              }}>px</span>
            </Space.Compact>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<Text style={{ color: 'var(--text-secondary)' }}>头像形状</Text>} style={{ marginBottom: 12 }}>
            <Radio.Group 
              value={localShape} 
              onChange={(e) => setLocalShape(e.target.value)}
              style={{ width: '100%' }}
            >
              <Radio.Button value="circle" style={{ width: '50%', textAlign: 'center' }}>圆形</Radio.Button>
              <Radio.Button value="square" style={{ width: '50%', textAlign: 'center' }}>方形</Radio.Button>
            </Radio.Group>
          </Form.Item>
        </Col>
        <Col span={24}>
          <Form.Item label={<Text style={{ color: 'var(--text-secondary)' }}>垂直偏移 (修正偏移问题)</Text>} style={{ marginBottom: 12 }}>
            <Row gutter={12} align="middle">
              <Col flex="auto">
                <Slider
                  min={-50}
                  max={50}
                  value={localOffset}
                  onChange={setLocalOffset}
                />
              </Col>
              <Col flex="60px">
                <InputNumber
                  min={-100}
                  max={100}
                  value={localOffset}
                  onChange={(val) => setLocalOffset(val || 0)}
                  style={{ width: '100%', color: 'var(--text-primary)', background: 'var(--input-bg)' }}
                />
              </Col>
            </Row>
          </Form.Item>
        </Col>
        <Col span={24}>
          <Button 
            type="primary" 
            icon={<SyncOutlined />} 
            onClick={handleApply}
            block
            style={{ marginBottom: 8 }}
          >
            更新全部头像属性
          </Button>
        </Col>
      </Row>
      <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>
        提示：修改这些属性并点击更新后，将同步更新 DSL 中所有的 [avatar] 标签并重新渲染。
      </Text>
    </Form>
  );
};
