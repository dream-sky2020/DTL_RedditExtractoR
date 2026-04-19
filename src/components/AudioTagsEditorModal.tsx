import React, { useEffect, useState } from 'react';
import { Modal, Select, Space, Typography } from 'antd';

const { Text } = Typography;

interface AudioTagsEditorModalProps {
  open: boolean;
  audioName: string;
  initialTags: string[];
  onCancel: () => void;
  onSave: (tags: string[]) => void | Promise<void>;
}

export const AudioTagsEditorModal: React.FC<AudioTagsEditorModalProps> = ({
  open,
  audioName,
  initialTags,
  onCancel,
  onSave,
}) => {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setTags(initialTags);
    }
  }, [open, initialTags]);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      const normalizedTags = tags.map(tag => tag.trim()).filter(Boolean);
      await onSave(normalizedTags);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="编辑标签"
      open={open}
      onCancel={onCancel}
      onOk={() => void handleSave()}
      okText="保存"
      cancelText="取消"
      confirmLoading={submitting}
      destroyOnClose
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Text type="secondary">
          当前音频：{audioName || '未命名音频'}
        </Text>
        <Select
          mode="tags"
          style={{ width: '100%' }}
          placeholder="输入标签后回车，可输入多个"
          value={tags}
          onChange={value => setTags(value.map(v => v.trim()).filter(Boolean))}
          tokenSeparators={[',', '，']}
          autoFocus
        />
      </Space>
    </Modal>
  );
};

