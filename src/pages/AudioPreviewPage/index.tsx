import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Space, Typography, Empty, Row, Col, Tooltip, Spin, Dropdown } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, SoundOutlined, SearchOutlined, ReloadOutlined, CopyOutlined } from '@ant-design/icons';
import axios from 'axios';
import { toast } from '../../components/Toast';
import { dialogs } from '../../components/Dialogs';
import { AudioTagsEditorModal } from '../../components';

const { Title, Text } = Typography;

const AUDIO_ITEMS_STORAGE_KEY = 'reddit-extractor.audio-items.v1';

interface AudioItem {
  name: string;
  path: string;
  url: string;
  alias: string;
  tags: string[];
  category?: string;
}

export const AudioPreviewPage: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [playingPath, setPlayingPath] = useState<string | null>(null);
  const [audioInstance, setAudioInstance] = useState<HTMLAudioElement | null>(null);
  const [audioItems, setAudioItems] = useState<AudioItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [durationMap, setDurationMap] = useState<Record<string, number | null>>({});
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [tagEditingPath, setTagEditingPath] = useState<string | null>(null);

  const normalizeAudioItem = (item: Partial<AudioItem> & { path: string; name?: string; url?: string }): AudioItem => {
    const path = item.path;
    const fileName = path.split('/').pop() || path;
    const fallbackName = item.name || fileName.replace(/\.[^/.]+$/, '');
    return {
      name: fallbackName,
      path,
      url: item.url || '/' + path.replace(/^public\//, ''),
      alias: (item.alias || '').trim(),
      tags: Array.isArray(item.tags) ? item.tags.map(tag => String(tag).trim()).filter(Boolean) : [],
      category: item.category || '',
    };
  };

  // 从 localStorage 恢复音频列表
  const restoreAudioItems = () => {
    try {
      const cached = localStorage.getItem(AUDIO_ITEMS_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed
            .filter(item => item && typeof item.path === 'string')
            .map(item => normalizeAudioItem(item));
        }
      }
    } catch (err) {
      console.warn('读取 localStorage 中的音频列表失败:', err);
    }
    return [];
  };

  // 保存音频列表到 localStorage
  const persistAudioItems = (items: AudioItem[]) => {
    try {
      localStorage.setItem(AUDIO_ITEMS_STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      console.warn('保存音频列表到 localStorage 失败:', err);
    }
  };

  // 从后端获取音频列表
  const fetchAudioList = async (isAutoRefresh = false) => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/list_audio');
      if (response.data.success) {
        const backendItems = Array.isArray(response.data.items) ? response.data.items : [];
        const files: string[] = Array.isArray(response.data.files) ? response.data.files : [];

        let items: AudioItem[] = [];
        if (backendItems.length > 0) {
          items = backendItems
            .filter((item: any) => item && typeof item.path === 'string' && item.exists !== false)
            .map((item: any) =>
              normalizeAudioItem({
                path: item.path,
                name: item.path.split('/').pop()?.replace(/\.[^/.]+$/, '') || item.path,
                alias: item.alias || '',
                tags: item.tags || [],
                category: item.category || '',
              })
            );
        } else {
          items = files.map(path => normalizeAudioItem({ path }));
        }

        setAudioItems(items);
        setDurationMap({});
        persistAudioItems(items);
        if (!isAutoRefresh) {
          toast.success('音频列表已更新');
        }
      } else {
        toast.error('获取音频列表失败: ' + response.data.message);
      }
    } catch (err) {
      console.error('获取音频列表出错:', err);
      toast.error('无法连接到后端服务', {
        description: '请确保 scripts/server.py 正在运行'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cachedItems = restoreAudioItems();
    if (cachedItems.length > 0) {
      setAudioItems(cachedItems);
    } else {
      fetchAudioList(true);
    }
  }, []);

  const filteredItems = audioItems.filter(item => 
    item.name.toLowerCase().includes(searchText.toLowerCase()) ||
    item.alias.toLowerCase().includes(searchText.toLowerCase()) ||
    item.tags.join(' ').toLowerCase().includes(searchText.toLowerCase())
  );

  const formatDuration = (seconds: number | null | undefined) => {
    if (seconds === undefined) {
      return '读取中...';
    }
    if (seconds === null || Number.isNaN(seconds) || !Number.isFinite(seconds)) {
      return '--:--';
    }
    const total = Math.max(0, Math.round(seconds));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

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

      audio.onloadedmetadata = () => {
        finalize(Number.isFinite(audio.duration) ? audio.duration : null);
      };
      audio.onerror = () => finalize(null);
    });
  };

  useEffect(() => {
    const pendingItems = audioItems.filter(item => durationMap[item.path] === undefined);
    if (pendingItems.length === 0) {
      return;
    }

    let cancelled = false;
    const loadDurations = async () => {
      const results = await Promise.all(
        pendingItems.map(async item => ({
          path: item.path,
          duration: await getAudioDuration(item.url),
        }))
      );

      if (cancelled) {
        return;
      }

      setDurationMap(prev => {
        const next = { ...prev };
        results.forEach(result => {
          next[result.path] = result.duration;
        });
        return next;
      });
    };

    void loadDurations();
    return () => {
      cancelled = true;
    };
  }, [audioItems, durationMap]);

  const playAudio = (item: AudioItem) => {
    if (audioInstance) {
      audioInstance.pause();
    }

    const audio = new Audio(item.url);
    audio.play().catch(err => {
      console.error('播放失败:', err);
      toast.error(`音频播放失败: ${item.name}`, {
        description: '文件可能已被移动或删除，正在尝试自动刷新列表。',
        duration: 4
      });
      fetchAudioList(true); // 播放失败时自动刷新列表
    });

    setAudioInstance(audio);
    setPlayingPath(item.path);

    audio.onended = () => {
      setPlayingPath(null);
    };
  };

  const stopAudio = () => {
    if (audioInstance) {
      audioInstance.pause();
      setPlayingPath(null);
    }
  };

  const copyAudioTag = (item: AudioItem) => {
    const fileName = item.path.split('/').pop() || '';
    const tag = `[audio src="${fileName}" start="0" volume="1.0"]`;
    navigator.clipboard.writeText(tag).then(() => {
      toast.success('标签已复制', { description: tag });
    }).catch(err => {
      console.error('复制失败:', err);
      toast.error('复制失败，请重试');
    });
  };

  const updateItemAlias = (path: string, alias: string) => {
    setAudioItems(prev => {
      const next = prev.map(item => (item.path === path ? { ...item, alias } : item));
      persistAudioItems(next);
      return next;
    });
  };

  const updateItemTags = (path: string, tags: string[]) => {
    setAudioItems(prev => {
      const next = prev.map(item => (item.path === path ? { ...item, tags } : item));
      persistAudioItems(next);
      return next;
    });
  };

  const saveSingleAudioMetadata = async (
    path: string,
    metadata: { alias: string; tags: string[]; category: string }
  ) => {
    const response = await axios.post('http://localhost:5000/audio_manifest', {
      items: {
        [path]: metadata
      }
    }).catch(err => {
      console.error('自动保存元数据失败:', err);
      return { data: { success: false, message: '网络错误' } };
    });

    return Boolean(response?.data?.success);
  };

  const startRename = (item: AudioItem) => {
    setRenamingPath(item.path);
    setRenameDraft(item.alias || item.name);
  };

  const commitRename = async (path: string) => {
    if (renamingPath !== path) {
      return;
    }
    const target = audioItems.find(item => item.path === path);
    if (!target) {
      setRenamingPath(null);
      setRenameDraft('');
      return;
    }
    const nextAlias = renameDraft.trim();
    const normalizedAlias = nextAlias === target.name ? '' : nextAlias;
    setRenamingPath(null);
    setRenameDraft('');

    if (normalizedAlias !== target.alias) {
      updateItemAlias(path, normalizedAlias);
      const success = await saveSingleAudioMetadata(path, {
        alias: normalizedAlias,
        tags: target.tags,
        category: target.category || '',
      });

      if (!success) {
        updateItemAlias(path, target.alias);
        toast.error('自动保存失败', {
          description: '已恢复到保存前的别名，请稍后重试。'
        });
      }
    }
  };

  const cancelRename = () => {
    setRenamingPath(null);
    setRenameDraft('');
  };

  const openTagEditor = (path: string) => {
    setTagEditingPath(path);
  };

  const closeTagEditor = () => {
    setTagEditingPath(null);
  };

  const handleTagSave = async (tags: string[]) => {
    if (!tagEditingPath) {
      return;
    }
    const target = audioItems.find(item => item.path === tagEditingPath);
    if (!target) {
      closeTagEditor();
      return;
    }

    const oldTags = [...target.tags];
    updateItemTags(tagEditingPath, tags);
    const success = await saveSingleAudioMetadata(tagEditingPath, {
      alias: target.alias,
      tags,
      category: target.category || '',
    });

    if (!success) {
      updateItemTags(tagEditingPath, oldTags);
      toast.error('标签自动保存失败', {
        description: '已恢复到保存前的标签，请稍后重试。'
      });
      return;
    }

    toast.success('标签已保存');
    closeTagEditor();
  };

  useEffect(() => {
    return () => {
      if (audioInstance) {
        audioInstance.pause();
      }
    };
  }, [audioInstance]);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2}>音频素材预览</Title>
          <Text type="secondary">
            {loading ? '正在扫描音频文件...' : `共发现 ${audioItems.length} 个音频文件，点击按钮即可播放。右键卡片可重命名别名（自动保存）。`}
          </Text>
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
              <Dropdown
                trigger={['contextMenu']}
                menu={{
                  items: [
                    { key: 'rename', label: '重命名' },
                    { key: 'tags', label: '标签' },
                  ],
                  onClick: ({ key }) => {
                    if (key === 'rename') {
                      startRename(item);
                    }
                    if (key === 'tags') {
                      openTagEditor(item.path);
                    }
                  },
                }}
              >
                <div>
                  <Card
                    hoverable
                    size="small"
                    style={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      borderColor: playingPath === item.path ? '#1890ff' : undefined,
                      backgroundColor: playingPath === item.path ? '#e6f7ff' : undefined
                    }}
                  >
                    <div style={{ textAlign: 'center' }}>
                      {renamingPath === item.path ? (
                        <Input
                          autoFocus
                          size="small"
                          placeholder="输入别名后回车"
                          value={renameDraft}
                          onChange={e => setRenameDraft(e.target.value)}
                          onPressEnter={e => e.currentTarget.blur()}
                          onBlur={() => void commitRename(item.path)}
                          onKeyDown={e => {
                            if (e.key === 'Escape') {
                              cancelRename();
                            }
                          }}
                          style={{ marginBottom: '12px' }}
                        />
                      ) : (
                        <Tooltip title={item.name}>
                          <div style={{
                            marginBottom: '12px',
                            fontWeight: 'bold',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {item.alias || item.name}
                          </div>
                        </Tooltip>
                      )}
                      <Text type="secondary" style={{ display: 'block', marginBottom: '8px' }}>
                        {item.name}
                      </Text>
                      <Text type="secondary" style={{ display: 'block', marginBottom: '8px' }}>
                        时长：{formatDuration(durationMap[item.path])}
                      </Text>
                      <Space>
                        {playingPath === item.path ? (
                          <Button
                            type="primary"
                            shape="circle"
                            icon={<PauseCircleOutlined />}
                            onClick={stopAudio}
                          />
                        ) : (
                          <Button
                            type="default"
                            shape="circle"
                            icon={<PlayCircleOutlined />}
                            onClick={() => playAudio(item)}
                          />
                        )}
                        <Button
                          type="text"
                          shape="circle"
                          icon={<SoundOutlined />}
                          onClick={() => playAudio(item)}
                        />
                        <Tooltip title="复制 [audio] 标签">
                          <Button
                            type="text"
                            shape="circle"
                            icon={<CopyOutlined />}
                            onClick={() => copyAudioTag(item)}
                          />
                        </Tooltip>
                      </Space>
                    </div>
                  </Card>
                </div>
              </Dropdown>
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
        onCancel={closeTagEditor}
        onSave={handleTagSave}
      />
    </div>
  );
};

