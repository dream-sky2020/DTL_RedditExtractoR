import React from 'react';
import { Row, Col, Form, Select, Typography } from 'antd';
import { CommentSortMode, ReplyOrderMode } from '../../../types';

const { Text } = Typography;

interface SortStrategySectionProps {
  idPrefix: string;
  editorSortMode: CommentSortMode;
  setEditorSortMode: (mode: CommentSortMode) => void;
  editorReplyOrderMode: ReplyOrderMode;
  setEditorReplyOrderMode: (mode: ReplyOrderMode) => void;
}

export const SortStrategySection: React.FC<SortStrategySectionProps> = ({
  idPrefix,
  editorSortMode,
  setEditorSortMode,
  editorReplyOrderMode,
  setEditorReplyOrderMode,
}) => {
  const getId = (suffix: string) => `${idPrefix}-${suffix}`;

  return (
    <Row gutter={16}>
      <Col span={24}>
        <Form.Item id={getId('sort-mode-item')} label={<Text style={{ color: 'var(--text-secondary)' }}>评论排序方式</Text>}>
          <Select<CommentSortMode>
            id={getId('sort-mode-select')}
            value={editorSortMode}
            onChange={setEditorSortMode}
            style={{ width: '100%' }}
            styles={{ popup: { root: { background: 'var(--brand-border)' } } }}
            className="custom-blue-select"
            options={[
              { label: '最佳排序', value: 'best' },
              { label: '点赞排序', value: 'top' },
              { label: '时间排序（最新优先）', value: 'new' },
              { label: '时间排序（最旧优先）', value: 'old' },
              { label: '有争议排序', value: 'controversial' },
            ]}
          />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Form.Item id={getId('reply-order-item')} label={<Text style={{ color: 'var(--text-secondary)' }}>回复关系策略</Text>}>
          <Select<ReplyOrderMode>
            id={getId('reply-order-select')}
            value={editorReplyOrderMode}
            onChange={setEditorReplyOrderMode}
            style={{ width: '100%' }}
            styles={{ popup: { root: { background: 'var(--brand-border)' } } }}
            className="custom-blue-select"
            options={[
              { label: '保持回复关系（默认）', value: 'preserve' },
              { label: '全量排序（不考虑回复关系）', value: 'global' },
            ]}
          />
        </Form.Item>
      </Col>
    </Row>
  );
};
