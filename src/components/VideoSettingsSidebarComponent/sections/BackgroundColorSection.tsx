import React, { useState, useEffect } from 'react';
import { Row, Col, Form, Input, Typography, ColorPicker, Switch, Space, Button } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import { useDslSceneBgColorReplace } from '@/hooks/useDslSceneBgColorReplace';
import { useDslItemBgColorReplace } from '@/hooks/useDslItemBgColorReplace';

const { Text } = Typography;

interface BackgroundColorSectionProps {
  sceneBackgroundColor: string;
  setSceneBackgroundColor: (color: string) => void;
  sceneBackgroundColorEnd: string;
  setSceneBackgroundColorEnd: (color: string) => void;
  sceneBackgroundGradientMode: boolean;
  setSceneBackgroundGradientMode: (mode: boolean) => void;
  itemBackgroundColor: string;
  setItemBackgroundColor: (color: string) => void;
  itemBackgroundColorEnd: string;
  setItemBackgroundColorEnd: (color: string) => void;
  itemBackgroundGradientMode: boolean;
  setItemBackgroundGradientMode: (mode: boolean) => void;
  onRefreshColors: () => void;
}

export const BackgroundColorSection: React.FC<BackgroundColorSectionProps> = ({
  sceneBackgroundColor,
  setSceneBackgroundColor,
  sceneBackgroundColorEnd,
  setSceneBackgroundColorEnd,
  sceneBackgroundGradientMode,
  setSceneBackgroundGradientMode,
  itemBackgroundColor,
  setItemBackgroundColor,
  itemBackgroundColorEnd,
  setItemBackgroundColorEnd,
  itemBackgroundGradientMode,
  setItemBackgroundGradientMode,
  onRefreshColors,
}) => {
  const { applySceneBgColorReplace } = useDslSceneBgColorReplace();
  const { applyItemBgColorReplace } = useDslItemBgColorReplace();

  const [localSceneBg, setLocalSceneBg] = useState(sceneBackgroundColor);
  const [localSceneBgEnd, setLocalSceneBgEnd] = useState(sceneBackgroundColorEnd);
  const [localItemBg, setLocalItemBg] = useState(itemBackgroundColor);
  const [localItemBgEnd, setLocalItemBgEnd] = useState(itemBackgroundColorEnd);

  useEffect(() => {
    setLocalSceneBg(sceneBackgroundColor);
  }, [sceneBackgroundColor]);

  useEffect(() => {
    setLocalSceneBgEnd(sceneBackgroundColorEnd);
  }, [sceneBackgroundColorEnd]);

  useEffect(() => {
    setLocalItemBg(itemBackgroundColor);
  }, [itemBackgroundColor]);

  useEffect(() => {
    setLocalItemBgEnd(itemBackgroundColorEnd);
  }, [itemBackgroundColorEnd]);

  const handleApply = () => {
    setSceneBackgroundColor(localSceneBg);
    setSceneBackgroundColorEnd(localSceneBgEnd);
    setItemBackgroundColor(localItemBg);
    setItemBackgroundColorEnd(localItemBgEnd);
    
    // 同时也触发 DSL 替换（如果需要立即生效于 DSL 文本）
    applySceneBgColorReplace(localSceneBg);
    applyItemBgColorReplace(localItemBg);
    
    onRefreshColors();
  };

  return (
    <Form layout="vertical" variant="filled">
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ color: 'var(--text-secondary)' }}>默认场景背景颜色</Text>
            <Space size="small">
              <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>渐变模式</Text>
              <Switch 
                size="small" 
                checked={sceneBackgroundGradientMode} 
                onChange={setSceneBackgroundGradientMode} 
              />
            </Space>
          </div>
          <Form.Item style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <ColorPicker 
                  value={localSceneBg} 
                  onChange={(color) => setLocalSceneBg(color.toHexString())} 
                  showText 
                />
                <Input
                  value={localSceneBg}
                  onChange={(e) => setLocalSceneBg(e.target.value)}
                  placeholder="#ffffff"
                  style={{ flex: 1, color: 'var(--text-primary)', background: 'var(--input-bg)' }}
                />
              </div>
              {sceneBackgroundGradientMode && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ width: 24, textAlign: 'center' }}>
                    <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>至</Text>
                  </div>
                  <ColorPicker value={localSceneBgEnd} onChange={(color) => setLocalSceneBgEnd(color.toHexString())} showText />
                  <Input
                    value={localSceneBgEnd}
                    onChange={(e) => setLocalSceneBgEnd(e.target.value)}
                    placeholder="#ffffff"
                    style={{ flex: 1, color: 'var(--text-primary)', background: 'var(--input-bg)' }}
                  />
                </div>
              )}
            </div>
          </Form.Item>
        </Col>

        <Col span={24}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ color: 'var(--text-secondary)' }}>默认项 (Item) 背景颜色</Text>
            <Space size="small">
              <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>渐变模式</Text>
              <Switch 
                size="small" 
                checked={itemBackgroundGradientMode} 
                onChange={setItemBackgroundGradientMode} 
              />
            </Space>
          </div>
          <Form.Item style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <ColorPicker 
                  value={localItemBg} 
                  onChange={(color) => setLocalItemBg(color.toHexString())} 
                  showText 
                />
                <Input
                  value={localItemBg}
                  onChange={(e) => setLocalItemBg(e.target.value)}
                  placeholder="transparent"
                  style={{ flex: 1, color: 'var(--text-primary)', background: 'var(--input-bg)' }}
                />
              </div>
              {itemBackgroundGradientMode && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ width: 24, textAlign: 'center' }}>
                    <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>至</Text>
                  </div>
                  <ColorPicker value={localItemBgEnd} onChange={(color) => setLocalItemBgEnd(color.toHexString())} showText />
                  <Input
                    value={localItemBgEnd}
                    onChange={(e) => setLocalItemBgEnd(e.target.value)}
                    placeholder="transparent"
                    style={{ flex: 1, color: 'var(--text-primary)', background: 'var(--input-bg)' }}
                  />
                </div>
              )}
            </div>
          </Form.Item>
        </Col>

        <Col span={24}>
          <Button 
            type="primary" 
            icon={<SyncOutlined />} 
            onClick={handleApply}
            block
          >
            更新全部背景颜色
          </Button>
        </Col>
      </Row>
    </Form>
  );
};
