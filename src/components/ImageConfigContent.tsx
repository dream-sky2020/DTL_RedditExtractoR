import React, { useState, useEffect } from 'react';
import { Form, Input, Slider, Row, Col, Typography, Space, Radio, InputNumber } from 'antd';

const { Text } = Typography;

interface ImageConfigContentProps {
  initialUrl?: string;
  initialValues?: {
    width?: number | string;
    maxHeight?: number;
    mode?: 'contain' | 'cover' | 'fill';
    pos?: string;
    marginTop?: number;
    marginBottom?: number;
  };
  onChange: (dsl: string) => void;
}

export const ImageConfigContent: React.FC<ImageConfigContentProps> = ({
  initialUrl = '',
  initialValues,
  onChange,
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [width, setWidth] = useState<number | string>(initialValues?.width ?? '100%');
  const [maxHeight, setMaxHeight] = useState<number>(initialValues?.maxHeight ?? 500);
  const [mode, setMode] = useState<'contain' | 'cover' | 'fill'>(initialValues?.mode ?? 'contain');
  
  const [posX, setPosX] = useState(() => {
    if (initialValues?.pos) {
      const parts = initialValues.pos.split(' ');
      if (parts[0].endsWith('%')) return parseInt(parts[0]);
    }
    return 50;
  });
  
  const [posY, setPosY] = useState(() => {
    if (initialValues?.pos) {
      const parts = initialValues.pos.split(' ');
      const yPart = parts[1] || parts[0];
      if (yPart.endsWith('%')) return parseInt(yPart);
    }
    return 50;
  });

  const [marginTop, setMarginTop] = useState(initialValues?.marginTop ?? 12);
  const [marginBottom, setMarginBottom] = useState(initialValues?.marginBottom ?? 12);

  // 实时生成 DSL 并回传给父级（Dialogs）
  useEffect(() => {
    let attrs = [];
    if (width !== '100%') attrs.push(`w=${width}`);
    if (maxHeight !== 500) attrs.push(`mh=${maxHeight}`);
    if (mode !== 'contain') attrs.push(`mode=${mode}`);
    if (mode === 'cover' && (posX !== 50 || posY !== 50)) {
      attrs.push(`pos="${posX}% ${posY}%"`);
    }
    if (marginTop !== 12) attrs.push(`mt=${marginTop}`);
    if (marginBottom !== 12) attrs.push(`mb=${marginBottom}`);

    const attrStr = attrs.length > 0 ? ` ${attrs.join(' ')}` : '';
    const generatedDsl = `[image${attrStr}]${url || 'URL'}[/image]`;
    onChange(generatedDsl);
  }, [url, width, maxHeight, mode, posX, posY, marginTop, marginBottom, onChange]);

  const previewStyle: React.CSSProperties = {
    width: '100%',
    height: '300px',
    backgroundColor: '#000',
    borderRadius: '8px',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 16,
    border: '1px solid var(--brand-border)',
  };

  const imgStyle: React.CSSProperties = {
    width: width === '100%' ? '100%' : (typeof width === 'number' ? `${width}px` : width),
    height: '100%',
    objectFit: mode,
    objectPosition: `${posX}% ${posY}%`,
  };

  return (
    <div style={{ marginTop: 20 }}>
      <Row gutter={24}>
        <Col span={10}>
          <Form layout="vertical">
            <Form.Item label="图片 URL">
              <Input 
                value={url} 
                onChange={(e) => setUrl(e.target.value)} 
                placeholder="粘贴图片链接..."
              />
            </Form.Item>

            <Row gutter={12}>
              <Col span={12}>
                <Form.Item label="最大高度 (mh)">
                  <Slider 
                    min={50} 
                    max={1000} 
                    value={maxHeight} 
                    onChange={setMaxHeight} 
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="宽度 (w)">
                  <Radio.Group 
                    value={width === '100%' ? 'full' : 'custom'} 
                    onChange={(e) => setWidth(e.target.value === 'full' ? '100%' : 400)}
                    size="small"
                  >
                    <Radio.Button value="full">100%</Radio.Button>
                    <Radio.Button value="custom">固定</Radio.Button>
                  </Radio.Group>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="填充模式 (mode)">
              <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)} buttonStyle="solid">
                <Radio.Button value="contain">Contain</Radio.Button>
                <Radio.Button value="cover">Cover</Radio.Button>
                <Radio.Button value="fill">Fill</Radio.Button>
              </Radio.Group>
            </Form.Item>

            {mode === 'cover' && (
              <div style={{ padding: '8px', background: '#f5f5f5', borderRadius: '4px', marginBottom: 16 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>裁剪焦点偏移 (pos)</Text>
                <Row gutter={12}>
                  <Col span={12}>
                    <Text style={{ fontSize: 11 }}>水平 {posX}%</Text>
                    <Slider min={0} max={100} value={posX} onChange={setPosX} />
                  </Col>
                  <Col span={12}>
                    <Text style={{ fontSize: 11 }}>垂直 {posY}%</Text>
                    <Slider min={0} max={100} value={posY} onChange={setPosY} />
                  </Col>
                </Row>
              </div>
            )}

            <Row gutter={12}>
              <Col span={12}>
                <Form.Item label="上边距 (mt)">
                  <InputNumber value={marginTop} onChange={(val: number | null) => setMarginTop(val || 0)} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="下边距 (mb)">
                  <InputNumber value={marginBottom} onChange={(val: number | null) => setMarginBottom(val || 0)} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Col>

        <Col span={14}>
          <div style={{ textAlign: 'center' }}>
            <Text strong>实时效果预览</Text>
            <div style={previewStyle}>
              {url ? (
                <img src={url} alt="Preview" style={imgStyle} referrerPolicy="no-referrer" />
              ) : (
                <Text type="secondary">请先输入图片 URL</Text>
              )}
            </div>
            <div style={{ marginTop: 20, textAlign: 'left', background: '#fafafa', padding: 12, borderRadius: 8 }}>
              <Text strong style={{ fontSize: 12 }}>预览 DSL 代码：</Text>
              <div style={{ fontFamily: 'monospace', fontSize: 12, marginTop: 4, color: '#c41d7f', wordBreak: 'break-all' }}>
                {`[image${width !== '100%' ? ` w=${width}` : ''}${maxHeight !== 500 ? ` mh=${maxHeight}` : ''}${mode !== 'contain' ? ` mode=${mode}` : ''}${mode === 'cover' && (posX !== 50 || posY !== 50) ? ` pos="${posX}% ${posY}%"` : ''}${marginTop !== 12 ? ` mt=${marginTop}` : ''}${marginBottom !== 12 ? ` mb=${marginBottom}` : ''}]${url || 'URL'}[/image]`}
              </div>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};
