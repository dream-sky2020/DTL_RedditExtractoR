import React from 'react';
import { InputNumber, Space, Button, Typography, Radio, Slider, Divider } from 'antd';
import { LayoutOutlined, SelectOutlined, SettingOutlined } from '@ant-design/icons';
import { useSettingsStore } from '@/store';

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
  const { sceneDisplayMode, setSceneDisplayMode } = useSettingsStore();

  return (
    <div
      id="studio-page-view-config-panel"
      style={{
        padding: 16,
        borderRadius: 8,
        border: '1px solid var(--brand-border)',
        background: 'var(--panel-bg-translucent)',
        marginBottom: 16,
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        <Space>
          <SettingOutlined style={{ color: 'var(--text-primary)' }} />
          <Text strong style={{ color: 'var(--text-primary)' }}>
            界面显示设置
          </Text>
        </Space>

        <div>
          <Text style={{ fontSize: 12, display: 'block', marginBottom: 8, color: 'var(--text-primary)', opacity: 0.85 }}>
            列表显示模式
          </Text>
          <Radio.Group
            optionType="button"
            buttonStyle="solid"
            size="small"
            value={sceneDisplayMode}
            onChange={(e) => setSceneDisplayMode(e.target.value)}
          >
            <Radio.Button value="normal">
              <Space>
                <LayoutOutlined />
                常规模式
              </Space>
            </Radio.Button>
            <Radio.Button value="compact">
              <Space>
                <SelectOutlined />
                重排简版
              </Space>
            </Radio.Button>
          </Radio.Group>
          <Text style={{ color: 'var(--text-primary)', opacity: 0.65, fontSize: 11, display: 'block', marginTop: 6 }}>
            简版模式适合在大规模场景下快速移动和排序。
          </Text>
        </div>

        <Divider style={{ margin: '0', opacity: 0.2 }} />

        <div>
          <Text style={{ fontSize: 12, display: 'block', marginBottom: 8, color: 'var(--text-primary)', opacity: 0.85 }}>
            图库布局模式
          </Text>
          <Radio.Group
            value={previewLayoutMode}
            onChange={(e) => setPreviewLayoutMode(e.target.value)}
            size="small"
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="auto">自动适配列数</Radio.Button>
            <Radio.Button value="fixed">固定分页数量</Radio.Button>
          </Radio.Group>
        </div>
        
        {previewLayoutMode === 'auto' && setPreviewMinWidth ? (
          <div>
            <Text style={{ fontSize: 12, display: 'block', marginBottom: 8, color: 'var(--text-primary)', opacity: 0.85 }}>
              预览格最小宽度（px）
            </Text>
            <Space direction="vertical" style={{ width: '100%' }} size={0}>
              <Slider
                min={180}
                max={520}
                step={10}
                value={previewMinWidth}
                onChange={(value) => setPreviewMinWidth(typeof value === 'number' ? value : value[0])}
                style={{ marginBottom: 12 }}
              />
              <Space.Compact style={{ width: '100%' }}>
                <InputNumber
                  min={180}
                  max={520}
                  value={previewMinWidth}
                  onChange={(value) => setPreviewMinWidth(value ?? 280)}
                  style={{ flex: 1, color: '#fff', background: 'var(--input-bg)' }}
                />
                <Button disabled style={{ background: 'var(--input-bg)', color: 'var(--text-secondary)' }}>
                  px
                </Button>
              </Space.Compact>
            </Space>
          </div>
        ) : (
          <div>
            <Text style={{ fontSize: 12, display: 'block', marginBottom: 8, color: 'var(--text-primary)', opacity: 0.85 }}>
              每页显示格数
            </Text>
            <Radio.Group 
              value={galleryPageSize} 
              onChange={(e) => setGalleryPageSize?.(e.target.value)} 
              size="small"
              optionType="button"
              buttonStyle="solid"
            >
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
