import React, { useState, useMemo, useEffect } from 'react';
import {
  Layout,
  Row,
  Col,
  Table,
  Input,
  Button,
  Space,
  Typography,
  Card,
  Divider,
  Tag,
  message,
  Empty,
  Tooltip,
  Modal
} from 'antd';
import {
  UserOutlined,
  SaveOutlined,
  CloudDownloadOutlined,
  EyeOutlined,
  SearchOutlined,
  ReloadOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { useRedditStore, useVideoStore, useSettingsStore } from '@/store';
import { AuthorProfile, VideoScene } from '@/types';
import { StudioFramePlayer } from '../../components/StudioFramePlayer';
import { DEFAULT_PREVIEW_FPS, getTotalFrames } from '../../components/VideoPreviewPlayer';
import { getActiveVideoCanvasSize, getAspectRatioLabel } from '../../rendering/videoCanvas';
import { AUTHOR_PROFILES_STORAGE_KEY } from '@/constants/storage';

const { Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;

const GLOBAL_PROFILES_KEY = 'global-author-profiles';

const interpolateColor = (start: [number, number, number], end: [number, number, number], ratio: number) => {
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  const [r, g, b] = start.map((channel, index) =>
    Math.round(channel + (end[index] - channel) * clampedRatio)
  );
  return `rgb(${r}, ${g}, ${b})`;
};

const formatDurationLabel = (duration: number) => {
  const normalizedDuration = Number.isFinite(duration) ? duration : 0;
  return Number.isInteger(normalizedDuration)
    ? `[${normalizedDuration}s]`
    : `[${normalizedDuration.toFixed(1)}s]`;
};

export const IdentityManagementPage: React.FC = () => {
  const { 
    allAuthors, 
    authorProfiles, 
    setAuthorProfiles,
    buildProfilesForAuthors
  } = useRedditStore();
  
  const { videoConfig, setVideoConfig } = useVideoStore();
  const { 
    colorArrangement,
    commentSortMode,
    replyOrderMode,
    setColorArrangement,
    editorUiSettings,
  } = useSettingsStore();

  const [searchText, setSearchText] = useState('');
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [globalProfiles, setGlobalProfiles] = useState<Record<string, AuthorProfile>>({});
  const [selectedSceneIds, setSelectedSceneIds] = useState<string[]>([]);

  const activeCanvas = getActiveVideoCanvasSize(videoConfig);
  const activeAspectRatioLabel = getAspectRatioLabel(activeCanvas.width, activeCanvas.height);
  const totalFrames = getTotalFrames(videoConfig, DEFAULT_PREVIEW_FPS);
  const { frameOffset } = editorUiSettings.studio;

  // 初始化加载全局库
  useEffect(() => {
    const stored = localStorage.getItem(GLOBAL_PROFILES_KEY);
    if (stored) {
      try {
        setGlobalProfiles(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse global profiles', e);
      }
    }
  }, []);

  // 过滤作者列表
  const filteredAuthors = useMemo(() => {
    return allAuthors.filter(a => 
      a.toLowerCase().includes(searchText.toLowerCase()) || 
      (authorProfiles[a]?.alias || '').toLowerCase().includes(searchText.toLowerCase())
    );
  }, [allAuthors, authorProfiles, searchText]);

  // 查找包含该作者的场景
  const relatedScenesWithIndex = useMemo(() => {
    if (!selectedAuthor) return [];
    return videoConfig.scenes
      .map((scene, index) => ({ scene, index }))
      .filter(({ scene }) => scene.items.some(item => item.author === selectedAuthor));
  }, [selectedAuthor, videoConfig.scenes]);

  const sceneDurationRange = useMemo(() => {
    const durations = videoConfig.scenes.map((scene) => scene.duration).filter(Number.isFinite);
    return {
      min: durations.length ? Math.min(...durations) : 0,
      max: durations.length ? Math.max(...durations) : 0,
    };
  }, [videoConfig.scenes]);

  const getDurationColor = (duration: number) => {
    const { min, max } = sceneDurationRange;
    const ratio = max > min ? (duration - min) / (max - min) : 0;
    return interpolateColor([126, 203, 255], [168, 7, 26], ratio);
  };

  const renderSceneCaption = (scene: VideoScene, sceneIdx: number) => {
    const isSelected = selectedSceneIds.includes(scene.id);

    return (
      <div style={{ marginTop: 8, textAlign: 'center' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            minWidth: 0,
          }}
        >
          <Text strong ellipsis style={{
            minWidth: 0,
            fontSize: '12px',
            color: isSelected ? 'var(--ant-primary-color)' : 'inherit'
          }}>
            {sceneIdx + 1}. {scene.title || '未命名画面'}
          </Text>
          <span
            style={{
              flex: '0 0 auto',
              fontSize: '12px',
              fontWeight: 700,
              color: getDurationColor(scene.duration),
            }}
          >
            {formatDurationLabel(scene.duration)}
          </span>
        </div>
      </div>
    );
  };

  const handleUpdateProfile = (author: string, updates: Partial<AuthorProfile>) => {
    const next = { ...authorProfiles, [author]: { ...(authorProfiles[author] || {}), ...updates } };
    setAuthorProfiles(next);
    localStorage.setItem(AUTHOR_PROFILES_STORAGE_KEY, JSON.stringify(next));
  };

  const saveToGlobal = (author: string) => {
    const profile = authorProfiles[author];
    if (!profile) return;

    const nextGlobal = { ...globalProfiles, [author]: profile };
    setGlobalProfiles(nextGlobal);
    localStorage.setItem(GLOBAL_PROFILES_KEY, JSON.stringify(nextGlobal));
    message.success(`已将 u/${author} 保存到全局库`);
  };

  const loadFromGlobal = (author: string) => {
    const globalProfile = globalProfiles[author];
    if (!globalProfile) {
      message.warning('全局库中未找到该用户');
      return;
    }

    handleUpdateProfile(author, globalProfile);
    message.success(`已从全局库恢复 u/${author} 的配置`);
  };

  const syncAllFromGlobal = () => {
    let count = 0;
    const nextProfiles = { ...authorProfiles };
    allAuthors.forEach(author => {
      if (globalProfiles[author]) {
        nextProfiles[author] = globalProfiles[author];
        count++;
      }
    });
    setAuthorProfiles(nextProfiles);
    localStorage.setItem(AUTHOR_PROFILES_STORAGE_KEY, JSON.stringify(nextProfiles));
    message.success(`已从全局库同步了 ${count} 个用户的配置`);
  };

  const saveAllToGlobal = () => {
    const nextGlobal = { ...globalProfiles, ...authorProfiles };
    setGlobalProfiles(nextGlobal);
    localStorage.setItem(GLOBAL_PROFILES_KEY, JSON.stringify(nextGlobal));
    message.success(`已将当前项目所有用户保存到全局库`);
  };

  const handleRandomize = () => {
    const nextProfiles = buildProfilesForAuthors(allAuthors, authorProfiles, colorArrangement, true);
    setAuthorProfiles(nextProfiles);
    localStorage.setItem(AUTHOR_PROFILES_STORAGE_KEY, JSON.stringify(nextProfiles));
    message.success('已重新随机生成所有代号颜色');
  };

  return (
    <Layout style={{ height: 'calc(100vh - 120px)', background: 'transparent' }}>
      <Sider width={400} theme="dark" style={{ background: 'var(--panel-bg-darker)', borderRight: '1px solid var(--brand-border)', overflowY: 'auto', padding: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0, color: 'var(--text-primary)' }}>用户列表</Title>
            <Tag color="blue">{allAuthors.length} 人</Tag>
          </div>

          <Input
            prefix={<SearchOutlined />}
            placeholder="搜索用户名或代号..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            allowClear
          />

          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="small" icon={<ReloadOutlined />} onClick={handleRandomize} block>随机生成</Button>
            <Button size="small" icon={<CloudDownloadOutlined />} onClick={syncAllFromGlobal} block>从全局同步</Button>
            <Button size="small" icon={<SaveOutlined />} onClick={saveAllToGlobal} block>保存到全局</Button>
          </div>

          <Table
            dataSource={filteredAuthors.map(a => ({ author: a }))}
            rowKey="author"
            size="small"
            pagination={{ pageSize: 20, showSizeChanger: false }}
            onRow={(record) => ({
              onClick: () => setSelectedAuthor(record.author),
              style: { cursor: 'pointer', background: selectedAuthor === record.author ? 'var(--btn-primary-bg)' : 'transparent' }
            })}
            columns={[
              {
                title: '用户',
                dataIndex: 'author',
                render: (val) => (
                  <Space>
                    {authorProfiles[val]?.avatar ? (
                      <img 
                        src={`http://localhost:5000/proxy_local_file?path=${encodeURIComponent(authorProfiles[val].avatar)}`} 
                        style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} 
                        alt="avatar"
                      />
                    ) : (
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: authorProfiles[val]?.color || '#ccc' }} />
                    )}
                    <Text style={{ 
                      color: selectedAuthor === val ? 'var(--text-primary)' : '#000', 
                      fontSize: 12 
                    }}>u/{val}</Text>
                  </Space>
                )
              },
              {
                title: '代号',
                render: (_, record) => (
                  <Text style={{ 
                    color: selectedAuthor === record.author ? 'var(--text-secondary)' : '#000', 
                    fontSize: 12 
                  }}>
                    {authorProfiles[record.author]?.alias || '-'}
                  </Text>
                )
              }
            ]}
          />
        </Space>
      </Sider>

      <Content style={{ padding: 24, overflowY: 'auto' }}>
        {selectedAuthor ? (
          <Row gutter={24}>
            <Col span={10}>
              <Card title={`用户信息编辑: u/${selectedAuthor}`} bordered={false} className="dark-card">
                <Space direction="vertical" style={{ width: '100%' }} size={20}>
                  <div>
                    <Text style={{ display: 'block', marginBottom: 8, color: 'var(--text-secondary)' }}>显示代号</Text>
                    <Input
                      value={authorProfiles[selectedAuthor]?.alias || ''}
                      onChange={e => handleUpdateProfile(selectedAuthor, { alias: e.target.value })}
                      placeholder="输入代号..."
                      size="large"
                    />
                  </div>

                  <div>
                    <Text style={{ display: 'block', marginBottom: 8, color: 'var(--text-secondary)' }}>代表颜色</Text>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <Input
                        type="color"
                        value={authorProfiles[selectedAuthor]?.color || '#1890ff'}
                        onChange={e => handleUpdateProfile(selectedAuthor, { color: e.target.value })}
                        style={{ width: 60, height: 40, padding: 0, border: 'none' }}
                      />
                      <Input
                        value={authorProfiles[selectedAuthor]?.color || '#1890ff'}
                        onChange={e => handleUpdateProfile(selectedAuthor, { color: e.target.value })}
                        style={{ flex: 1 }}
                      />
                    </div>
                  </div>

                  {authorProfiles[selectedAuthor]?.avatar && (
                    <div>
                      <Text style={{ display: 'block', marginBottom: 8, color: 'var(--text-secondary)' }}>当前头像</Text>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <img 
                          src={`http://localhost:5000/proxy_local_file?path=${encodeURIComponent(authorProfiles[selectedAuthor].avatar)}`} 
                          style={{ width: 64, height: 64, borderRadius: '50%', border: '2px solid var(--brand-border)', objectFit: 'cover' }} 
                          alt="avatar"
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>{authorProfiles[selectedAuthor].avatar}</Text>
                      </div>
                    </div>
                  )}

                  <Divider style={{ margin: '12px 0' }} />

                  <div style={{ display: 'flex', gap: 12 }}>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      onClick={() => saveToGlobal(selectedAuthor)}
                      block
                    >
                      保存到全局库
                    </Button>
                    <Button
                      icon={<CloudDownloadOutlined />}
                      onClick={() => loadFromGlobal(selectedAuthor)}
                      disabled={!globalProfiles[selectedAuthor]}
                      block
                    >
                      从全局库恢复
                    </Button>
                  </div>

                  {globalProfiles[selectedAuthor] && (
                    <div style={{ padding: 12, background: 'var(--panel-bg-darker)', borderRadius: 8, border: '1px dashed var(--brand-border)' }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        全局库记录: {globalProfiles[selectedAuthor].alias || '(无代号)'}
                        <div style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: globalProfiles[selectedAuthor].color, marginLeft: 8 }} />
                      </Text>
                    </div>
                  )}
                </Space>
              </Card>
            </Col>

            <Col span={14}>
              <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={4} style={{ margin: 0, color: 'var(--text-primary)' }}>
                  画面预览 <small style={{ fontWeight: 'normal', fontSize: 14, color: 'var(--text-secondary)' }}>共 {relatedScenesWithIndex.length} 个画面包含该用户</small>
                </Title>
              </div>

              {relatedScenesWithIndex.length > 0 ? (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                  gap: '16px 24px',
                  alignItems: 'start',
                }}>
                  {relatedScenesWithIndex.map(({ scene, index }) => (
                    <div key={scene.id} className="gallery-item-wrap">
                      <StudioFramePlayer 
                        idx={index} 
                        isSelected={selectedSceneIds.includes(scene.id)} 
                        selectionIndex={selectedSceneIds.indexOf(scene.id) + 1}
                        isCompact={false}
                        videoConfig={videoConfig}
                        totalFrames={totalFrames}
                        fps={DEFAULT_PREVIEW_FPS}
                        frameOffset={frameOffset}
                        activeCanvas={activeCanvas}
                        isMultiSelectMode={false}
                        setSelectedSceneIds={setSelectedSceneIds}
                        scenes={videoConfig.scenes}
                      />
                      {renderSceneCaption(scene, index)}
                    </div>
                  ))}
                </div>
              ) : (
                <Empty description="该用户在当前脚本中没有发言" style={{ marginTop: 100 }} />
              )}
            </Col>
          </Row>
        ) : (
          <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
            <UserOutlined style={{ fontSize: 64, color: 'var(--brand-border)', marginBottom: 16 }} />
            <Title level={3} style={{ color: 'var(--text-secondary)' }}>请从左侧选择一个用户进行编辑</Title>
            <Paragraph style={{ color: 'var(--text-muted)' }}>
              你可以管理用户的代号、颜色，并查看其在视频中的实际显示效果。
            </Paragraph>
          </div>
        )}
      </Content>
    </Layout>
  );
};
