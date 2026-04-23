import React from 'react';
import { Button, Space, Typography, Tooltip, message } from 'antd';
import { UndoOutlined, RedoOutlined, HistoryOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import { useVideoStore } from '@/store';

const { Text } = Typography;

interface HistoryPanelProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ isCollapsed, setIsCollapsed }) => {
  const { undo, redo, canUndo, canRedo } = useVideoStore();

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Space size="small">
          <HistoryOutlined style={{ color: 'var(--text-primary)' }} />
          <Text strong style={{ color: 'var(--text-primary)' }}>
            操作历史 (撤销/重做)
          </Text>
        </Space>
        <Button
          size="small"
          type="text"
          onClick={() => setIsCollapsed(!isCollapsed)}
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
          }}
        >
          <div style={{ display: 'flex', gap: 12 }}>
            <Tooltip title="撤销 (Ctrl+Z)">
              <Button
                icon={<UndoOutlined />}
                disabled={!canUndo()}
                onClick={() => {
                  undo();
                  message.info('已撤销');
                }}
                style={{ 
                  flex: 1,
                  backgroundColor: canUndo() ? '#fff' : 'rgba(255, 255, 255, 0.1)',
                  color: canUndo() ? '#000' : 'rgba(255, 255, 255, 0.3)',
                  borderColor: canUndo() ? '#fff' : 'transparent'
                }}
              >
                撤销
              </Button>
            </Tooltip>
            <Tooltip title="重做 (Ctrl+Y / Ctrl+Shift+Z)">
              <Button
                icon={<RedoOutlined />}
                disabled={!canRedo()}
                onClick={() => {
                  redo();
                  message.info('已重做');
                }}
                style={{ 
                  flex: 1,
                  backgroundColor: canRedo() ? '#fff' : 'rgba(255, 255, 255, 0.1)',
                  color: canRedo() ? '#000' : 'rgba(255, 255, 255, 0.3)',
                  borderColor: canRedo() ? '#fff' : 'transparent'
                }}
              >
                重做
              </Button>
            </Tooltip>
          </div>
          <div style={{ marginTop: 8, textAlign: 'center' }}>
            <Text style={{ fontSize: 11, color: 'var(--text-light-blue)' }}>
              支持快捷键 Ctrl+Z / Ctrl+Y
            </Text>
          </div>
        </div>
      )}
    </>
  );
};
