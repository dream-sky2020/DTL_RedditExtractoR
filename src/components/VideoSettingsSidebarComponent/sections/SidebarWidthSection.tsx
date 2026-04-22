import React from 'react';
import { InputNumber, Space, Button, Typography } from 'antd';

const { Text } = Typography;

interface SidebarWidthSectionProps {
  sidebarWidth: number;
  SIDEBAR_MIN_WIDTH: number;
  SIDEBAR_MAX_WIDTH: number;
  updateSidebarWidthByInput: (value: number | null) => void;
  resetSidebarWidthToDefault: () => void;
}

export const SidebarWidthSection: React.FC<SidebarWidthSectionProps> = ({
  sidebarWidth,
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_MAX_WIDTH,
  updateSidebarWidthByInput,
  resetSidebarWidthToDefault,
}) => {
  return (
    <div
      style={{
        marginBottom: 16,
        padding: 12,
        borderRadius: 8,
        border: '1px solid var(--brand-border)',
        background: 'var(--panel-bg-translucent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
      }}
    >
      <Text strong style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
        侧栏宽度
      </Text>
      <Space size="small" align="center">
        <Space.Compact style={{ width: 110 }}>
          <InputNumber
            min={SIDEBAR_MIN_WIDTH}
            max={SIDEBAR_MAX_WIDTH}
            value={sidebarWidth}
            onChange={updateSidebarWidthByInput}
            style={{ width: '100%', color: 'var(--text-primary)', background: 'var(--input-bg)' }}
          />
          <Button disabled style={{ background: 'var(--input-bg)', color: 'var(--text-secondary)' }}>
            px
          </Button>
        </Space.Compact>
        <Button
          onClick={resetSidebarWidthToDefault}
          size="small"
          style={{ color: 'var(--text-light-blue)', borderColor: 'var(--btn-primary-border)', background: 'transparent' }}
        >
          还原
        </Button>
      </Space>
    </div>
  );
};
