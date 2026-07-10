import React from 'react';
import { Space, Button, Row, Col, Divider, Typography } from 'antd';
import { CameraOutlined, HistoryOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { CommentSortMode, ReplyOrderMode, VideoScene } from '@/types';
import { useSnapshotStore } from '@/store';
import { toast } from '@components/Toast';
import { dialogs } from '@components/Dialogs';

const { Text } = Typography;

interface QuickActionsSectionProps {
  idPrefix?: string;
  canApplyCommentSort: boolean;
  onApplyCommentSort: (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => void;
  onRefreshStyles: () => void;
  onRearrangeScenes: (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => void;
  onResetAndRebuild: (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => void;
  editorSortMode: CommentSortMode;
  editorReplyOrderMode: ReplyOrderMode;
  scenes: VideoScene[];
  onLoadScenes: (scenes: VideoScene[]) => void;
}

export const QuickActionsSection: React.FC<QuickActionsSectionProps> = ({
  idPrefix = 'editor-page',
  canApplyCommentSort,
  onApplyCommentSort,
  onRefreshStyles,
  onRearrangeScenes,
  onResetAndRebuild,
  editorSortMode,
  editorReplyOrderMode,
  scenes,
  onLoadScenes,
}) => {
  const getId = (suffix: string) => `${idPrefix}-${suffix}`;
  const { saveSnapshot, loadSnapshot, snapshotTime, hasSnapshot } = useSnapshotStore();
  const [isSavingFile, setIsSavingFile] = React.useState(false);
  const [isLoadingFile, setIsLoadingFile] = React.useState(false);

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

  const handleSaveSnapshotToFile = async () => {
    try {
      setIsSavingFile(true);
      const response = await fetch('http://localhost:5000/snapshot/save_file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenes }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        if (result?.cancelled) {
          return;
        }
        throw new Error(result?.message || '保存快照文件失败');
      }
      toast.success(`快照已保存到文件 (${result.sceneCount} 个场景)`);
    } catch (error: any) {
      toast.error(`保存快照文件失败: ${error?.message || '未知错误'}`);
    } finally {
      setIsSavingFile(false);
    }
  };

  const handleLoadSnapshotFromFile = async () => {
    try {
      setIsLoadingFile(true);
      const response = await fetch('http://localhost:5000/snapshot/load_file');
      const result = await response.json();
      if (!response.ok || !result.success) {
        if (result?.cancelled) {
          return;
        }
        throw new Error(result?.message || '读取快照文件失败');
      }

      const loadedScenes = Array.isArray(result.scenes) ? (result.scenes as VideoScene[]) : null;
      if (!loadedScenes || loadedScenes.length === 0) {
        dialogs.warning({
          title: '快照为空',
          content: '该文件中没有可恢复的场景数据。',
        });
        return;
      }

      onLoadScenes(loadedScenes);
      saveSnapshot(loadedScenes);
      toast.success(`已从文件恢复快照 (${loadedScenes.length} 个场景)`);
    } catch (error: any) {
      toast.error(`读取快照文件失败: ${error?.message || '未知错误'}`);
    } finally {
      setIsLoadingFile(false);
    }
  };

  return (
    <Space id={getId('quick-actions-space')} direction="vertical" style={{ width: '100%' }} size={12}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Button
          id={getId('refresh-style-btn')}
          block
          disabled={!canApplyCommentSort}
          onClick={onRefreshStyles}
          style={{ color: 'var(--text-light-blue)', borderColor: 'var(--btn-primary-border)', background: 'transparent' }}
        >
          刷新样式
        </Button>

        <Button
          id={getId('rearrange-scenes-btn')}
          block
          disabled={!canApplyCommentSort}
          onClick={() => onRearrangeScenes(editorSortMode, editorReplyOrderMode)}
          style={{ color: 'var(--text-light-blue)', borderColor: 'var(--btn-primary-border)', background: 'transparent' }}
        >
          重排画面顺序
        </Button>

        <Button
          id={getId('reset-rebuild-btn')}
          danger
          block
          disabled={!canApplyCommentSort}
          onClick={() => {
            dialogs.confirm({
              title: '确定要重置并重新生成脚本吗？',
              content: '这将彻底放弃当前所有的手动修改（包括时长、文字、布局等），按原始 Reddit 数据重新生成。',
              okText: '确定重置',
              okType: 'danger',
              onOk: () => onResetAndRebuild(editorSortMode, editorReplyOrderMode),
            });
          }}
          style={{ marginTop: 4 }}
        >
          重置并重新生成脚本
        </Button>
      </div>

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
          <Row gutter={8}>
            <Col span={12}>
              <Button
                block
                size="small"
                icon={<DownloadOutlined />}
                loading={isSavingFile}
                onClick={handleSaveSnapshotToFile}
                style={{ color: '#13c2c2', borderColor: '#87e8de', background: 'transparent' }}
              >
                保存到文件
              </Button>
            </Col>
            <Col span={12}>
              <Button
                block
                size="small"
                icon={<UploadOutlined />}
                loading={isLoadingFile}
                onClick={handleLoadSnapshotFromFile}
                style={{ color: '#722ed1', borderColor: '#d3adf7', background: 'transparent' }}
              >
                从文件读取
              </Button>
            </Col>
          </Row>
        </Space>
      </div>
    </Space>
  );
};
