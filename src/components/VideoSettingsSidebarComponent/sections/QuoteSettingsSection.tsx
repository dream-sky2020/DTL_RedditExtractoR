import React from 'react';
import { Row, Col, Form, InputNumber, Typography, ColorPicker, Space } from 'antd';

const { Text } = Typography;

interface QuoteSettingsSectionProps {
  quoteFontSize: number;
  setQuoteFontSize: (size: number) => void;
  quoteFontColor: string;
  setQuoteFontColor: (color: string) => void;
  maxQuoteDepth: number;
  setMaxQuoteDepth: (depth: number) => void;
  defaultQuoteMaxLimit: number;
  setDefaultQuoteMaxLimit: (limit: number) => void;
  quoteBackgroundColor: string;
  setQuoteBackgroundColor: (color: string) => void;
  quoteBorderColor: string;
  setQuoteBorderColor: (color: string) => void;
}

export const QuoteSettingsSection: React.FC<QuoteSettingsSectionProps> = ({
  quoteFontSize,
  setQuoteFontSize,
  quoteFontColor,
  setQuoteFontColor,
  maxQuoteDepth,
  setMaxQuoteDepth,
  defaultQuoteMaxLimit,
  setDefaultQuoteMaxLimit,
  quoteBackgroundColor,
  setQuoteBackgroundColor,
  quoteBorderColor,
  setQuoteBorderColor,
}) => {
  return (
    <Form layout="vertical" variant="filled">
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label={<Text style={{ color: 'var(--text-secondary)' }}>引用块字号</Text>}>
            <Space.Compact style={{ width: '100%' }}>
              <InputNumber
                min={8}
                max={100}
                value={quoteFontSize}
                onChange={(val) => setQuoteFontSize(val || 12)}
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
          <Form.Item label={<Text style={{ color: 'var(--text-secondary)' }}>引用块颜色</Text>}>
            <ColorPicker
              value={quoteFontColor}
              onChange={(color) => setQuoteFontColor(color.toHexString())}
              showText
              style={{ width: '100%', background: 'var(--input-bg)' }}
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label={<Text style={{ color: 'var(--text-secondary)' }}>引用块背景色</Text>}>
            <ColorPicker
              size="small"
              value={quoteBackgroundColor || 'var(--quote-bg)'}
              onChange={(color) => setQuoteBackgroundColor(color.toHexString())}
              showText
              style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<Text style={{ color: 'var(--text-secondary)' }}>引用块边框色</Text>}>
            <ColorPicker
              size="small"
              value={quoteBorderColor || 'var(--quote-border)'}
              onChange={(color) => setQuoteBorderColor(color.toHexString())}
              showText
              style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label={<Text style={{ color: 'var(--text-secondary)' }}>最大嵌套深度</Text>}>
            <Space.Compact style={{ width: '100%' }}>
              <InputNumber
                min={1}
                max={10}
                value={maxQuoteDepth}
                onChange={(val) => setMaxQuoteDepth(val || 4)}
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
              }}>层</span>
            </Space.Compact>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<Text style={{ color: 'var(--text-secondary)' }}>默认截断字数</Text>}>
            <Space.Compact style={{ width: '100%' }}>
              <InputNumber
                min={10}
                max={1000}
                value={defaultQuoteMaxLimit}
                onChange={(val) => setDefaultQuoteMaxLimit(val || 150)}
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
              }}>字</span>
            </Space.Compact>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
};
