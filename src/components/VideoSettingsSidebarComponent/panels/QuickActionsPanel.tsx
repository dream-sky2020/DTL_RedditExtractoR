import React from 'react';
import { Space, Button, Row, Col, InputNumber, Divider, Typography } from 'antd';
import { PlusOutlined, CameraOutlined, HistoryOutlined } from '@ant-design/icons';
import { CommentSortMode, ReplyOrderMode, VideoScene } from '../../../types';
import { dialogs } from '../../Dialogs';
import { useSnapshotStore } from '../../../store';
import { toast } from '@components/Toast';

const { Text } = Typography;

interface QuickActionsPanelProps {
  idPrefix?: string;
  canApplyCommentSort: boolean;
  onApplyCommentSort: (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => void;
  editorSortMode: CommentSortMode;
  editorReplyOrderMode: ReplyOrderMode;
  allAuthors: string[];
  onRandomizeAliasesAndApply: (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => void;
  onClearAliasesAndApply: (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => void;
  setAllSceneLayouts: (layout: 'top' | 'center') => void;
  setAllSceneDurations: (duration: number) => void;
  addScene: () => void;
  scenes: VideoScene[];
  onLoadScenes: (scenes: VideoScene[]) => void;
}

export const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({
  idPrefix = 'editor-page',
  canApplyCommentSort,
  onApplyCommentSort,
  editorSortMode,
  editorReplyOrderMode,
  allAuthors,
  onRandomizeAliasesAndApply,
  onClearAliasesAndApply,
  setAllSceneLayouts,
  setAllSceneDurations,
  addScene,
  scenes,
  onLoadScenes,
}) => {
  const getId = (suffix: string) => `${idPrefix}-${suffix}`;
  const { saveSnapshot, loadSnapshot, snapshotTime, hasSnapshot } = useSnapshotStore();

  const handleSaveSnapshot = () => {
    saveSnapshot(scenes);
    toast.success('已保存当前 DSL 快照');
  };

  const handleLoadSnapshot = () => {
    const snapshot = loadSnapshot();
    if (snapshot) {
      onLoadScenes(snapshot);
      toast.success('已恢复 DSL 快照');
    } else {
      toast.error('未找到可用的快照');
    }
  };

  const handleSetAllDurations = () => {
    let duration = 5;
    dialogs.confirm({
      title: '统一修改全部时长',
      content: (
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 8 }}>请输入统一的时长（秒）：</div>
          <InputNumber
            min={0.1}
            step={0.5}
            defaultValue={5}
            style={{ width: '100%' }}
            onChange={(val) => {
              if (val !== null) duration = val;
            }}
          />
        </div>
      ),
      onOk: () => {
        if (duration > 0) {
          setAllSceneDurations(duration);
        }
      },
    });
  };

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
        id={getId('set-all-durations-btn')}
        name="set-all-durations-btn"
        block
        onClick={handleSetAllDurations}
        style={{ marginBottom: 8, color: 'var(--text-light-blue)', borderColor: 'var(--btn-primary-border)', background: 'transparent' }}
      >
        统一全部时长
      </Button>
      <Button
        id={getId('add-scene-btn')}
        name="add-scene-btn"
        type="primary"
        block
        icon={<PlusOutlined />}
        onClick={addScene}
        style={{ background: 'var(--btn-primary-bg)', borderColor: 'var(--btn-primary-border)', marginBottom: 16 }}
      >
        新增画面格
      </Button>

      <Divider style={{ margin: '8px 0', borderColor: 'var(--brand-border)' }} />
      
      <div style={{ marginBottom: 8 }}>
        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>DSL 快照管理</Text>
            {snapshotTime && (
              <Text style={{ fontSize: 10, color: '#fff' }}>上次保存: {snapshotTime}</Text>
            )}
          </div>
          <Row gutter={8}>
            <Col span={12}>
              <Button
                block
                size="small"
                icon={<CameraOutlined />}
                onClick={handleSaveSnapshot}
                style={{ color: '#52c41a', borderColor: '#b7eb8f', background: 'transparent' }}
              >
                保存快照
              </Button>
            </Col>
            <Col span={12}>
              <Button
                block
                size="small"
                icon={<HistoryOutlined />}
                disabled={!hasSnapshot()}
                onClick={handleLoadSnapshot}
                style={{ color: '#1890ff', borderColor: '#91d5ff', background: 'transparent' }}
              >
                读取快照
              </Button>
            </Col>
          </Row>
        </Space>
      </div>
    </Space>
  );
};
