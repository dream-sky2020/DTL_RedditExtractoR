import React, { useState, useEffect } from 'react';
import { Row, Col, Form, InputNumber, Typography, ColorPicker, Button, Space } from 'antd';
import { BoldOutlined, SyncOutlined } from '@ant-design/icons';

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
  onRefreshStyles: () => void;
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
  onRefreshStyles,
}) => {
  const [localTitleSize, setLocalTitleSize] = useState(titleFontSize);
  const [localContentSize, setLocalContentSize] = useState(contentFontSize);
  const [localTitleColor, setLocalTitleColor] = useState(titleFontColor);
  const [localContentColor, setLocalContentColor] = useState(contentFontColor);
  const [localTitleBold, setLocalTitleBold] = useState(titleFontBold);
  const [localContentBold, setLocalContentBold] = useState(contentFontBold);

  useEffect(() => {
    setLocalTitleSize(titleFontSize);
  }, [titleFontSize]);

  useEffect(() => {
    setLocalContentSize(contentFontSize);
  }, [contentFontSize]);

  useEffect(() => {
    setLocalTitleColor(titleFontColor);
  }, [titleFontColor]);

  useEffect(() => {
    setLocalContentColor(contentFontColor);
  }, [contentFontColor]);

  useEffect(() => {
    setLocalTitleBold(titleFontBold);
  }, [titleFontBold]);

  useEffect(() => {
    setLocalContentBold(contentFontBold);
  }, [contentFontBold]);

  const handleApply = () => {
    setTitleFontSize(localTitleSize);
    setContentFontSize(localContentSize);
    setTitleFontColor(localTitleColor);
    setContentFontColor(localContentColor);
    setTitleFontBold(localTitleBold);
    setContentFontBold(localContentBold);
    onRefreshStyles();
  };

  return (
    <Form layout="vertical" variant="filled">
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Form.Item label={<Text style={{ color: 'var(--text-secondary)' }}>标题样式 (字号 / 颜色 / 加粗)</Text>} style={{ marginBottom: 0 }}>
            <Space.Compact style={{ width: '100%' }}>
              <InputNumber
                min={12}
                max={200}
                value={localTitleSize}
                onChange={(val) => setLocalTitleSize(val || 64)}
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
                value={localTitleColor}
                onChange={(color) => setLocalTitleColor(color.toHexString())}
                showText
                style={{ width: '45%', background: 'var(--input-bg)' }}
              />
              <Button
                type={localTitleBold ? 'primary' : 'default'}
                icon={<BoldOutlined />}
                onClick={() => setLocalTitleBold(!localTitleBold)}
                style={{ width: '20%' }}
              />
            </Space.Compact>
          </Form.Item>
        </Col>

        <Col span={24}>
          <Form.Item label={<Text style={{ color: 'var(--text-secondary)' }}>正文样式 (字号 / 颜色 / 加粗)</Text>} style={{ marginBottom: 0 }}>
            <Space.Compact style={{ width: '100%' }}>
              <InputNumber
                min={12}
                max={200}
                value={localContentSize}
                onChange={(val) => setLocalContentSize(val || 36)}
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
                value={localContentColor}
                onChange={(color) => setLocalContentColor(color.toHexString())}
                showText
                style={{ width: '45%', background: 'var(--input-bg)' }}
              />
              <Button
                type={localContentBold ? 'primary' : 'default'}
                icon={<BoldOutlined />}
                onClick={() => setLocalContentBold(!localContentBold)}
                style={{ width: '20%' }}
              />
            </Space.Compact>
          </Form.Item>
        </Col>

        <Col span={24}>
          <Button 
            type="primary" 
            icon={<SyncOutlined />} 
            onClick={handleApply}
            block
          >
            更新全部文本样式
          </Button>
        </Col>
      </Row>
    </Form>
  );
};
