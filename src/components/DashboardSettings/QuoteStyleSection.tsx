import React from 'react';
import { Row, Col, Form, ColorPicker, Typography } from 'antd';

const { Text } = Typography;

interface QuoteStyleSectionProps {
  quoteBackgroundColor: string;
  setQuoteBackgroundColor: (color: string) => void;
  quoteBorderColor: string;
  setQuoteBorderColor: (color: string) => void;
}

export const QuoteStyleSection: React.FC<QuoteStyleSectionProps> = ({
  quoteBackgroundColor,
  setQuoteBackgroundColor,
  quoteBorderColor,
  setQuoteBorderColor,
}) => {
  return (
    <>
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
    </>
  );
};
