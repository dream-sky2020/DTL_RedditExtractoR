import React from 'react';
import { Space, Button, Row, Col } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { CommentSortMode, ReplyOrderMode } from '../../types';

interface QuickActionsProps {
  idPrefix?: string;
  canApplyCommentSort: boolean;
  onApplyCommentSort: (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => void;
  editorSortMode: CommentSortMode;
  editorReplyOrderMode: ReplyOrderMode;
  allAuthors: string[];
  onRandomizeAliasesAndApply: (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => void;
  onClearAliasesAndApply: (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => void;
  setAllSceneLayouts: (layout: 'top' | 'center') => void;
  addScene: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  idPrefix = 'editor-page',
  canApplyCommentSort,
  onApplyCommentSort,
  editorSortMode,
  editorReplyOrderMode,
  allAuthors,
  onRandomizeAliasesAndApply,
  onClearAliasesAndApply,
  setAllSceneLayouts,
  addScene,
}) => {
  const getId = (suffix: string) => `${idPrefix}-${suffix}`;

  return (
    <Space id={getId('quick-actions-space')} direction="vertical" style={{ width: '100%' }}>
      <Button
        id={getId('apply-sort-btn')}
        name="apply-sort-btn"
        type="primary"
        block
        disabled={!canApplyCommentSort}
        onClick={() => onApplyCommentSort(editorSortMode, editorReplyOrderMode)}
        style={{ background: 'var(--btn-primary-bg)', borderColor: 'var(--btn-primary-border)', marginBottom: 8 }}
      >
        应用排序与代号并重建脚本
      </Button>
      <Row gutter={8} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Button
            id={getId('random-alias-btn')}
            name="random-alias-btn"
            block
            disabled={!canApplyCommentSort || allAuthors.length === 0}
            onClick={() => onRandomizeAliasesAndApply(editorSortMode, editorReplyOrderMode)}
            style={{ color: 'var(--text-light-blue)', borderColor: 'var(--btn-primary-border)', background: 'transparent' }}
          >
            随机代号
          </Button>
        </Col>
        <Col span={12}>
          <Button
            id={getId('clear-alias-btn')}
            name="clear-alias-btn"
            block
            disabled={!canApplyCommentSort || allAuthors.length === 0}
            onClick={() => onClearAliasesAndApply(editorSortMode, editorReplyOrderMode)}
            style={{ color: 'var(--text-light-blue)', borderColor: 'var(--btn-primary-border)', background: 'transparent' }}
          >
            清空代号
          </Button>
        </Col>
      </Row>

      <div id={getId('layout-btns-wrapper')} style={{ marginBottom: 8 }}>
        <Space.Compact style={{ width: '100%' }}>
          <Button
            id={getId('set-top-btn')}
            name="set-top-btn"
            style={{ flex: 1, color: 'var(--text-light-blue)', borderColor: 'var(--btn-primary-border)', background: 'transparent' }}
            onClick={() => setAllSceneLayouts('top')}
          >
            全部 Top
          </Button>
          <Button
            id={getId('set-center-btn')}
            name="set-center-btn"
            style={{ flex: 1, color: 'var(--text-light-blue)', borderColor: 'var(--btn-primary-border)', background: 'transparent' }}
            onClick={() => setAllSceneLayouts('center')}
          >
            全部 Center
          </Button>
        </Space.Compact>
      </div>
      <Button
        id={getId('add-scene-btn')}
        name="add-scene-btn"
        type="primary"
        block
        icon={<PlusOutlined />}
        onClick={addScene}
        style={{ background: 'var(--btn-primary-bg)', borderColor: 'var(--btn-primary-border)' }}
      >
        新增画面格
      </Button>
    </Space>
  );
};
