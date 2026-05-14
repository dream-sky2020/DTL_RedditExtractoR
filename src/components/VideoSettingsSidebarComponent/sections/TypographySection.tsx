import React from 'react';
import { Row, Col, Form, InputNumber, Typography, ColorPicker, Button, Space } from 'antd';
import { BoldOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface TypographySectionProps {
  titleFontSize: number;
  setTitleFontSize: (size: number) => void;
  contentFontSize: number;
  setContentFontSize: (size: number) => void;
  quoteFontSize: number;
  setQuoteFontSize: (size: number) => void;
  titleFontColor: string;
  setTitleFontColor: (color: string) => void;
  contentFontColor: string;
  setContentFontColor: (color: string) => void;
  quoteFontColor: string;
  setQuoteFontColor: (color: string) => void;
  titleFontBold: boolean;
  setTitleFontBold: (bold: boolean) => void;
  contentFontBold: boolean;
  setContentFontBold: (bold: boolean) => void;
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
  titleFontColor,
  setTitleFontColor,
  contentFontColor,
  setContentFontColor,
  quoteFontColor,
  setQuoteFontColor,
  titleFontBold,
  setTitleFontBold,
  contentFontBold,
  setContentFontBold,
  maxQuoteDepth,
  setMaxQuoteDepth,
  defaultQuoteMaxLimit,
  setDefaultQuoteMaxLimit,
}) => {
  return (
    <>
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
                addonAfter="px"
              />
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
                addonAfter="px"
              />
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
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label={<Text style={{ color: 'var(--text-secondary)' }}>引用块字号</Text>}>
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
        <Col span={12}>
          <Form.Item label={<Text style={{ color: 'var(--text-secondary)' }}>默认截断字数</Text>}>
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
