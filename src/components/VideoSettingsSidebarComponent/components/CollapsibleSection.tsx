import React from 'react';
import { Typography, Button } from 'antd';
import { DownOutlined, UpOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface CollapsibleSectionProps {
  title: string;
  isCollapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
  containerStyle?: React.CSSProperties;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  isCollapsed,
  onToggle,
  children,
  style,
  containerStyle,
}) => {
  return (
    <>
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 12,
          ...style 
        }}
      >
        <Text strong style={{ color: 'var(--text-primary)' }}>{title}</Text>
        <Button
          size="small"
          type="text"
          onClick={onToggle}
          icon={isCollapsed ? <DownOutlined style={{ color: 'var(--text-primary)' }} /> : <UpOutlined style={{ color: 'var(--text-primary)' }} />}
          style={{ color: 'var(--text-primary)' }}
        >
          {isCollapsed ? '展开' : '收起'}
        </Button>
      </div>
      {!isCollapsed && (
        <div 
          style={{ 
            padding: 12, 
            borderRadius: 8, 
            border: '1px solid var(--brand-border)', 
            background: 'var(--panel-bg-translucent)', 
            marginBottom: 16,
            ...containerStyle
          }}
        >
          {children}
        </div>
      )}
    </>
  );
};
