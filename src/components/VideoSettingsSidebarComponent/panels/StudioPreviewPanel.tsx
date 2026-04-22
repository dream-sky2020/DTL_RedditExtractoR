import React from 'react';
import { InputNumber, Space, Button, Typography, Radio, Slider } from 'antd';
import { LayoutOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface StudioPreviewPanelProps {
  previewLayoutMode?: 'auto' | 'fixed';
  setPreviewLayoutMode: (mode: 'auto' | 'fixed') => void;
  previewMinWidth?: number;
  setPreviewMinWidth?: (width: number) => void;
  galleryPageSize?: number;
  setGalleryPageSize?: (size: number) => void;
}

export const StudioPreviewPanel: React.FC<StudioPreviewPanelProps> = ({
  previewLayoutMode,
  setPreviewLayoutMode,
  previewMinWidth,
  setPreviewMinWidth,
  galleryPageSize,
  setGalleryPageSize,
}) => {
  return (
    <div
      id="studio-page-view-config-panel"
      style={{
        padding: 12,
        borderRadius: 8,
        border: '1px solid var(--brand-border)',
        background: 'var(--panel-bg-translucent)',
        marginBottom: 16,
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space>
          <LayoutOutlined style={{ color: 'var(--text-primary)' }} />
          <Text strong style={{ color: 'var(--text-primary)' }}>
            图库显示设置
          </Text>
        </Space>
        <div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
            布局模式
          </Text>
          <Radio.Group
            value={previewLayoutMode}
            onChange={(e) => setPreviewLayoutMode(e.target.value)}
            size="small"
            style={{ marginBottom: 12 }}
          >
            <Radio.Button value="auto">自动适配列数</Radio.Button>
            <Radio.Button value="fixed">固定分页数量</Radio.Button>
          </Radio.Group>
        </div>
        {previewLayoutMode === 'auto' && setPreviewMinWidth ? (
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
              每个预览最小宽度（px）
            </Text>
            <Space direction="vertical" style={{ width: '100%' }} size={6}>
              <Slider
                min={180}
                max={520}
                step={10}
                value={previewMinWidth}
                onChange={(value) => setPreviewMinWidth(typeof value === 'number' ? value : value[0])}
              />
              <Space.Compact style={{ width: 120 }}>
                <InputNumber
                  min={180}
                  max={520}
                  value={previewMinWidth}
                  onChange={(value) => setPreviewMinWidth(value ?? 280)}
                  style={{ width: '100%', color: 'var(--text-primary)', background: 'var(--input-bg)' }}
                />
                <Button disabled style={{ background: 'var(--input-bg)', color: 'var(--text-secondary)' }}>
                  px
                </Button>
              </Space.Compact>
            </Space>
          </div>
        ) : (
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
              每页显示数量
            </Text>
            <Radio.Group value={galleryPageSize} onChange={(e) => setGalleryPageSize?.(e.target.value)} size="small">
              <Radio.Button value={12}>12</Radio.Button>
              <Radio.Button value={24}>24</Radio.Button>
              <Radio.Button value={48}>48</Radio.Button>
            </Radio.Group>
          </div>
        )}
      </Space>
    </div>
  );
};
