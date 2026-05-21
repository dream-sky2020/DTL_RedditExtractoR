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
  Empty,
  Tooltip,
  Modal,
  Tabs,
  Avatar,
  Popover,
  Badge
} from 'antd';
import { toast } from '@components/Toast';
import {
  UserOutlined,
  SaveOutlined,
  CloudDownloadOutlined,
  EyeOutlined,
  SearchOutlined,
  ReloadOutlined,
  DeleteOutlined,
  GlobalOutlined,
  UsergroupAddOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  ArrowRightOutlined,
  HistoryOutlined,
  BgColorsOutlined,
  FontSizeOutlined,
  ClearOutlined
} from '@ant-design/icons';
import { useRedditStore, useVideoStore, useSettingsStore, useIdentityStore, useAvatarStore } from '@/store';
import { AuthorProfile, VideoScene } from '@/types';
import { transformRedditJson } from '@/utils/redditTransformer';
import { StudioFramePlayer } from '../../components/StudioFramePlayer';
import { DEFAULT_PREVIEW_FPS, getTotalFrames } from '../../components/VideoPreviewPlayer';
import { getActiveVideoCanvasSize, getAspectRatioLabel } from '../../rendering/videoCanvas';
import { AVATAR_POOL } from '@/constants/avatars';
import { dialogs } from '../../components/Dialogs';

const { Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;

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

const getAvatarUrl = (avatarPath: string | undefined) => {
  if (!avatarPath) return undefined;
  if (avatarPath.startsWith('http')) return avatarPath;
  if (avatarPath.startsWith('public/')) return `/${avatarPath.replace('public/', '')}`;
  return `/${avatarPath}`;
};

export const IdentityManagementPage: React.FC = () => {
  const {
    allAuthors,
    authorProfiles,
    setAuthorProfiles,
    buildProfilesForAuthors,
    rawResult,
    setResult
  } = useRedditStore();

  const { videoConfig, setVideoConfig, buildVideoConfigFromResult } = useVideoStore();
  const {
    colorArrangement,
    setColorArrangement,
    editorUiSettings,
    postAuthorSuffix,
    setPostAuthorSuffix,
    ...globalSettings
  } = useSettingsStore();

  const {
    globalProfiles,
    setGlobalProfile,
    removeGlobalProfile,
    batchSetGlobalProfiles,
  } = useIdentityStore();

  const [activeTab, setActiveTab] = useState('project');
  const [searchText, setSearchText] = useState('');
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [selectedSceneIds, setSelectedSceneIds] = useState<string[]>([]);

  // 获取题主作者
  const postAuthor = useMemo(() => {
    if (Array.isArray(rawResult) && rawResult.length >= 2) {
      return rawResult[0]?.data?.children?.[0]?.data?.author;
    }
    return '';
  }, [rawResult]);

  const activeCanvas = getActiveVideoCanvasSize(videoConfig);
  const totalFrames = getTotalFrames(videoConfig, DEFAULT_PREVIEW_FPS);
  const { frameOffset } = editorUiSettings.studio;

  // 过滤作者列表
  const filteredAuthors = useMemo(() => {
    const list = activeTab === 'project' ? allAuthors : Object.keys(globalProfiles);
    return list.filter(a =>
      a.toLowerCase().includes(searchText.toLowerCase()) ||
      ((activeTab === 'project' ? authorProfiles[a] : globalProfiles[a])?.alias || '').toLowerCase().includes(searchText.toLowerCase())
    );
  }, [activeTab, allAuthors, globalProfiles, authorProfiles, searchText]);

  // 查找包含该作者的场景
  const relatedScenesWithIndex = useMemo(() => {
    if (!selectedAuthor) return [];
    const profile = authorProfiles[selectedAuthor];
    const displayName = profile?.alias || selectedAuthor;

    return videoConfig.scenes
      .map((scene, index) => ({ scene, index }))
      .filter(({ scene }) => scene.items.some(item => item.author === displayName));
  }, [selectedAuthor, authorProfiles, videoConfig.scenes]);

  // 计算每个作者出现的画面格数量
  const authorSceneCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    // 创建一个反向映射：displayName -> originalAuthor
    const displayToOriginal: Record<string, string> = {};
    allAuthors.forEach(author => {
      const profile = authorProfiles[author];
      const displayName = profile?.alias || author;
      displayToOriginal[displayName] = author;
    });

    videoConfig.scenes.forEach(scene => {
      const sceneAuthors = new Set(scene.items.map(item => item.author));
      sceneAuthors.forEach(displayName => {
        const originalAuthor = displayToOriginal[displayName] || displayName;
        counts[originalAuthor] = (counts[originalAuthor] || 0) + 1;
      });
    });
    return counts;
  }, [allAuthors, authorProfiles, videoConfig.scenes]);

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minWidth: 0 }}>
          <Text strong ellipsis style={{ minWidth: 0, fontSize: '12px', color: isSelected ? 'var(--ant-primary-color)' : 'inherit' }}>
            {sceneIdx + 1}. {scene.title || '未命名画面'}
          </Text>
          <span style={{ flex: '0 0 auto', fontSize: '12px', fontWeight: 700, color: getDurationColor(scene.duration) }}>
            {formatDurationLabel(scene.duration)}
          </span>
        </div>
      </div>
    );
  };

  const syncProjectData = (nextProfiles: Record<string, AuthorProfile>) => {
    if (!rawResult) return;

    const nextResult = transformRedditJson(rawResult, {
      authorProfiles: nextProfiles,
      // 保持当前的排序和回复模式
      sortMode: (useRedditStore.getState() as any).sortMode || 'best',
      replyOrder: (useRedditStore.getState() as any).replyOrder || 'preserve',
      imageLayoutMode: (useSettingsStore.getState() as any).imageLayoutMode,
      contentFontColor: globalSettings.contentFontColor,
      contentFontBold: globalSettings.contentFontBold,
      authorFontSize: globalSettings.authorFontSize,
      authorFontBold: globalSettings.authorFontBold,
      contentFontSize: globalSettings.contentFontSize,
      titleFontSize: globalSettings.titleFontSize,
      titleFontColor: globalSettings.titleFontColor,
      titleFontBold: globalSettings.titleFontBold,
      titleAlignment: globalSettings.titleAlignment,
      canvas: videoConfig.canvas,
    });

    setResult(nextResult);
    const nextConfig = buildVideoConfigFromResult(nextResult, {
      titleAlignment: globalSettings.titleAlignment,
      titleFontSize: globalSettings.titleFontSize,
      contentFontSize: globalSettings.contentFontSize,
      authorFontSize: globalSettings.authorFontSize,
      quoteFontSize: globalSettings.quoteFontSize,
      titleFontColor: globalSettings.titleFontColor,
      contentFontColor: globalSettings.contentFontColor,
      quoteFontColor: globalSettings.quoteFontColor,
      titleFontBold: globalSettings.titleFontBold,
      contentFontBold: globalSettings.contentFontBold,
      authorFontBold: globalSettings.authorFontBold,
      quoteBackgroundColor: globalSettings.quoteBackgroundColor,
      quoteBorderColor: globalSettings.quoteBorderColor,
      maxQuoteDepth: globalSettings.maxQuoteDepth,
      defaultQuoteMaxLimit: globalSettings.defaultQuoteMaxLimit,
      sceneBackgroundColor: globalSettings.sceneBackgroundColor,
      sceneBackgroundColorEnd: globalSettings.sceneBackgroundColorEnd,
      sceneBackgroundGradientMode: globalSettings.sceneBackgroundGradientMode,
      itemBackgroundColor: globalSettings.itemBackgroundColor,
      itemBackgroundColorEnd: globalSettings.itemBackgroundColorEnd,
      itemBackgroundGradientMode: globalSettings.itemBackgroundGradientMode,
    });
    setVideoConfig(nextConfig);
  };

  const handleUpdateProfile = (author: string, updates: Partial<AuthorProfile>) => {
    let finalUpdates = { ...updates };
    
    // 如果是题主且正在修改代号，强制加上指定的后缀
    if (author === postAuthor && updates.alias !== undefined) {
      let newAlias = updates.alias.trim();
      if (newAlias && !newAlias.endsWith(postAuthorSuffix)) {
        finalUpdates.alias = `${newAlias}${postAuthorSuffix}`;
      }
    }

    if (activeTab === 'project') {
      const next = { ...authorProfiles, [author]: { ...(authorProfiles[author] || {}), ...finalUpdates, updatedAt: Date.now() } };
      setAuthorProfiles(next);
      syncProjectData(next);
    } else {
      const next = { ...(globalProfiles[author] || {}), ...finalUpdates, updatedAt: Date.now() };
      setGlobalProfile(author, next);
    }
  };

  const saveToGlobal = (author: string) => {
    const profile = authorProfiles[author];
    if (!profile) return;
    setGlobalProfile(author, profile);
    toast.success(`已将 u/${author} 保存到全局库`);
  };

  const loadFromGlobal = (author: string) => {
    const globalProfile = globalProfiles[author];
    if (!globalProfile) {
      toast.warning('全局库中未找到该用户');
      return;
    }
    const next = { ...authorProfiles, [author]: { ...globalProfile, updatedAt: Date.now() } };
    setAuthorProfiles(next);
    syncProjectData(next);
    toast.success(`已从全局库恢复 u/${author} 的配置`);
  };

  const syncAllFromGlobal = () => {
    let count = 0;
    const nextProfiles = { ...authorProfiles };
    allAuthors.forEach(author => {
      if (globalProfiles[author]) {
        let profile = { ...globalProfiles[author], updatedAt: Date.now() };
        
        // 如果是题主，确保有指定的后缀
        if (author === postAuthor && profile.alias && !profile.alias.endsWith(postAuthorSuffix)) {
          profile.alias = `${profile.alias}${postAuthorSuffix}`;
        }
        
        nextProfiles[author] = profile;
        count++;
      }
    });
    setAuthorProfiles(nextProfiles);
    syncProjectData(nextProfiles);
    toast.success(`已从全局库同步了 ${count} 个用户的配置`);
  };

  const saveAllToGlobal = () => {
    batchSetGlobalProfiles(authorProfiles);
    toast.success(`已将当前项目所有用户保存到全局库`);
  };

  const handleRandomize = () => {
    // 1. 先更新种子，确保生成不同的颜色和头像
    const newSeed = Math.floor(Math.random() * 10000000);
    setColorArrangement({ seed: newSeed });

    // 2. 使用新种子生成配置
    const nextProfiles = buildProfilesForAuthors(
      allAuthors,
      authorProfiles,
      { ...colorArrangement, seed: newSeed },
      { refreshColors: true, refreshAvatars: true, refreshAliases: true }
    );

    setAuthorProfiles(nextProfiles);
    syncProjectData(nextProfiles);
    toast.success('已重新随机生成所有代号、颜色和头像');
  };

  const handleRefreshAvatars = () => {
    const newSeed = Math.floor(Math.random() * 10000000);
    setColorArrangement({ seed: newSeed });
    const nextProfiles = buildProfilesForAuthors(allAuthors, authorProfiles, { ...colorArrangement, seed: newSeed }, { refreshAvatars: true });
    setAuthorProfiles(nextProfiles);
    syncProjectData(nextProfiles);
    toast.success('已重新随机生成所有头像');
  };

  const handleRefreshColors = () => {
    const newSeed = Math.floor(Math.random() * 10000000);
    setColorArrangement({ seed: newSeed });
    const nextProfiles = buildProfilesForAuthors(allAuthors, authorProfiles, { ...colorArrangement, seed: newSeed }, { refreshColors: true });
    setAuthorProfiles(nextProfiles);
    syncProjectData(nextProfiles);
    toast.success('已重新随机生成所有颜色');
  };

  const handleRefreshAliases = () => {
    const nextProfiles = buildProfilesForAuthors(allAuthors, authorProfiles, colorArrangement, { refreshAliases: true });
    setAuthorProfiles(nextProfiles);
    syncProjectData(nextProfiles);
    toast.success('已重新随机生成所有代号');
  };

  const handleClearAliases = () => {
    dialogs.confirm({
      title: '确认还原',
      content: '确定要将所有（包括当前项目和全局库）用户的代号还原为原始用户名吗？',
      okType: 'danger',
      onOk: () => {
        // 1. 还原当前项目的代号
        const next = { ...authorProfiles };
        Object.keys(next).forEach(author => {
          let alias = author;
          if (author === postAuthor) {
            alias = `${author}${postAuthorSuffix}`;
          }
          next[author] = { ...next[author], alias, updatedAt: Date.now() };
        });
        setAuthorProfiles(next);
        syncProjectData(next);

        // 2. 还原全局库的代号
        const nextGlobal = { ...globalProfiles };
        Object.keys(nextGlobal).forEach(author => {
          // 全局库还原时不带 OP 后缀，因为 OP 是项目特定的
          nextGlobal[author] = { ...nextGlobal[author], alias: author, updatedAt: Date.now() };
        });
        batchSetGlobalProfiles(nextGlobal);
        
        toast.success('已将所有代号还原为原始名称');
      }
    });
  };

  const handleDeleteGlobal = (author: string) => {
    dialogs.confirm({
      title: '确认删除',
      content: `确定要从全局身份库中删除 u/${author} 吗？`,
      okType: 'danger',
      onOk: () => {
        removeGlobalProfile(author);
        if (selectedAuthor === author) setSelectedAuthor(null);
        toast.success('已删除');
      }
    });
  };

  const { items: avatarItems, fetchAvatars } = useAvatarStore();

  useEffect(() => {
    if (avatarItems.length === 0) {
      fetchAvatars();
    }
  }, []);

  const currentProfile = useMemo(() => {
    if (!selectedAuthor) return null;
    return activeTab === 'project' ? authorProfiles[selectedAuthor] : globalProfiles[selectedAuthor];
  }, [selectedAuthor, activeTab, authorProfiles, globalProfiles]);

  const avatarPicker = (
    <div style={{ width: 320, maxHeight: 400, overflowY: 'auto', padding: 8 }}>
      <Row gutter={[8, 8]}>
        {(avatarItems.length > 0
          ? avatarItems.filter(i => i.enabled).map(i => i.path)
          : AVATAR_POOL.map(a => `public/avatar/${a}`)
        ).map(path => {
          const url = getAvatarUrl(path);
          const fileName = path.split('/').pop() || '';
          return (
            <Col span={6} key={path}>
              <Tooltip title={fileName}>
                <div
                  onClick={() => selectedAuthor && handleUpdateProfile(selectedAuthor, { avatar: path })}
                  style={{
                    cursor: 'pointer',
                    padding: 4,
                    borderRadius: 8,
                    border: currentProfile?.avatar === path ? '2px solid var(--ant-primary-color)' : '2px solid transparent',
                    background: currentProfile?.avatar === path ? 'rgba(24,144,255,0.1)' : 'transparent'
                  }}
                >
                  <Avatar src={url} shape="square" size={56} />
                </div>
              </Tooltip>
            </Col>
          );
        })}
      </Row>
      {avatarItems.some(i => !i.enabled) && (
        <div style={{ marginTop: 8, textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: '10px' }}>已隐藏禁用头像</Text>
        </div>
      )}
    </div>
  );

  return (
    <Layout style={{ height: 'calc(100vh - 120px)', background: 'transparent' }}>
      <Sider width={400} theme="dark" style={{ background: 'var(--panel-bg-darker)', borderRight: '1px solid var(--brand-border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 16px 0 16px' }}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            size="small"
            items={[
              { key: 'project', label: <Space><UsergroupAddOutlined />当前项目</Space> },
              { key: 'global', label: <Space><GlobalOutlined />全局库</Space> },
            ]}
          />

          <Space direction="vertical" style={{ width: '100%', marginTop: 12 }} size={12}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="搜索用户名或代号..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              allowClear
            />

            <div style={{ display: 'flex', gap: 4 }}>
              {activeTab === 'project' ? (
                <>
                  <Tooltip title="全随机生成"><Button size="small" icon={<ReloadOutlined />} onClick={handleRandomize} block /></Tooltip>
                  <Tooltip title="刷新头像"><Button size="small" icon={<UserOutlined />} onClick={handleRefreshAvatars} block /></Tooltip>
                  <Tooltip title="刷新颜色"><Button size="small" icon={<BgColorsOutlined />} onClick={handleRefreshColors} block /></Tooltip>
                  <Tooltip title="刷新代号"><Button size="small" icon={<FontSizeOutlined />} onClick={handleRefreshAliases} block /></Tooltip>
                  <Tooltip title="还原为原名"><Button size="small" danger icon={<ClearOutlined />} onClick={handleClearAliases} block /></Tooltip>
                </>
              ) : (
                <div style={{ display: 'flex', gap: 4, width: '100%' }}>
                  <Button size="small" danger icon={<ClearOutlined />} onClick={handleClearAliases} block>还原为原名</Button>
                  <Button size="small" danger icon={<DeleteOutlined />} onClick={() => dialogs.confirm({ title: '清空全局库', content: '确定要清空所有全局身份记录吗？', okType: 'danger', onOk: useIdentityStore.getState().clearGlobalLibrary })} block>清空库</Button>
                </div>
              )}
            </div>

            {activeTab === 'project' && (
              <Card size="small" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--brand-border)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>题主 (OP) 标识符设置</Text>
                  <Input 
                    size="small" 
                    value={postAuthorSuffix} 
                    onChange={e => setPostAuthorSuffix(e.target.value)}
                    placeholder="例如: (OP) 或 (帖子)"
                    suffix={
                      <Tooltip title="应用到当前项目所有题主">
                        <Button 
                          type="text" 
                          size="small" 
                          icon={<SyncOutlined />} 
                          onClick={() => {
                            const next = { ...authorProfiles };
                            allAuthors.forEach(author => {
                              if (author === postAuthor) {
                                let alias = next[author]?.alias || '';
                                // 移除旧后缀（如果有的话，这里简单处理，假设用户只是想换个后缀）
                                // 实际上更稳妥的方法是重新生成或正则替换
                                // 这里我们直接触发一次刷新代号逻辑
                                handleRefreshAliases();
                              }
                            });
                            toast.success('已更新题主标识符并刷新代号');
                          }} 
                        />
                      </Tooltip>
                    }
                  />
                </div>
              </Card>
            )}

            {activeTab === 'project' && (
              <div style={{ display: 'flex', gap: 4 }}>
                <Tooltip title="从全局库同步"><Button size="small" icon={<CloudDownloadOutlined />} onClick={syncAllFromGlobal} block>同步</Button></Tooltip>
                <Tooltip title="全部保存到全局库"><Button size="small" icon={<SaveOutlined />} onClick={saveAllToGlobal} block>保存</Button></Tooltip>
              </div>
            )}
          </Space>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
          <Table
            className="light-data-table"
            dataSource={filteredAuthors.map(a => ({ author: a }))}
            rowKey="author"
            size="small"
            pagination={false}
            onRow={(record) => ({
              onClick: () => setSelectedAuthor(record.author),
              style: { cursor: 'pointer', background: selectedAuthor === record.author ? 'var(--btn-primary-bg)' : 'transparent' }
            })}
            columns={[
              {
                title: '用户',
                dataIndex: 'author',
                render: (val) => {
                  const profile = activeTab === 'project' ? authorProfiles[val] : globalProfiles[val];
                  const inGlobal = activeTab === 'project' && !!globalProfiles[val];
                  
                  return (
                    <Space size="small">
                      <Badge dot={inGlobal} offset={[-2, 22]} color="cyan">
                        <Avatar
                          size="small"
                          src={getAvatarUrl(profile?.avatar)}
                          icon={<UserOutlined />}
                          style={{ backgroundColor: profile?.color || '#ccc' }}
                        />
                      </Badge>
                      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                        <Text style={{ 
                          color: selectedAuthor === val ? '#1890ff' : 'inherit', 
                          fontSize: 12,
                          fontWeight: selectedAuthor === val ? 600 : 400
                        }}>
                          u/{val}
                        </Text>
                        {profile?.alias && <Text type="secondary" style={{ fontSize: 10 }}>{profile.alias}</Text>}
                      </div>
                    </Space>
                  );
                }
              },
              {
                title: '屏数',
                key: 'sceneCount',
                width: 70,
                align: 'center',
                sorter: (a, b) => (authorSceneCounts[a.author] || 0) - (authorSceneCounts[b.author] || 0),
                render: (_, record) => {
                  const count = authorSceneCounts[record.author] || 0;
                  return (
                    <Tag bordered={false} style={{ fontSize: 10, margin: 0, opacity: count > 0 ? 1 : 0.5 }}>
                      {count} 屏
                    </Tag>
                  );
                }
              },
              {
                title: '操作',
                width: 50,
                align: 'right',
                render: (_, record) => (
                  activeTab === 'global' ? (
                    <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={(e) => { e.stopPropagation(); handleDeleteGlobal(record.author); }} />
                  ) : (
                    globalProfiles[record.author] ? <CheckCircleOutlined style={{ color: 'var(--ant-success-color)', fontSize: 12 }} /> : null
                  )
                )
              }
            ]}
          />
        </div>
      </Sider>

      <Content style={{ padding: 24, overflowY: 'auto' }}>
        {selectedAuthor ? (
          <Row gutter={24}>
            <Col span={10}>
              <Card
                title={
                  <Space>
                    <Avatar src={getAvatarUrl(currentProfile?.avatar)} style={{ backgroundColor: currentProfile?.color }} />
                    <span>{activeTab === 'project' ? '项目用户' : '全局身份'}: u/{selectedAuthor}</span>
                  </Space>
                }
                bordered={false}
                className="dark-card"
                extra={
                  currentProfile?.updatedAt && (
                    <Tooltip title={`最后更新: ${new Date(currentProfile.updatedAt).toLocaleString()}`}>
                      <HistoryOutlined style={{ color: 'var(--text-muted)' }} />
                    </Tooltip>
                  )
                }
              >
                <Space direction="vertical" style={{ width: '100%' }} size={20}>
                  <Row gutter={16} align="middle">
                    <Col span={8}>
                      <Text style={{ color: 'var(--text-secondary)' }}>头像</Text>
                      <div style={{ marginTop: 8 }}>
                        <Popover content={avatarPicker} trigger="click" placement="bottomLeft">
                          <div style={{ cursor: 'pointer', position: 'relative', width: 64, height: 64 }}>
                            <Avatar
                              shape="square"
                              size={64}
                              src={getAvatarUrl(currentProfile?.avatar)}
                              icon={<UserOutlined />}
                              style={{ backgroundColor: currentProfile?.color }}
                            />
                            <div style={{
                              position: 'absolute', bottom: 0, right: 0, background: 'rgba(0,0,0,0.5)',
                              width: '100%', textAlign: 'center', fontSize: 10, color: '#fff', padding: '2px 0'
                            }}>修改</div>
                          </div>
                        </Popover>
                      </div>
                    </Col>
                    <Col span={16}>
                      <Text style={{ color: 'var(--text-secondary)' }}>显示代号</Text>
                      <Input
                        value={currentProfile?.alias || ''}
                        onChange={e => handleUpdateProfile(selectedAuthor, { alias: e.target.value })}
                        placeholder="输入代号..."
                        size="large"
                        style={{ marginTop: 8 }}
                      />
                    </Col>
                  </Row>

                  <div>
                    <Text style={{ display: 'block', marginBottom: 8, color: 'var(--text-secondary)' }}>代表颜色</Text>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <Input
                        type="color"
                        value={currentProfile?.color || '#1890ff'}
                        onChange={e => handleUpdateProfile(selectedAuthor, { color: e.target.value })}
                        style={{ width: 60, height: 40, padding: 0, border: 'none', background: 'transparent' }}
                      />
                      <Input
                        value={currentProfile?.color || '#1890ff'}
                        onChange={e => handleUpdateProfile(selectedAuthor, { color: e.target.value })}
                        style={{ flex: 1 }}
                      />
                    </div>
                  </div>

                  <Divider style={{ margin: '12px 0' }} />

                  {activeTab === 'project' ? (
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
                        从全局库同步
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="primary"
                      icon={<ArrowRightOutlined />}
                      onClick={() => {
                        const next = { ...authorProfiles, [selectedAuthor]: { ...currentProfile, updatedAt: Date.now() } };
                        setAuthorProfiles(next);
                        toast.success(`已应用 u/${selectedAuthor} 到当前项目`);
                      }}
                      block
                      disabled={!allAuthors.includes(selectedAuthor)}
                    >
                      应用到当前项目
                    </Button>
                  )}

                  {activeTab === 'project' && globalProfiles[selectedAuthor] && (
                    <div style={{ padding: 12, background: 'rgba(24,144,255,0.05)', borderRadius: 8, border: '1px dashed var(--brand-border)' }}>
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text strong><GlobalOutlined /> 全局库记录</Text>
                          <Text type="secondary" style={{ fontSize: 10 }}>
                            {new Date(globalProfiles[selectedAuthor].updatedAt || 0).toLocaleDateString()}
                          </Text>
                        </div>
                        <Space>
                          <Avatar size="small" src={getAvatarUrl(globalProfiles[selectedAuthor].avatar)} style={{ backgroundColor: globalProfiles[selectedAuthor].color }} />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {globalProfiles[selectedAuthor].alias || '(无代号)'}
                          </Text>
                        </Space>
                      </Space>
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
                <Empty description={activeTab === 'project' ? "该用户在当前脚本中没有发言" : "全局身份仅供管理，不直接关联当前脚本"} style={{ marginTop: 100 }} />
              )}
            </Col>
          </Row>
        ) : (
          <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
            <UserOutlined style={{ fontSize: 64, color: 'var(--brand-border)', marginBottom: 16 }} />
            <Title level={3} style={{ color: 'var(--text-secondary)' }}>请从左侧选择一个用户进行编辑</Title>
            <Paragraph style={{ color: 'var(--text-muted)' }}>
              你可以管理用户的代号、颜色、头像，并查看其在视频中的实际显示效果。
            </Paragraph>
          </div>
        )}
      </Content>
    </Layout>
  );
};
