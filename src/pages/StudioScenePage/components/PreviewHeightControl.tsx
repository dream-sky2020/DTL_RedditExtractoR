import React from 'react';
import { Button, InputNumber, Space, Typography } from 'antd';

const { Text } = Typography;

interface PreviewHeightControlProps {
  previewHeight: number;
  previewMinHeight: number;
  previewMaxHeight: number;
  onPreviewHeightInputChange: (value: number | null) => void;
  onPreviewHeightReset: () => void;
}

export const PreviewHeightControl: React.FC<PreviewHeightControlProps> = ({
  previewHeight,
  previewMinHeight,
  previewMaxHeight,
  onPreviewHeightInputChange,
  onPreviewHeightReset,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: 12,
        top: 12,
        zIndex: 3,
        padding: '6px 8px',
        borderRadius: 8,
        background: 'rgba(0,0,0,0.55)',
        border: '1px solid rgba(255,255,255,0.15)',
      }}
    >
      <Space size={6} align="center">
        <Text style={{ color: '#fff', fontSize: 12 }}>高度</Text>
        <Space.Compact style={{ width: 118 }}>
          <InputNumber
            min={previewMinHeight}
            max={previewMaxHeight}
            value={previewHeight}
            onChange={onPreviewHeightInputChange}
            size="small"
            style={{ width: '100%' }}
          />
          <Button size="small" disabled>px</Button>
        </Space.Compact>
        <Button size="small" onClick={onPreviewHeightReset}>还原</Button>
      </Space>
    </div>
  );
};
