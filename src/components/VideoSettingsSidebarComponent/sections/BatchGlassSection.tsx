import React from 'react';
import { Button, Space, Typography, InputNumber, Input, ColorPicker } from 'antd';
import {
  BorderInnerOutlined,
  ClearOutlined,
  BgColorsOutlined,
  EyeOutlined,
  BorderOutlined,
  HighlightOutlined
} from '@ant-design/icons';

const { Text } = Typography;

interface BatchGlassSectionProps {
  selectedSceneIds: string[];
  batchGlassBlur: number;
  setBatchGlassBlur: (val: number) => void;
  batchGlassOpacity: number;
  setBatchGlassOpacity: (val: number) => void;
  batchGlassBorder: string;
  setBatchGlassBorder: (val: string) => void;
  batchGlassShadow: string;
  setBatchGlassShadow: (val: string) => void;
  batchGlassDistort: number;
  setBatchGlassDistort: (val: number) => void;
  batchGlassAberration: number;
  setBatchGlassAberration: (val: number) => void;
  batchGlassEdgeGlow: string;
  setBatchGlassEdgeGlow: (val: string) => void;
  batchGlassFresnel: number;
  setBatchGlassFresnel: (val: number) => void;
  batchGlassGrain: number;
  setBatchGlassGrain: (val: number) => void;
  batchGlassRefraction: number;
  setBatchGlassRefraction: (val: number) => void;
  handleEnableGlassForSelectedItems: () => void;
  handleDisableGlassForSelectedItems: () => void;
}

export const BatchGlassSection: React.FC<BatchGlassSectionProps> = ({
  selectedSceneIds,
  batchGlassBlur,
  setBatchGlassBlur,
  batchGlassOpacity,
  setBatchGlassOpacity,
  batchGlassBorder,
  setBatchGlassBorder,
  batchGlassShadow,
  setBatchGlassShadow,
  batchGlassDistort,
  setBatchGlassDistort,
  batchGlassAberration,
  setBatchGlassAberration,
  batchGlassEdgeGlow,
  setBatchGlassEdgeGlow,
  batchGlassFresnel,
  setBatchGlassFresnel,
  batchGlassGrain,
  setBatchGlassGrain,
  batchGlassRefraction,
  setBatchGlassRefraction,
  handleEnableGlassForSelectedItems,
  handleDisableGlassForSelectedItems,
}) => {
  const hasSelected = selectedSceneIds.length > 0;

  const presets = {
    '重度磨砂': { blur: 25, opacity: 0.45, border: 'rgba(255,255,255,0.4)', shadow: '0 20px 50px rgba(0,0,0,0.3)', distort: 5, aberration: 2, fresnel: 0.6, grain: 0.15, refraction: 1.2, edgeGlow: 'rgba(255,255,255,0.7)' },
    '清透玻璃': { blur: 8, opacity: 0.15, border: 'rgba(255,255,255,0.2)', shadow: '0 10px 30px rgba(0,0,0,0.1)', distort: 0, aberration: 0, fresnel: 0.2, grain: 0, refraction: 1.05, edgeGlow: 'rgba(255,255,255,0.4)' },
    '极简白霜': { blur: 15, opacity: 0.3, border: 'rgba(255,255,255,0.5)', shadow: '0 4px 12px rgba(0,0,0,0.1)', distort: 1, aberration: 1, fresnel: 0.4, grain: 0.05, refraction: 1.1, edgeGlow: 'rgba(255,255,255,0.5)' },
    '炫彩霓虹': { blur: 20, opacity: 0.25, border: 'rgba(255,0,255,0.5)', shadow: '0 10px 40px rgba(255,0,255,0.3)', distort: 8, aberration: 5, fresnel: 0.7, grain: 0.1, refraction: 1.3, edgeGlow: 'rgba(0,255,255,0.8)' }
  };

  const applyPreset = (name: keyof typeof presets) => {
    const p = presets[name];
    setBatchGlassBlur(p.blur);
    setBatchGlassOpacity(p.opacity);
    setBatchGlassBorder(p.border);
    setBatchGlassShadow(p.shadow);
    setBatchGlassDistort(p.distort);
    setBatchGlassAberration(p.aberration);
    setBatchGlassFresnel(p.fresnel);
    setBatchGlassGrain(p.grain);
    setBatchGlassRefraction(p.refraction);
    setBatchGlassEdgeGlow(p.edgeGlow);
  };

  const updateShadowColor = (shadow: string, newColor: string) => {
    const colorRegex = /(rgba?\(.*?\)|#[a-fA-F0-9]{3,8}|[a-zA-Z]+)$/;
    if (colorRegex.test(shadow)) {
      return shadow.replace(colorRegex, newColor);
    }
    return shadow + " " + newColor;
  };

  const getShadowColor = (shadow: string) => {
    const colorRegex = /(rgba?\(.*?\)|#[a-fA-F0-9]{3,8}|[a-zA-Z]+)$/;
    const match = shadow.match(colorRegex);
    return match ? match[0] : 'rgba(0,0,0,0.28)';
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="small">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Button
          size="small"
          icon={<BorderInnerOutlined />}
          disabled={!hasSelected}
          onClick={handleEnableGlassForSelectedItems}
          style={{
            backgroundColor: hasSelected ? '#13c2c2' : '#fff',
            color: hasSelected ? '#fff' : '#000',
            borderColor: hasSelected ? '#13c2c2' : '#d9d9d9',
          }}
        >
          item玻璃
        </Button>
        <Button
          size="small"
          icon={<ClearOutlined />}
          disabled={!hasSelected}
          onClick={handleDisableGlassForSelectedItems}
        >
          取消玻璃
        </Button>
      </div>

      {/* 预设按钮区域 */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
        {(Object.keys(presets) as Array<keyof typeof presets>).map(name => (
          <Button 
            key={name} 
            size="small" 
            style={{ fontSize: 10, padding: '0 8px', height: 22 }}
            onClick={() => applyPreset(name)}
          >
            {name}
          </Button>
        ))}
      </div>

      {/* 实时预览区域 */}
      <div style={{ 
        height: 60, 
        width: '100%', 
        borderRadius: 8, 
        background: 'linear-gradient(45deg, #3a1c71, #d76d77, #ffaf7b)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
        border: '1px solid var(--brand-border)'
      }}>
        <div style={{
          padding: '10px 20px',
          borderRadius: 12,
          background: `rgba(255, 255, 255, ${batchGlassOpacity})`,
          backdropFilter: `blur(${batchGlassBlur}px)`,
          border: `1px solid ${batchGlassBorder}`,
          boxShadow: batchGlassShadow,
          color: '#fff',
          fontSize: 12,
          fontWeight: 'bold',
          textShadow: '0 1px 2px rgba(0,0,0,0.3)'
        }}>
          玻璃预览效果
        </div>
      </div>

      <div style={{ padding: '4px 8px', background: 'var(--panel-bg-darker)', borderRadius: 6, border: '1px solid var(--brand-border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Text style={{ fontSize: 10, color: 'var(--text-secondary)' }}><BgColorsOutlined /> 模糊 (Blur)</Text>
            <InputNumber
              size="small"
              min={0}
              max={100}
              value={batchGlassBlur}
              onChange={(val) => setBatchGlassBlur(val ?? 16)}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Text style={{ fontSize: 10, color: 'var(--text-secondary)' }}><EyeOutlined /> 透明度 (Opacity)</Text>
            <InputNumber
              size="small"
              min={0}
              max={1}
              step={0.01}
              value={batchGlassOpacity}
              onChange={(val) => setBatchGlassOpacity(val ?? 0.42)}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, gridColumn: 'span 2' }}>
            <Text style={{ fontSize: 10, color: 'var(--text-secondary)' }}><BorderOutlined /> 边框 (Border)</Text>
            <div style={{ display: 'flex', gap: 4 }}>
              <ColorPicker 
                size="small" 
                value={batchGlassBorder} 
                onChange={(color) => setBatchGlassBorder(color.toRgbString())} 
              />
              <Input
                size="small"
                value={batchGlassBorder}
                onChange={(e) => setBatchGlassBorder(e.target.value)}
                placeholder="rgba(255,255,255,0.35)"
                style={{ flex: 1 }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, gridColumn: 'span 2' }}>
            <Text style={{ fontSize: 10, color: 'var(--text-secondary)' }}><HighlightOutlined /> 阴影 (Shadow)</Text>
            <div style={{ display: 'flex', gap: 4 }}>
              <ColorPicker 
                size="small" 
                value={getShadowColor(batchGlassShadow)} 
                onChange={(color) => setBatchGlassShadow(updateShadowColor(batchGlassShadow, color.toRgbString()))} 
              />
              <Input
                size="small"
                value={batchGlassShadow}
                onChange={(e) => setBatchGlassShadow(e.target.value)}
                placeholder="0 18px 48px rgba(0,0,0,0.28)"
                style={{ flex: 1 }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Text style={{ fontSize: 10, color: 'var(--text-secondary)' }}>畸变 (Distort)</Text>
            <InputNumber
              size="small"
              min={0}
              max={50}
              value={batchGlassDistort}
              onChange={(val) => setBatchGlassDistort(val ?? 0)}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Text style={{ fontSize: 10, color: 'var(--text-secondary)' }}>色散 (Aberration)</Text>
            <InputNumber
              size="small"
              min={0}
              max={15}
              value={batchGlassAberration}
              onChange={(val) => setBatchGlassAberration(val ?? 0)}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Text style={{ fontSize: 10, color: 'var(--text-secondary)' }}>菲涅尔 (Fresnel)</Text>
            <InputNumber
              size="small"
              min={0.1}
              max={0.8}
              step={0.1}
              value={batchGlassFresnel}
              onChange={(val) => setBatchGlassFresnel(val ?? 0.3)}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Text style={{ fontSize: 10, color: 'var(--text-secondary)' }}>磨砂 (Grain)</Text>
            <InputNumber
              size="small"
              min={0}
              max={1}
              step={0.05}
              value={batchGlassGrain}
              onChange={(val) => setBatchGlassGrain(val ?? 0)}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Text style={{ fontSize: 10, color: 'var(--text-secondary)' }}>折射 (Refraction)</Text>
            <InputNumber
              size="small"
              min={1.0}
              max={2.0}
              step={0.05}
              value={batchGlassRefraction}
              onChange={(val) => setBatchGlassRefraction(val ?? 1.0)}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Text style={{ fontSize: 10, color: 'var(--text-secondary)' }}>发光 (EdgeGlow)</Text>
            <div style={{ display: 'flex', gap: 4 }}>
              <ColorPicker 
                size="small" 
                value={batchGlassEdgeGlow} 
                onChange={(color) => setBatchGlassEdgeGlow(color.toRgbString())} 
              />
              <Input
                size="small"
                value={batchGlassEdgeGlow}
                onChange={(e) => setBatchGlassEdgeGlow(e.target.value)}
                placeholder="rgba(255,255,255,0.5)"
                style={{ flex: 1 }}
              />
            </div>
          </div>
        </div>
      </div>
    </Space>
  );
};

