import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Space, Typography, Empty, Row, Col, Tooltip, Spin } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, SoundOutlined, SearchOutlined, ReloadOutlined, CopyOutlined } from '@ant-design/icons';
import axios from 'axios';
import { toast } from '../../components/Toast';
import { dialogs } from '../../components/Dialogs';

const { Title, Text } = Typography;

const AUDIO_ITEMS_STORAGE_KEY = 'reddit-extractor.audio-items.v1';

interface AudioItem {
  name: string;
  path: string;
  url: string;
}

export const AudioPreviewPage: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [playingPath, setPlayingPath] = useState<string | null>(null);
  const [audioInstance, setAudioInstance] = useState<HTMLAudioElement | null>(null);
  const [audioItems, setAudioItems] = useState<AudioItem[]>([]);
  const [loading, setLoading] = useState(false);

  // 从 localStorage 恢复音频列表
  const restoreAudioItems = () => {
    try {
      const cached = localStorage.getItem(AUDIO_ITEMS_STORAGE_KEY);
      if (cached) {
        return JSON.parse(cached);
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
        const files: string[] = response.data.files;
        const items = files.map(path => {
          const fileName = path.split('/').pop() || path;
          const name = fileName.replace(/\.[^/.]+$/, "");
          // 将 public/ 去掉，因为在开发服务器中 public 是根目录
          const url = '/' + path.replace(/^public\//, '');
          return { name, path, url };
        });
        setAudioItems(items);
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
    item.name.toLowerCase().includes(searchText.toLowerCase())
  );

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
            {loading ? '正在扫描音频文件...' : `共发现 ${audioItems.length} 个音频文件，点击按钮即可播放。`}
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
                  <Tooltip title={item.name}>
                    <div style={{ 
                      marginBottom: '12px', 
                      fontWeight: 'bold', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap' 
                    }}>
                      {item.name}
                    </div>
                  </Tooltip>
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
            </Col>
          ))}
        </Row>
      ) : (
        <Empty description="未找到匹配的音频文件" />
      )}
    </div>
  );
};

