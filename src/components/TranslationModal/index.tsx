import React, { useState, useEffect } from 'react';
import { Modal, Input, Typography, Space, Alert, Divider } from 'antd';

const { Text } = Typography;

interface TranslationModalProps {
  open: boolean;
  onCancel: () => void;
  onOk: (value: string) => void;
  chunks: { id: number; original: string }[];
  initialValue: string;
}

export const TranslationModal: React.FC<TranslationModalProps> = ({
  open,
  onCancel,
  onOk,
  chunks,
  initialValue,
}) => {
  const [localValue, setLocalValue] = useState(initialValue);

  // 当弹窗打开或初始值变化时，同步本地状态
  useEffect(() => {
    if (open) {
      setLocalValue(initialValue);
    }
  }, [open, initialValue]);

  return (
    <Modal
      title="批量翻译脚本"
      open={open}
      onCancel={onCancel}
      onOk={() => onOk(localValue)}
      width={800}
      okText="确认并应用翻译"
      cancelText="取消"
      destroyOnClose // 关键：关闭时销毁，防止状态残留
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Alert
          message="翻译操作指南"
          description={
            <div style={{ fontSize: '12px' }}>
              <p>1. 系统已自动提取当前选中场景的可翻译文本段落。</p>
              <p>2. 在下方的编辑框中，请将 <strong>&lt;...&gt;</strong> 内部的文本修改为翻译后的内容。</p>
              <p>3. <strong>请勿修改 [#N=...] 部分</strong>，这是系统识别文本块的标识符。</p>
            </div>
          }
          type="info"
          showIcon
        />

        <div>
          <Text strong>待翻译段落列表：</Text>
          <div 
            style={{ 
              marginTop: 8, 
              maxHeight: 200, 
              overflowY: 'auto', 
              padding: '8px 12px', 
              background: '#f5f5f5', 
              borderRadius: 4,
              border: '1px solid #d9d9d9'
            }}
          >
            {chunks.length > 0 ? (
              chunks.map(chunk => (
                <div key={chunk.id} style={{ marginBottom: 4 }}>
                  <Text type="secondary" style={{ marginRight: 8 }}>#{chunk.id}</Text>
                  <Text>{chunk.original}</Text>
                </div>
              ))
            ) : (
              <Text type="secondary">未提取到可翻译文本。</Text>
            )}
          </div>
        </div>

        <Divider style={{ margin: '8px 0' }} />

        <div>
          <Text strong>翻译输入框：</Text>
          <Input.TextArea
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            rows={12}
            style={{ marginTop: 8, fontFamily: 'monospace', fontSize: '13px' }}
            placeholder="[#1=<翻译后的内容1>]\n[#2=<翻译后的内容2>]..."
          />
        </div>
      </Space>
    </Modal>
  );
};
