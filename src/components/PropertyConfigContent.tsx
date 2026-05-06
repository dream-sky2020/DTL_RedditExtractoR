import React, { useState, useEffect, useMemo } from 'react';
import { Form, Input, Slider, Row, Col, Typography, Space, Radio, InputNumber, Select, ColorPicker, Button } from 'antd';
import { getMetadataForTag, PropertyMetadata, getAllTags } from '../rendering/metadata';

const { Text } = Typography;

interface PropertyConfigContentProps {
  tagName?: string;
  initialValues?: Record<string, any>;
  initialContent?: string;
  onChange: (dsl: string) => void;
}

export const PropertyConfigContent: React.FC<PropertyConfigContentProps> = ({
  tagName: initialTagName,
  initialValues = {},
  initialContent = '',
  onChange,
}) => {
  const [selectedTagName, setSelectedTagName] = useState<string | undefined>(initialTagName);
  const metadata = useMemo(() => selectedTagName ? getMetadataForTag(selectedTagName) : undefined, [selectedTagName]);
  const [values, setValues] = useState<Record<string, any>>(initialValues);
  const [content, setContent] = useState(initialContent);

  // 当标签改变时，重置属性值（除非是初始加载）
  useEffect(() => {
    if (selectedTagName && selectedTagName !== initialTagName) {
      setValues({});
      setContent('');
    }
  }, [selectedTagName, initialTagName]);

  useEffect(() => {
    if (!metadata) {
      onChange(''); // 没有选择标签时，不生成 DSL
      return;
    }

    const attrs: string[] = [];
    metadata.properties.forEach(prop => {
      const val = values[prop.name];
      if (val !== undefined && val !== null && val !== '') {
        if (prop.type === 'boolean') {
          if (val === true) attrs.push(prop.name);
        } else if (typeof val === 'string' && (val.includes(' ') || val.includes('"'))) {
          attrs.push(`${prop.name}="${val.replace(/"/g, '&quot;')}"`);
        } else {
          attrs.push(`${prop.name}=${val}`);
        }
      }
    });

    const attrStr = attrs.length > 0 ? ` ${attrs.join(' ')}` : '';
    let generatedDsl = '';
    
    if (metadata.syntax === 'angle') {
      if (metadata.hasContent) {
        generatedDsl = `<${metadata.tagName}${attrStr}>${content}</${metadata.tagName}>`;
      } else {
        generatedDsl = `<${metadata.tagName}${attrStr} />`;
      }
    } else {
      if (metadata.hasContent) {
        generatedDsl = `[${metadata.tagName}${attrStr}]${content}[/${metadata.tagName}]`;
      } else {
        generatedDsl = `[${metadata.tagName}${attrStr}]`;
      }
    }
    
    onChange(generatedDsl);
  }, [values, content, metadata, onChange]);

  if (!selectedTagName) {
    const allTags = getAllTags();
    return (
      <div style={{ marginTop: 20, textAlign: 'center', padding: '40px 0' }}>
        <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 20 }}>请选择要插入或配置的标签类型</Text>
        <Space wrap size={16} style={{ justifyContent: 'center' }}>
          {allTags.map((tag: string) => (
            <Button 
              key={tag} 
              size="large" 
              onClick={() => setSelectedTagName(tag)}
              style={{ width: 120, height: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
            >
              <Text strong>{tag.toUpperCase()}</Text>
              <Text type="secondary" style={{ fontSize: 10 }}>{getMetadataForTag(tag)?.syntax === 'angle' ? '<...>' : '[...]'}</Text>
            </Button>
          ))}
        </Space>
      </div>
    );
  }

  if (!metadata) {
    return (
      <div style={{ marginTop: 20 }}>
        <Button onClick={() => setSelectedTagName(undefined)}>返回选择标签</Button>
        <div style={{ marginTop: 20 }}>未找到标签 "{selectedTagName}" 的元数据定义。</div>
      </div>
    );
  }

  const handleValueChange = (name: string, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
  };

  const renderField = (prop: PropertyMetadata) => {
    const value = values[prop.name] ?? prop.defaultValue;

    switch (prop.type) {
      case 'string':
      case 'css':
        return (
          <Input 
            value={value} 
            onChange={e => handleValueChange(prop.name, e.target.value)} 
            placeholder={prop.placeholder}
          />
        );
      case 'number':
        return (
          <InputNumber 
            value={value} 
            onChange={val => handleValueChange(prop.name, val)} 
            min={prop.min} 
            max={prop.max} 
            step={prop.step}
            style={{ width: '100%' }}
          />
        );
      case 'boolean':
        return (
          <Radio.Group 
            value={!!value} 
            onChange={e => handleValueChange(prop.name, e.target.value)}
          >
            <Radio value={true}>是</Radio>
            <Radio value={false}>否</Radio>
          </Radio.Group>
        );
      case 'select':
        return (
          <Select 
            value={value} 
            onChange={val => handleValueChange(prop.name, val)}
            options={prop.options}
            style={{ width: '100%' }}
          />
        );
      case 'color':
        return (
          <ColorPicker 
            value={value} 
            onChange={(_, hex) => handleValueChange(prop.name, hex)}
            showText
          />
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ marginTop: 20 }}>
      <Row gutter={24}>
        <Col span={12}>
          <Form layout="vertical">
            {metadata.hasContent && (
              <Form.Item label={metadata.contentLabel || '内容'}>
                {selectedTagName === 'image' ? (
                  <Input 
                    value={content} 
                    onChange={e => setContent(e.target.value)} 
                    placeholder={metadata.contentPlaceholder || '请输入内容...'}
                  />
                ) : (
                  <Input.TextArea 
                    value={content} 
                    onChange={e => setContent(e.target.value)} 
                    placeholder={metadata.contentPlaceholder || '请输入内容...'}
                    rows={4}
                  />
                )}
              </Form.Item>
            )}
            
            <Row gutter={12}>
              {metadata.properties.map(prop => (
                <Col span={prop.type === 'css' || prop.type === 'string' ? 24 : 12} key={prop.name}>
                  <Form.Item label={`${prop.label} (${prop.name})`}>
                    {renderField(prop)}
                  </Form.Item>
                </Col>
              ))}
            </Row>
          </Form>
        </Col>

        <Col span={12}>
          <div style={{ textAlign: 'center' }}>
            <Text strong>实时效果预览</Text>
            
            {/* 通用预览逻辑：DSL 代码 */}
            <div style={{ marginTop: 20, textAlign: 'left', background: '#fafafa', padding: 12, borderRadius: 8 }}>
              <Text strong style={{ fontSize: 12 }}>预览 DSL 代码：</Text>
              <pre style={{ 
                fontFamily: 'monospace', 
                fontSize: 12, 
                marginTop: 4, 
                color: '#c41d7f', 
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                margin: 0,
                padding: 0,
                background: 'transparent',
                border: 'none'
              }}>
                {(() => {
                  const attrs: string[] = [];
                  metadata.properties.forEach(prop => {
                    const val = values[prop.name];
                    if (val !== undefined && val !== null && val !== '' && val !== prop.defaultValue) {
                      if (prop.type === 'boolean') {
                        if (val === true) attrs.push(prop.name);
                      } else if (typeof val === 'string' && (val.includes(' ') || val.includes('"'))) {
                        attrs.push(`${prop.name}="${val.replace(/"/g, '&quot;')}"`);
                      } else {
                        attrs.push(`${prop.name}=${val}`);
                      }
                    }
                  });

                  const attrStr = attrs.length > 0 ? ` ${attrs.join(' ')}` : '';
                  if (metadata.syntax === 'angle') {
                    if (metadata.hasContent) {
                      return `<${metadata.tagName}${attrStr}>\n  ${content}\n</${metadata.tagName}>`;
                    } else {
                      return `<${metadata.tagName}${attrStr} />`;
                    }
                  } else {
                    if (metadata.hasContent) {
                      return `[${metadata.tagName}${attrStr}]${content}[/${metadata.tagName}]`;
                    } else {
                      return `[${metadata.tagName}${attrStr}]`;
                    }
                  }
                })()}
              </pre>
            </div>
            
            <div style={{ marginTop: 12, textAlign: 'left' }}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                提示：修改左侧属性，上方 DSL 代码会自动更新。点击“确定”将其插入编辑器。
              </Text>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};
