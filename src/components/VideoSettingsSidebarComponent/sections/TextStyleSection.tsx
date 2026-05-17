import React from 'react';
import { Row, Col, Form, InputNumber, Typography, ColorPicker, Button, Space } from 'antd';
import { BoldOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface TextStyleSectionProps {
  titleFontSize: number;
  setTitleFontSize: (size: number) => void;
  contentFontSize: number;
  setContentFontSize: (size: number) => void;
  titleFontColor: string;
  setTitleFontColor: (color: string) => void;
  contentFontColor: string;
  setContentFontColor: (color: string) => void;
  titleFontBold: boolean;
  setTitleFontBold: (bold: boolean) => void;
  contentFontBold: boolean;
  setContentFontBold: (bold: boolean) => void;
}

export const TextStyleSection: React.FC<TextStyleSectionProps> = ({
  titleFontSize,
  setTitleFontSize,
  contentFontSize,
  setContentFontSize,
  titleFontColor,
  setTitleFontColor,
  contentFontColor,
  setContentFontColor,
  titleFontBold,
  setTitleFontBold,
  contentFontBold,
  setContentFontBold,
}) => {
  return (
    <Form layout="vertical" variant="filled">
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item label={<Text style={{ color: 'var(--text-secondary)' }}>标题样式 (字号 / 颜色 / 加粗)</Text>}>
            <Space.Compact style={{ width: '100%' }}>
              <InputNumber
                min={12}
                max={200}
                value={titleFontSize}
                onChange={(val) => setTitleFontSize(val || 64)}
                style={{ width: '35%', color: 'var(--text-primary)', background: 'var(--input-bg)' }}
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
              <ColorPicker
                value={titleFontColor}
                onChange={(color) => setTitleFontColor(color.toHexString())}
                showText
                style={{ width: '45%', background: 'var(--input-bg)' }}
              />
              <Button
                type={titleFontBold ? 'primary' : 'default'}
                icon={<BoldOutlined />}
                onClick={() => setTitleFontBold(!titleFontBold)}
                style={{ width: '20%' }}
              />
            </Space.Compact>
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item label={<Text style={{ color: 'var(--text-secondary)' }}>正文样式 (字号 / 颜色 / 加粗)</Text>}>
            <Space.Compact style={{ width: '100%' }}>
              <InputNumber
                min={12}
                max={200}
                value={contentFontSize}
                onChange={(val) => setContentFontSize(val || 36)}
                style={{ width: '35%', color: 'var(--text-primary)', background: 'var(--input-bg)' }}
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
              <ColorPicker
                value={contentFontColor}
                onChange={(color) => setContentFontColor(color.toHexString())}
                showText
                style={{ width: '45%', background: 'var(--input-bg)' }}
              />
              <Button
                type={contentFontBold ? 'primary' : 'default'}
                icon={<BoldOutlined />}
                onClick={() => setContentFontBold(!contentFontBold)}
                style={{ width: '20%' }}
              />
            </Space.Compact>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
};
