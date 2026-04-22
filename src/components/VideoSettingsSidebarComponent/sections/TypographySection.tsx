import React from 'react';
import { Row, Col, Form, InputNumber, Typography } from 'antd';

const { Text } = Typography;

interface TypographySectionProps {
  titleFontSize: number;
  setTitleFontSize: (size: number) => void;
  contentFontSize: number;
  setContentFontSize: (size: number) => void;
  quoteFontSize: number;
  setQuoteFontSize: (size: number) => void;
  maxQuoteDepth: number;
  setMaxQuoteDepth: (depth: number) => void;
  defaultQuoteMaxLimit: number;
  setDefaultQuoteMaxLimit: (limit: number) => void;
}

export const TypographySection: React.FC<TypographySectionProps> = ({
  titleFontSize,
  setTitleFontSize,
  contentFontSize,
  setContentFontSize,
  quoteFontSize,
  setQuoteFontSize,
  maxQuoteDepth,
  setMaxQuoteDepth,
  defaultQuoteMaxLimit,
  setDefaultQuoteMaxLimit,
}) => {
  return (
    <>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label={<Text style={{ color: 'var(--text-secondary)' }}>标题字体大小</Text>}>
            <InputNumber
              min={12}
              max={200}
              value={titleFontSize}
              onChange={(val) => setTitleFontSize(val || 64)}
              style={{ width: '100%', color: 'var(--text-primary)', background: 'var(--input-bg)' }}
              addonAfter="px"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<Text style={{ color: 'var(--text-secondary)' }}>正文字体大小</Text>}>
            <InputNumber
              min={12}
              max={200}
              value={contentFontSize}
              onChange={(val) => setContentFontSize(val || 36)}
              style={{ width: '100%', color: 'var(--text-primary)', background: 'var(--input-bg)' }}
              addonAfter="px"
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label={<Text style={{ color: 'var(--text-secondary)' }}>引用块字体</Text>}>
            <InputNumber
              min={8}
              max={100}
              value={quoteFontSize}
              onChange={(val) => setQuoteFontSize(val || 12)}
              style={{ width: '100%', color: 'var(--text-primary)', background: 'var(--input-bg)' }}
              addonAfter="px"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<Text style={{ color: 'var(--text-secondary)' }}>最大嵌套深度</Text>}>
            <InputNumber
              min={1}
              max={10}
              value={maxQuoteDepth}
              onChange={(val) => setMaxQuoteDepth(val || 4)}
              style={{ width: '100%', color: 'var(--text-primary)', background: 'var(--input-bg)' }}
              addonAfter="层"
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item label={<Text style={{ color: 'var(--text-secondary)' }}>默认截断字数 (省略号)</Text>}>
            <InputNumber
              min={10}
              max={1000}
              value={defaultQuoteMaxLimit}
              onChange={(val) => setDefaultQuoteMaxLimit(val || 150)}
              style={{ width: '100%', color: 'var(--text-primary)', background: 'var(--input-bg)' }}
              addonAfter="字"
            />
          </Form.Item>
        </Col>
      </Row>
    </>
  );
};
