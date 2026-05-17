import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { Form, Input, Slider, Row, Col, Typography, Space, Radio, InputNumber, Select, ColorPicker, Button } from 'antd';
import { toast } from '@components/Toast';
import { FileImageOutlined } from '@ant-design/icons';
import { getMetadataForTag, PropertyMetadata, getAllTags } from '../rendering/metadata';
import { EASING_OPTIONS } from '../rendering/animation';

const { Text } = Typography;

interface PropertyConfigContentProps {
  tagName?: string;
  initialValues?: Record<string, any>;
  initialContent?: string;
  onChange: (dsl: string) => void;
}

interface KeyframeFieldConfig {
  key: string;
  label: string;
  placeholder?: string;
}

interface ParsedKeyframe {
  at: string;
  easing?: string;
  values: Record<string, string>;
  extra: string;
}

const KEYFRAME_FIELDS: KeyframeFieldConfig[] = [
  { key: 'opacity', label: '透明度', placeholder: '0-1' },
  { key: 'scale', label: '整体缩放', placeholder: '1' },
  { key: 'scaleX', label: 'X缩放', placeholder: '1' },
  { key: 'scaleY', label: 'Y缩放', placeholder: '1' },
  { key: 'x', label: 'X偏移', placeholder: 'px' },
  { key: 'y', label: 'Y偏移', placeholder: 'px' },
  { key: 'rotate', label: '旋转', placeholder: 'deg' },
];

const splitKeyValue = (input: string): [string, string] | null => {
  const separatorIndex = input.indexOf(':');
  if (separatorIndex === -1) return null;
  const key = input.slice(0, separatorIndex).trim();
  const value = input.slice(separatorIndex + 1).trim();
  if (!key || !value) return null;
  return [key, value];
};

const parseKeyframes = (rawValue: string): ParsedKeyframe[] => {
  if (!rawValue.trim()) {
    return [];
  }

  return rawValue
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .map((part): ParsedKeyframe | null => {
      const frame = splitKeyValue(part);
      if (!frame) return null;

      const [header, styleText] = frame;
      const headerMatch = header.match(/^([+-]?\d*\.?\d+)(?:\s*@\s*(.+))?$/);
      if (!headerMatch) return null;

      const at = headerMatch[1];
      const easing = headerMatch[2]?.trim();
      const values: Record<string, string> = {};
      const extra: string[] = [];
      const knownFields = new Set(KEYFRAME_FIELDS.map(field => field.key));

      styleText
        .split(',')
        .map(pair => pair.trim())
        .filter(Boolean)
        .forEach((pair) => {
          const stylePair = splitKeyValue(pair);
          if (!stylePair) return;

          const [key, value] = stylePair;
          if (knownFields.has(key)) {
            values[key] = value;
          } else {
            extra.push(`${key}: ${value}`);
          }
        });

      return { at, easing, values, extra: extra.join(', ') };
    })
    .filter((frame): frame is ParsedKeyframe => Boolean(frame));
};

const formatKeyframes = (frames: ParsedKeyframe[]): string =>
  frames
    .map((frame) => {
      const props = KEYFRAME_FIELDS
        .map(field => {
          const value = frame.values[field.key];
          return value ? `${field.key}: ${value}` : '';
        })
        .filter(Boolean);

      if (frame.extra.trim()) {
        props.push(...frame.extra.split(',').map(part => part.trim()).filter(Boolean));
      }

      const easingSuffix = frame.easing?.trim() ? ` @${frame.easing.trim()}` : '';
      return frame.at.trim() && props.length > 0 ? `${frame.at.trim()}${easingSuffix}: ${props.join(', ')}` : '';
    })
    .filter(Boolean)
    .join('; ');

const LocalImageInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder }) => {
  const [loading, setLoading] = useState(false);

  const handlePickFile = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/pick_file');
      if (response.data.success && response.data.path) {
        onChange(response.data.path);
        toast.success(`已选择本地图片: ${response.data.path}`);
      }
    } catch (err) {
      console.error('选择文件失败:', err);
      toast.error('无法调用本地文件选择器，请确保 scripts/server.py 正在运行。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Space.Compact style={{ width: '100%' }}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <Button 
        icon={<FileImageOutlined />} 
        onClick={handlePickFile}
        loading={loading}
        title="选择本地图片 (支持任意路径)"
      >
        本地
      </Button>
    </Space.Compact>
  );
};

const KeyframesField: React.FC<{
  value?: string;
  placeholder?: string;
  onChange: (value: string) => void;
}> = ({ value = '', placeholder, onChange }) => {
  const [frames, setFrames] = useState<ParsedKeyframe[]>(() => parseKeyframes(value));
  const lastEmittedValueRef = useRef<string>(value);

  useEffect(() => {
    if (value === lastEmittedValueRef.current) return;
    setFrames(parseKeyframes(value));
    lastEmittedValueRef.current = value;
  }, [value]);

  const commitFrames = (nextFrames: ParsedKeyframe[]) => {
    const nextValue = formatKeyframes(nextFrames);
    setFrames(nextFrames);
    lastEmittedValueRef.current = nextValue;
    onChange(nextValue);
  };

  const updateFrame = (index: number, updater: (frame: ParsedKeyframe) => ParsedKeyframe) => {
    const nextFrames = frames.map((frame, frameIndex) => (
      frameIndex === index ? updater(frame) : frame
    ));
    commitFrames(nextFrames);
  };

  const addFrame = () => {
    const lastFrame = frames[frames.length - 1];
    const lastAt = Number(lastFrame?.at);
    const nextAt = Number.isFinite(lastAt) ? Math.min(1, lastAt + 0.25) : 0;
    commitFrames([...frames, { at: String(nextAt), values: {}, extra: '', easing: 'ease-out' }]);
  };

  const removeFrame = (index: number) => {
    commitFrames(frames.filter((_, frameIndex) => frameIndex !== index));
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      {frames.length === 0 && (
        <div
          style={{
            padding: 12,
            border: '1px dashed #d9d9d9',
            borderRadius: 8,
            background: '#fafafa',
          }}
        >
          <Text type="secondary" style={{ fontSize: 12 }}>
            当前没有关键帧动画。点击“添加关键帧”后才会生成 kf 属性。
          </Text>
        </div>
      )}
      {frames.map((frame, index) => (
        <div
          key={`${frame.at}-${index}`}
          style={{
            padding: 12,
            border: '1px solid #d9d9d9',
            borderRadius: 8,
            background: '#fafafa',
          }}
        >
          <Row gutter={[8, 8]} align="middle">
            <Col span={6}>
              <Text type="secondary" style={{ fontSize: 12 }}>时间点</Text>
              <InputNumber
                value={Number.isFinite(Number(frame.at)) ? Number(frame.at) : undefined}
                min={0}
                step={0.05}
                style={{ width: '100%' }}
                onChange={(nextValue) => updateFrame(index, current => ({
                  ...current,
                  at: nextValue == null ? '' : String(nextValue),
                }))}
              />
            </Col>
            <Col span={12}>
              <Text type="secondary" style={{ fontSize: 12 }}>段缓动</Text>
              <Select
                showSearch
                allowClear
                value={frame.easing}
                placeholder="继承整体 easing"
                options={EASING_OPTIONS}
                style={{ width: '100%' }}
                onChange={(nextValue) => updateFrame(index, current => ({
                  ...current,
                  easing: nextValue,
                }))}
              />
            </Col>
            <Col span={6}>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button size="small" onClick={() => removeFrame(index)}>
                  删除帧
                </Button>
              </Space>
            </Col>
            <Col span={24}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                自定义缓动（可填 cubic-bezier(0.22, 1, 0.36, 1)）
              </Text>
              <Input
                value={frame.easing || ''}
                placeholder="留空则使用整体 easing"
                onChange={(event) => updateFrame(index, current => ({
                  ...current,
                  easing: event.target.value,
                }))}
              />
            </Col>
            {KEYFRAME_FIELDS.map(field => (
              <Col span={8} key={field.key}>
                <Text type="secondary" style={{ fontSize: 12 }}>{field.label}</Text>
                <Input
                  value={frame.values[field.key] || ''}
                  placeholder={field.placeholder}
                  onChange={(event) => updateFrame(index, current => ({
                    ...current,
                    values: {
                      ...current.values,
                      [field.key]: event.target.value,
                    },
                  }))}
                />
              </Col>
            ))}
            <Col span={24}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                扩展属性（逗号分隔，例如 width: 100%, filter: blur(4px)）
              </Text>
              <Input
                value={frame.extra}
                placeholder="未来新增属性可先写在这里"
                onChange={(event) => updateFrame(index, current => ({
                  ...current,
                  extra: event.target.value,
                }))}
              />
            </Col>
          </Row>
        </div>
      ))}
      <Button block onClick={addFrame}>
        添加关键帧
      </Button>
      <Input.TextArea
        value={formatKeyframes(frames)}
        onChange={(event) => {
          const nextValue = event.target.value;
          const nextFrames = nextValue.trim() ? parseKeyframes(nextValue) : [];
          setFrames(nextFrames);
          lastEmittedValueRef.current = nextValue;
          onChange(nextValue);
        }}
        placeholder={placeholder}
        rows={2}
      />
      <Text type="secondary" style={{ fontSize: 11 }}>
        生成格式：0: opacity: 0, y: 20; 1 @ease-out: opacity: 1, y: 0。每帧的 @缓动 控制上一帧到当前帧这一段的速度曲线。
      </Text>
    </Space>
  );
};

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
        if (prop.name === 'bgImage') {
          return (
            <LocalImageInput
              value={value}
              onChange={nextValue => handleValueChange(prop.name, nextValue)}
              placeholder={prop.placeholder}
            />
          );
        }
        return (
          <Input 
            value={value} 
            onChange={e => handleValueChange(prop.name, e.target.value)} 
            placeholder={prop.placeholder}
          />
        );
      case 'keyframes':
        return (
          <KeyframesField
            value={value}
            placeholder={prop.placeholder}
            onChange={nextValue => handleValueChange(prop.name, nextValue)}
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
                  <LocalImageInput 
                    value={content} 
                    onChange={val => setContent(val)} 
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
                <Col span={prop.type === 'css' || prop.type === 'string' || prop.type === 'keyframes' ? 24 : 12} key={prop.name}>
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
