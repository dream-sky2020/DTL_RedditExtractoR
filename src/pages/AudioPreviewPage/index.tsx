import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Input, Space, Typography, Empty, Row, Col, Spin } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { toast } from '@components/Toast';
import { dialogs } from '@components/Dialogs';
import { AudioTagsEditorModal } from '@/components';

// Subcomponents & Hooks
import { AudioCard } from './components/AudioCard';
import { useAudioList } from '@hooks/useAudioList';
import { useAudioPlayer } from '@hooks/useAudioPlayer';
import { AudioItem } from '@/types';

const { Title: AntTitle, Text: AntText } = Typography;

export const AudioPreviewPage: React.FC = () => {
  const {
    audioItems,
    filteredItems,
    loading,
    searchText,
    setSearchText,
    durationMap,
    setDurationMap,
    fetchAudioList,
    updateItemMetadata
  } = useAudioList();

  const {
    playingPath,
    audioInstance,
    playAudio,
    stopAudio
  } = useAudioPlayer(fetchAudioList);

  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [tagEditingPath, setTagEditingPath] = useState<string | null>(null);

  // 时长加载逻辑
  const getAudioDuration = (url: string): Promise<number | null> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.preload = 'metadata';
      audio.src = url;
      const finalize = (value: number | null) => {
        audio.removeAttribute('src');
        audio.load();
        resolve(value);
      };
      audio.onloadedmetadata = () => finalize(Number.isFinite(audio.duration) ? audio.duration : null);
      audio.onerror = () => finalize(null);
    });
  };

  useEffect(() => {
    const pendingItems = audioItems.filter(item => durationMap[item.path] === undefined);
    if (pendingItems.length === 0) return;

    let cancelled = false;
    const loadDurations = async () => {
      const batchSize = 5;
      for (let i = 0; i < pendingItems.length; i += batchSize) {
        if (cancelled) break;
        const batch = pendingItems.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map(async item => ({
            path: item.path,
            duration: await getAudioDuration(item.url),
          }))
        );

        if (!cancelled) {
          setDurationMap(prev => {
            const next = { ...prev };
            results.forEach(result => { next[result.path] = result.duration; });
            return next;
          });
        }
      }
    };

    void loadDurations();
    return () => { cancelled = true; };
  }, [audioItems]);

  const formatDuration = useCallback((seconds: number | null | undefined) => {
    if (seconds === undefined) return '读取中...';
    if (seconds === null || Number.isNaN(seconds) || !Number.isFinite(seconds)) return '--:--';
    const total = Math.max(0, Math.round(seconds));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, []);

  const copyAudioTag = useCallback((item: AudioItem) => {
    const fileName = item.path.split('/').pop() || '';
    const tag = `[audio src="${fileName}" start="0" volume="${item.previewVolume.toFixed(2)}"]`;
    navigator.clipboard.writeText(tag).then(() => {
      toast.success('标签已复制', { description: tag });
    }).catch(err => {
      console.error('复制失败:', err);
      toast.error('复制失败，请重试');
    });
  }, []);

  const commitRename = async (path: string, nextAlias: string) => {
    const target = audioItems.find(item => item.path === path);
    if (!target) return;
    
    const trimmedAlias = nextAlias.trim();
    const normalizedAlias = trimmedAlias === target.name ? '' : trimmedAlias;
    setRenamingPath(null);

    if (normalizedAlias !== target.alias) {
      const success = await updateItemMetadata(path, { alias: normalizedAlias });
      if (!success) {
        toast.error('自动保存失败', { description: '已恢复到保存前的别名，请稍后重试。' });
      }
    }
  };

  const handleTagSave = async (tags: string[]) => {
    if (!tagEditingPath) return;
    const success = await updateItemMetadata(tagEditingPath, { tags });
    if (success) {
      toast.success('标签已保存');
      setTagEditingPath(null);
    } else {
      toast.error('标签自动保存失败', { description: '请稍后重试。' });
    }
  };

  const handlePreviewVolumeChange = async (path: string, nextVolume: number) => {
    const success = await updateItemMetadata(path, { previewVolume: nextVolume });
    if (success && playingPath === path && audioInstance) {
      audioInstance.volume = nextVolume;
    } else if (!success) {
      toast.error('音量保存失败');
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <AntTitle level={2}>音频素材预览</AntTitle>
          <AntText type="secondary">
            {loading ? '正在扫描音频文件...' : `共发现 ${audioItems.length} 个音频文件。右键卡片可重命名别名。`}
          </AntText>
        </div>
        <Space>
          <Input
            placeholder="搜索音频名称..."
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            allowClear
          />
          <Button 
            icon={<ReloadOutlined />} 
            onClick={() => {
              dialogs.confirm({
                title: '确认刷新音频列表？',
                content: '这将重新扫描服务器上的音频目录并更新本地缓存。',
                onOk: () => fetchAudioList(false)
              });
            }} 
            loading={loading}
          >
            刷新列表
          </Button>
        </Space>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px' }}>
          <Spin size="large" tip="正在加载音频列表..." />
        </div>
      ) : filteredItems.length > 0 ? (
        <Row gutter={[16, 16]}>
          {filteredItems.map(item => (
            <Col xs={24} sm={12} md={8} lg={6} xl={4} key={item.path}>
              <AudioCard 
                item={item}
                isPlaying={playingPath === item.path}
                duration={durationMap[item.path]}
                isRenaming={renamingPath === item.path}
                onPlay={playAudio}
                onStop={stopAudio}
                onRename={(item) => setRenamingPath(item.path)}
                onCommitRename={commitRename}
                onCancelRename={() => setRenamingPath(null)}
                onEditTags={(path) => setTagEditingPath(path)}
                onCopyTag={copyAudioTag}
                onPreviewVolumeChange={handlePreviewVolumeChange}
                formatDuration={formatDuration}
              />
            </Col>
          ))}
        </Row>
      ) : (
        <Empty description="未找到匹配的音频文件" />
      )}
      <AudioTagsEditorModal
        open={Boolean(tagEditingPath)}
        audioName={
          audioItems.find(item => item.path === tagEditingPath)?.alias ||
          audioItems.find(item => item.path === tagEditingPath)?.name ||
          ''
        }
        initialTags={audioItems.find(item => item.path === tagEditingPath)?.tags || []}
        onCancel={() => setTagEditingPath(null)}
        onSave={handleTagSave}
      />
    </div>
  );
};
