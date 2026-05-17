import React from 'react';
import { Button, Space, Typography, InputNumber, Input } from 'antd';
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
            <Input
              size="small"
              value={batchGlassBorder}
              onChange={(e) => setBatchGlassBorder(e.target.value)}
              placeholder="rgba(255,255,255,0.35)"
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, gridColumn: 'span 2' }}>
            <Text style={{ fontSize: 10, color: 'var(--text-secondary)' }}><HighlightOutlined /> 阴影 (Shadow)</Text>
            <Input
              size="small"
              value={batchGlassShadow}
              onChange={(e) => setBatchGlassShadow(e.target.value)}
              placeholder="0 18px 48px rgba(0,0,0,0.28)"
            />
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
            <Input
              size="small"
              value={batchGlassEdgeGlow}
              onChange={(e) => setBatchGlassEdgeGlow(e.target.value)}
              placeholder="rgba(255,255,255,0.5)"
            />
          </div>
        </div>
      </div>
    </Space>
  );
};
