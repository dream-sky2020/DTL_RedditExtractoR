import React, { useState, useMemo, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Pagination,
  Empty,
  Space,
  InputNumber,
  Divider,
  Button,
  Modal,
  message,
} from 'antd';
import {
  FileImageOutlined,
} from '@ant-design/icons';
import {
  VideoPreviewPlayer,
  DEFAULT_PREVIEW_FPS,
  getTotalFrames,
  getSceneStartFrame,
} from '../../components/VideoPreviewPlayer';
import { VideoConfig, VideoScene, ImageLayoutMode, SceneLayoutType, TitleAlignmentType } from '../../types';
import { getActiveVideoCanvasSize, getAspectRatioLabel, normalizeVideoConfig, createDefaultVideoCanvasConfig } from '../../rendering/videoCanvas';
import { VideoSettingsSidebar } from '../../components/VideoSettingsSidebarCompont';
import { AuthorProfile, CommentSortMode, ReplyOrderMode, ColorArrangementSettings } from '../../types';
import { transformRedditJson } from '../../utils/redditTransformer';
import { generateRandomAliasProfiles } from '../../utils/aliasGenerator';
import { hslToHex } from '../../utils/color/hslToHex';
import { pseudoRandom01 } from '../../utils/random/pseudoRandom01';

const { Text } = Typography;
type PreviewLayoutMode = 'auto' | 'fixed';

interface StudioPageProps {
  videoConfig: VideoConfig;
  setVideoConfig: (config: VideoConfig) => void;
  draftConfig: VideoConfig;
  setDraftConfig: (config: VideoConfig) => void;
  persistVideoConfig: (config: VideoConfig) => void;
  onViewScene?: (idx: number) => void;
  
  commentSortMode: CommentSortMode;
  setCommentSortMode: React.Dispatch<React.SetStateAction<CommentSortMode>>;
  replyOrderMode: ReplyOrderMode;
  setReplyOrderMode: React.Dispatch<React.SetStateAction<ReplyOrderMode>>;
  
  rawResult: any;
  result: any;
  setResult: React.Dispatch<React.SetStateAction<any>>;
  
  colorArrangement: ColorArrangementSettings;
  setColorArrangement: React.Dispatch<React.SetStateAction<ColorArrangementSettings>>;
  
  allAuthors: string[];
  authorProfiles: Record<string, AuthorProfile>;
  setAuthorProfiles: React.Dispatch<React.SetStateAction<Record<string, AuthorProfile>>>;
  persistAuthorProfiles: (profiles: Record<string, AuthorProfile>) => void;
  
  imageLayoutMode: ImageLayoutMode;
  setImageLayoutMode: (mode: ImageLayoutMode) => void;
  sceneLayout: SceneLayoutType;
  setSceneLayout: (layout: SceneLayoutType) => void;
  titleAlignment: TitleAlignmentType;
  setTitleAlignment: (alignment: TitleAlignmentType) => void;
  titleFontSize: number;
  setTitleFontSize: (size: number) => void;
  contentFontSize: number;
  setContentFontSize: (size: number) => void;
  quoteFontSize: number;
  setQuoteFontSize: (size: number) => void;
  maxQuoteDepth: number;
  setMaxQuoteDepth: (depth: number) => void;
  defaultQuoteMaxLimit: number;
  setDefaultQuoteMaxLimit: (limit: number) => void;
  sceneBackgroundColor: string;
  setSceneBackgroundColor: (color: string) => void;
  itemBackgroundColor: string;
  setItemBackgroundColor: (color: string) => void;
  quoteBackgroundColor: string;
  setQuoteBackgroundColor: (color: string) => void;
  quoteBorderColor: string;
  setQuoteBorderColor: (color: string) => void;
}

export const StudioPage: React.FC<StudioPageProps> = ({
  videoConfig,
  setVideoConfig,
  draftConfig,
  setDraftConfig,
  persistVideoConfig,
  onViewScene,
  commentSortMode,
  setCommentSortMode,
  replyOrderMode,
  setReplyOrderMode,
  rawResult,
  result,
  setResult,
  colorArrangement,
  setColorArrangement,
  allAuthors,
  authorProfiles,
  setAuthorProfiles,
  persistAuthorProfiles,
  imageLayoutMode,
  setImageLayoutMode,
  sceneLayout,
  setSceneLayout,
  titleAlignment,
  setTitleAlignment,
  titleFontSize,
  setTitleFontSize,
  contentFontSize,
  setContentFontSize,
  quoteFontSize,
  setQuoteFontSize,
  maxQuoteDepth,
  setMaxQuoteDepth,
  defaultQuoteMaxLimit,
  setDefaultQuoteMaxLimit,
  sceneBackgroundColor,
  setSceneBackgroundColor,
  itemBackgroundColor,
  setItemBackgroundColor,
  quoteBackgroundColor,
  setQuoteBackgroundColor,
  quoteBorderColor,
  setQuoteBorderColor,
}) => {
  // ---------------------------------------------------------
  // 辅助函数 (原本在 App.tsx 中)
  // ---------------------------------------------------------
  
  const buildColorWithSettings = (index: number, settings: ColorArrangementSettings) => {
    const s = Math.max(20, Math.min(90, settings.saturation)) / 100;
    const l = Math.max(20, Math.min(80, settings.lightness)) / 100;
    const offset = ((settings.hueOffset % 360) + 360) % 360;
    const step = Math.max(1, Math.min(359, settings.hueStep));
    const hue = settings.mode === 'uniform'
      ? (offset + index * step) % 360
      : (offset + pseudoRandom01(settings.seed, index) * 360) % 360;
    return hslToHex(hue, s, l);
  };

  const buildProfilesForAuthors = (
    authors: string[],
    previousProfiles: Record<string, AuthorProfile>,
    settings: ColorArrangementSettings,
    overwriteColors = false,
  ) => {
    const nextProfiles: Record<string, AuthorProfile> = { ...previousProfiles };

    authors.forEach((author, index) => {
      const existing = nextProfiles[author] || {};
      if (overwriteColors || !existing.color) {
        nextProfiles[author] = {
          ...existing,
          color: buildColorWithSettings(index, settings),
        };
      }
    });

    return nextProfiles;
  };

  const buildVideoConfigFromResult = (
    nextResult: any,
    alignment: TitleAlignmentType = 'center',
    titleSize = 64,
    contentSize = 32,
    canvas = createDefaultVideoCanvasConfig()
  ): VideoConfig => {
    const postScene: VideoScene = {
      id: 'scene-post-' + Date.now(),
      type: 'post',
      title: '贴子正文',
      layout: 'top',
      duration: 5,
      items: [{
        id: 'post-content',
        author: nextResult.author,
        content: `[style size=${titleSize} b align=${alignment}]${nextResult.title}[/style]\n\n[style size=${contentSize}]${nextResult.content || ''}[/style]`,
      }]
    };

    const commentScenes: VideoScene[] = nextResult.comments.map((c: any) => ({
      id: 'scene-' + c.id,
      type: 'comments',
      title: `评论 u/${c.author}`,
      layout: 'center',
      duration: 3,
      items: [{
        id: c.id,
        author: c.author,
        content: `[style size=${contentSize}]${c.body}[/style]`,
        replyChain: c.replyChain
      }]
    }));

    return {
      title: nextResult.title,
      subreddit: nextResult.subreddit,
      scenes: [postScene, ...commentScenes],
      titleFontSize: titleSize,
      contentFontSize: contentSize,
      quoteFontSize: quoteFontSize,
      quoteBackgroundColor: quoteBackgroundColor,
      quoteBorderColor: quoteBorderColor,
      maxQuoteDepth: maxQuoteDepth,
      defaultQuoteMaxLimit: defaultQuoteMaxLimit,
      sceneBackgroundColor: sceneBackgroundColor,
      itemBackgroundColor: itemBackgroundColor,
      canvas,
    };
  };

  const rebuildFromRaw = (
    sortMode: CommentSortMode,
    replyOrder: ReplyOrderMode,
    profiles: Record<string, AuthorProfile>,
    successMessage: string,
  ) => {
    if (!rawResult) {
      message.warning('请先提取 Reddit 数据，再进行排序重排');
      return;
    }

    setCommentSortMode(sortMode);
    setReplyOrderMode(replyOrder);

    const nextResult = transformRedditJson(rawResult, {
      sortMode,
      replyOrder,
      authorProfiles: profiles,
      imageLayoutMode: draftConfig.imageLayoutMode,
    });
    const nextConfig = {
      ...buildVideoConfigFromResult(
        nextResult,
        titleAlignment,
        titleFontSize,
        contentFontSize,
        draftConfig.canvas || videoConfig.canvas || createDefaultVideoCanvasConfig()
      ),
      imageLayoutMode: draftConfig.imageLayoutMode,
    };

    setResult(nextResult);
    const normalizedConfig = normalizeVideoConfig(nextConfig);
    setVideoConfig(normalizedConfig);
    setDraftConfig(normalizedConfig);
    persistVideoConfig(normalizedConfig);
    message.success(successMessage);
  };

  // ---------------------------------------------------------
  // 核心逻辑处理器 (原本在 App.tsx / MainPages 中)
  // ---------------------------------------------------------

  const updateAuthorProfile = (
    author: string,
    updates: Partial<AuthorProfile>,
  ) => {
    const next = {
      ...authorProfiles,
      [author]: {
        ...(authorProfiles[author] || {}),
        ...updates,
      },
    };
    setAuthorProfiles(next);
    persistAuthorProfiles(next);
  };

  const handleApplyCommentSort = (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => {
    setCommentSortMode(sortMode);
    setReplyOrderMode(replyOrder);
    rebuildFromRaw(sortMode, replyOrder, authorProfiles, '评论排序已应用并重排脚本');
  };

  const handleRandomizeAliasesAndApply = (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => {
    setCommentSortMode(sortMode);
    setReplyOrderMode(replyOrder);
    const nextProfiles = generateRandomAliasProfiles(allAuthors, authorProfiles);
    setAuthorProfiles(nextProfiles);
    rebuildFromRaw(sortMode, replyOrder, nextProfiles, '已随机生成代号并重建脚本');
  };

  const handleClearAliasesAndApply = (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => {
    setCommentSortMode(sortMode);
    setReplyOrderMode(replyOrder);
    const nextProfiles: Record<string, AuthorProfile> = { ...authorProfiles };
    allAuthors.forEach((author) => {
      const existing = nextProfiles[author] || {};
      nextProfiles[author] = {
        ...existing,
        alias: '',
      };
    });
    setAuthorProfiles(nextProfiles);
    rebuildFromRaw(sortMode, replyOrder, nextProfiles, '已清空所有代号并重建脚本');
  };

  const handleRearrangeColorsAndApply = (
    sortMode: CommentSortMode,
    replyOrder: ReplyOrderMode,
    nextSettings: ColorArrangementSettings,
  ) => {
    setCommentSortMode(sortMode);
    setReplyOrderMode(replyOrder);
    const normalizedSettings = {
      ...nextSettings,
      saturation: Math.max(20, Math.min(90, nextSettings.saturation)),
      lightness: Math.max(20, Math.min(80, nextSettings.lightness)),
      hueStep: Math.max(1, Math.min(359, nextSettings.hueStep)),
    };
    setColorArrangement(normalizedSettings);
    const nextProfiles = buildProfilesForAuthors(allAuthors, authorProfiles, normalizedSettings, true);
    setAuthorProfiles(nextProfiles);
    rebuildFromRaw(sortMode, replyOrder, nextProfiles, '已按新规则重排颜色并重建脚本');
  };

  const handleImageLayoutModeChange = (mode: ImageLayoutMode) => {
    setImageLayoutMode(mode);
    const newConfig = normalizeVideoConfig({ ...videoConfig, imageLayoutMode: mode });
    setVideoConfig(newConfig);
    setDraftConfig(newConfig);
    persistVideoConfig(newConfig);
  };

  const handleSceneLayoutChange = (layout: SceneLayoutType) => {
    setSceneLayout(layout);
    const newScenes = videoConfig.scenes.map(s => ({ ...s, layout }));
    const newConfig = normalizeVideoConfig({ ...videoConfig, scenes: newScenes });
    setVideoConfig(newConfig);
    setDraftConfig(newConfig);
    persistVideoConfig(newConfig);
  };

  const handleTitleAlignmentChange = (alignment: TitleAlignmentType) => {
    setTitleAlignment(alignment);
    const newScenes = videoConfig.scenes.map(scene => {
      if (scene.type === 'post' && scene.items.length > 0) {
        const newItems = scene.items.map(item => {
          let newContent = item.content;
          if (newContent.includes('[style') && newContent.includes(' b')) {
            newContent = newContent.replace(/(\[style [^\]]*b[^\]]*)\]/, (match) => {
              if (match.includes('align=')) {
                return match.replace(/align=[^ \]]+/, `align=${alignment}`);
              } else {
                return match.slice(0, -1) + ` align=${alignment}]`;
              }
            });
          }
          return { ...item, content: newContent };
        });
        return { ...scene, items: newItems };
      }
      return scene;
    });
    const newConfig = normalizeVideoConfig({ ...videoConfig, scenes: newScenes, titleAlignment: alignment });
    setVideoConfig(newConfig);
    setDraftConfig(newConfig);
    persistVideoConfig(newConfig);
  };

  const handleTitleFontSizeChange = (size: number) => {
    setTitleFontSize(size);
    const newScenes = videoConfig.scenes.map(scene => {
      if (scene.type === 'post' && scene.items.length > 0) {
        const newItems = scene.items.map(item => {
          let newContent = item.content;
          if (newContent.includes('[style') && newContent.includes(' b')) {
            newContent = newContent.replace(/(\[style [^\]]*b[^\]]*)\]/, (match) => {
              if (match.includes('size=')) {
                return match.replace(/size=\d+/, `size=${size}`);
              } else {
                return match.slice(0, -1) + ` size=${size}]`;
              }
            });
          }
          return { ...item, content: newContent };
        });
        return { ...scene, items: newItems };
      }
      return scene;
    });
    const newConfig = normalizeVideoConfig({ ...videoConfig, scenes: newScenes, titleFontSize: size });
    setVideoConfig(newConfig);
    setDraftConfig(newConfig);
    persistVideoConfig(newConfig);
  };

  const handleContentFontSizeChange = (size: number) => {
    setContentFontSize(size);
    const newScenes = videoConfig.scenes.map(scene => {
      const newItems = scene.items.map(item => {
        let newContent = item.content;
        newContent = newContent.split(/(\[style [^\]]*\])/g).map(part => {
          if (part.startsWith('[style') && !part.includes(' b')) {
            if (part.includes('size=')) {
              return part.replace(/size=\d+/, `size=${size}`);
            } else {
              return part.slice(0, -1) + ` size=${size}]`;
            }
          }
          return part;
        }).join('');
        return { ...item, content: newContent };
      });
      return { ...scene, items: newItems };
    });
    const newConfig = normalizeVideoConfig({ ...videoConfig, scenes: newScenes, contentFontSize: size });
    setVideoConfig(newConfig);
    setDraftConfig(newConfig);
    persistVideoConfig(newConfig);
  };

  const handleQuoteFontSizeChange = (size: number) => {
    setQuoteFontSize(size);
    const newConfig = normalizeVideoConfig({ ...videoConfig, quoteFontSize: size });
    setVideoConfig(newConfig);
    setDraftConfig(newConfig);
    persistVideoConfig(newConfig);
  };

  const handleMaxQuoteDepthChange = (depth: number) => {
    setMaxQuoteDepth(depth);
    const newConfig = normalizeVideoConfig({ ...videoConfig, maxQuoteDepth: depth });
    setVideoConfig(newConfig);
    setDraftConfig(newConfig);
    persistVideoConfig(newConfig);
  };

  const handleDefaultQuoteMaxLimitChange = (limit: number) => {
    setDefaultQuoteMaxLimit(limit);
    const newConfig = normalizeVideoConfig({ ...videoConfig, defaultQuoteMaxLimit: limit });
    setVideoConfig(newConfig);
    setDraftConfig(newConfig);
    persistVideoConfig(newConfig);
  };

  const handleSceneBackgroundColorChange = (color: string) => {
    setSceneBackgroundColor(color);
    const newScenes = videoConfig.scenes.map(scene => ({
      ...scene,
      backgroundColor: color
    }));
    const newConfig = normalizeVideoConfig({ ...videoConfig, scenes: newScenes, sceneBackgroundColor: color });
    setVideoConfig(newConfig);
    setDraftConfig(newConfig);
    persistVideoConfig(newConfig);
  };

  const handleItemBackgroundColorChange = (color: string) => {
    setItemBackgroundColor(color);
    const newScenes = videoConfig.scenes.map(scene => ({
      ...scene,
      items: scene.items.map(item => ({ ...item, backgroundColor: color }))
    }));
    const newConfig = normalizeVideoConfig({ ...videoConfig, scenes: newScenes, itemBackgroundColor: color });
    setVideoConfig(newConfig);
    setDraftConfig(newConfig);
    persistVideoConfig(newConfig);
  };

  const handleQuoteBackgroundColorChange = (color: string) => {
    setQuoteBackgroundColor(color);
    const newConfig = normalizeVideoConfig({ ...videoConfig, quoteBackgroundColor: color });
    setVideoConfig(newConfig);
    setDraftConfig(newConfig);
    persistVideoConfig(newConfig);
  };

  const handleQuoteBorderColorChange = (color: string) => {
    setQuoteBorderColor(color);
    const newConfig = normalizeVideoConfig({ ...videoConfig, quoteBorderColor: color });
    setVideoConfig(newConfig);
    setDraftConfig(newConfig);
    persistVideoConfig(newConfig);
  };

  const setAllSceneLayouts = (layout: 'top' | 'center') => {
    const newScenes = videoConfig.scenes.map((s) => ({ ...s, layout }));
    const newConfig = normalizeVideoConfig({ ...videoConfig, scenes: newScenes });
    setVideoConfig(newConfig);
    setDraftConfig(newConfig);
    persistVideoConfig(newConfig);
    message.success(`已将全部画面格布局设为 ${layout}`);
  };

  const addScene = () => {
    const newScene: VideoScene = {
      id: 'scene-' + Date.now(),
      type: 'comments',
      title: '新建画面格',
      layout: 'top',
      backgroundColor: sceneBackgroundColor,
      duration: 5,
      items: [{
        id: 'item-' + Date.now(),
        author: 'NewUser',
        content: '',
      }]
    };
    const newConfig = normalizeVideoConfig({ ...videoConfig, scenes: [...videoConfig.scenes, newScene] });
    setVideoConfig(newConfig);
    setDraftConfig(newConfig);
    persistVideoConfig(newConfig);
  };

  // ---------------------------------------------------------
  // 原有的组件逻辑
  // ---------------------------------------------------------
  // Resizable Sidebar Logic (Mimicking EditorPage)
  const DEFAULT_SIDEBAR_WIDTH = 420;
  const SIDEBAR_MIN_WIDTH = 300;
  const SIDEBAR_MAX_WIDTH = 760;
  const FIXED_SIDEBAR_TOP_OFFSET = 64;
  const clampSidebarWidth = (nextWidth: number): number => {
    const viewportMax =
      typeof window === 'undefined' ? SIDEBAR_MAX_WIDTH : Math.floor(window.innerWidth * 0.72);
    const maxAllowed = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, viewportMax));
    return Math.min(maxAllowed, Math.max(SIDEBAR_MIN_WIDTH, Math.round(nextWidth)));
  };

  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isSidebarResizing, setIsSidebarResizing] = useState(false);
  const sidebarResizeRef = React.useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    if (!isSidebarResizing) return;

    const handleMouseMove = (event: MouseEvent) => {
      const resizeSnapshot = sidebarResizeRef.current;
      if (!resizeSnapshot) return;
      const deltaX = resizeSnapshot.startX - event.clientX;
      const nextWidth = clampSidebarWidth(resizeSnapshot.startWidth + deltaX);
      setSidebarWidth(nextWidth);
    };

    const handleMouseUp = () => {
      setIsSidebarResizing(false);
      sidebarResizeRef.current = null;
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isSidebarResizing]);

  const startSidebarResize = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    sidebarResizeRef.current = {
      startX: event.clientX,
      startWidth: sidebarWidth,
    };
    setIsSidebarResizing(true);
  };

  const updateSidebarWidthByInput = (value: number | null) => {
    if (value == null || Number.isNaN(value)) return;
    setSidebarWidth(clampSidebarWidth(value));
  };

  const resetSidebarWidthToDefault = () => {
    Modal.confirm({
      title: '还原右侧面板宽度',
      content: `确认将右侧面板宽度还原为默认值 ${DEFAULT_SIDEBAR_WIDTH}px 吗？`,
      okText: '确认还原',
      cancelText: '取消',
      onOk: () => {
        setSidebarWidth(clampSidebarWidth(DEFAULT_SIDEBAR_WIDTH));
        message.success('右侧面板宽度已还原为默认值');
      },
    });
  };

  // Gallery Logic
  const [galleryPage, setGalleryPage] = useState(1);
  const [galleryPageSize, setGalleryPageSize] = useState(12);
  const [previewLayoutMode, setPreviewLayoutMode] = useState<PreviewLayoutMode>('auto');
  const [previewMinWidth, setPreviewMinWidth] = useState(280);
  const [frameOffset, setFrameOffset] = useState(15);
  
  const fps = DEFAULT_PREVIEW_FPS;
  const activeCanvas = getActiveVideoCanvasSize(videoConfig);
  const activeAspectRatioLabel = getAspectRatioLabel(activeCanvas.width, activeCanvas.height);
  const scenes = videoConfig.scenes;
  const hasScenes = scenes && scenes.length > 0;
  const totalFrames = getTotalFrames(videoConfig, fps);

  const galleryStartIndex = (galleryPage - 1) * galleryPageSize;
  const visibleGalleryScenes = useMemo(
    () =>
      scenes
        .slice(galleryStartIndex, galleryStartIndex + galleryPageSize)
        .map((scene, offset) => ({
          scene,
          sceneIdx: galleryStartIndex + offset,
        })),
    [scenes, galleryStartIndex, galleryPageSize]
  );

  const isPortrait = activeCanvas.height > activeCanvas.width;
  const autoGridMinWidth = Math.max(180, Math.min(520, previewMinWidth));

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(scenes.length / galleryPageSize));
    if (galleryPage > maxPage) {
      setGalleryPage(maxPage);
    }
  }, [scenes.length, galleryPage, galleryPageSize]);

  // 渲染单张画面的播放器组件
  const FramePlayer = ({ idx }: { idx: number }) => (
    <div 
      style={{ 
        background: 'var(--brand-dark)', 
        borderRadius: 8, 
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: onViewScene ? 'pointer' : 'default',
      }}
      onClick={() => onViewScene?.(idx)}
    >
      <VideoPreviewPlayer
        videoConfig={videoConfig}
        durationInFrames={totalFrames}
        fps={fps}
        initialFrame={getSceneStartFrame(videoConfig, idx, fps) + frameOffset}
        key={`studio-scene-${idx}-${frameOffset}`}
        style={{
          width: '100%',
          aspectRatio: `${activeCanvas.width} / ${activeCanvas.height}`,
        }}
        controls={false}
        autoPlay={false}
      />
    </div>
  );

  return (
    <div id="studio-page-root" className="editor-page-container" style={{ position: 'relative' }}>
      <div id="studio-page-main-content" style={{ paddingRight: sidebarWidth + 24, paddingBottom: 40 }}>
        <Row gutter={[24, 24]}>
          <Col span={24}>
            <Card
              title={
                <Space>
                  <FileImageOutlined />
                  <span>图库预览 ({activeAspectRatioLabel})</span>
                </Space>
              }
              className="panel-card"
              bordered={false}
              extra={
                <Space size="middle">
                  <Space>
                    <Text type="secondary">预览帧偏移</Text>
                    <InputNumber 
                      size="small" 
                      min={0} 
                      max={300} 
                      value={frameOffset} 
                      onChange={(val) => setFrameOffset(val || 0)} 
                      addonAfter="帧"
                      style={{ width: 100 }}
                    />
                  </Space>
                  <Divider type="vertical" />
                </Space>
              }
            >
              <div style={{ padding: '20px 0' }}>
                {previewLayoutMode === 'auto' ? (
                  <>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(auto-fill, minmax(${autoGridMinWidth}px, 1fr))`,
                        gap: '16px 24px',
                        alignItems: 'start',
                      }}
                    >
                      {visibleGalleryScenes.map(({ scene, sceneIdx }) => (
                        <div key={scene.id} className="gallery-item-wrap">
                          <FramePlayer idx={sceneIdx} />
                          <div style={{ marginTop: 8, textAlign: 'center' }}>
                            <Text strong ellipsis style={{ width: '100%', display: 'block', fontSize: '12px' }}>
                              {sceneIdx + 1}. {scene.title || '未命名画面'}
                            </Text>
                          </div>
                        </div>
                      ))}
                    </div>
                    {!hasScenes && <Empty description="暂无画面格" />}
                  </>
                ) : (
                  <Row gutter={[16, 24]}>
                    {visibleGalleryScenes.map(({ scene, sceneIdx }) => (
                      <Col
                        xs={24}
                        sm={isPortrait ? 12 : 12}
                        md={isPortrait ? 12 : 8}
                        lg={isPortrait ? 8 : 6}
                        xl={isPortrait ? 6 : 4}
                        xxl={isPortrait ? 4 : 3}
                        key={scene.id}
                      >
                        <div className="gallery-item-wrap">
                          <FramePlayer idx={sceneIdx} />
                          <div style={{ marginTop: 8, textAlign: 'center' }}>
                            <Text strong ellipsis style={{ width: '100%', display: 'block', fontSize: '12px' }}>
                              {sceneIdx + 1}. {scene.title || '未命名画面'}
                            </Text>
                          </div>
                        </div>
                      </Col>
                    ))}
                    {!hasScenes && <Empty description="暂无画面格" />}
                  </Row>
                )}
                
                {scenes.length > galleryPageSize && (
                  <div style={{ marginTop: 30, display: 'flex', justifyContent: 'center' }}>
                    <Pagination
                      current={galleryPage}
                      pageSize={galleryPageSize}
                      total={scenes.length}
                      onChange={(page, size) => {
                        setGalleryPage(page);
                        setGalleryPageSize(size || 12);
                      }}
                      showSizeChanger
                      pageSizeOptions={['12', '24', '36', '48']}
                    />
                  </div>
                )}
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      <VideoSettingsSidebar
        mode="studio"
        sidebarWidth={sidebarWidth}
        SIDEBAR_MIN_WIDTH={SIDEBAR_MIN_WIDTH}
        SIDEBAR_MAX_WIDTH={SIDEBAR_MAX_WIDTH}
        FIXED_SIDEBAR_TOP_OFFSET={FIXED_SIDEBAR_TOP_OFFSET}
        isSidebarResizing={isSidebarResizing}
        startSidebarResize={startSidebarResize}
        updateSidebarWidthByInput={updateSidebarWidthByInput}
        resetSidebarWidthToDefault={resetSidebarWidthToDefault}
        toolTitle="Studio 操作面板"
        draftConfig={videoConfig}
        setDraftConfig={setVideoConfig}
        commentSortMode={commentSortMode}
        replyOrderMode={replyOrderMode}
        imageLayoutMode={imageLayoutMode}
        sceneLayout={sceneLayout}
        titleAlignment={titleAlignment}
        titleFontSize={titleFontSize}
        contentFontSize={contentFontSize}
        quoteFontSize={quoteFontSize}
        maxQuoteDepth={maxQuoteDepth}
        defaultQuoteMaxLimit={defaultQuoteMaxLimit}
        sceneBackgroundColor={sceneBackgroundColor}
        itemBackgroundColor={itemBackgroundColor}
        quoteBackgroundColor={quoteBackgroundColor}
        quoteBorderColor={quoteBorderColor}
        onApplyCommentSort={handleApplyCommentSort}
        onRandomizeAliasesAndApply={handleRandomizeAliasesAndApply}
        onClearAliasesAndApply={handleClearAliasesAndApply}
        onRearrangeColorsAndApply={handleRearrangeColorsAndApply}
        onUpdateAuthorProfile={updateAuthorProfile}
        onImageLayoutModeChange={handleImageLayoutModeChange}
        onSceneLayoutChange={handleSceneLayoutChange}
        onTitleAlignmentChange={handleTitleAlignmentChange}
        onTitleFontSizeChange={handleTitleFontSizeChange}
        onContentFontSizeChange={handleContentFontSizeChange}
        onQuoteFontSizeChange={handleQuoteFontSizeChange}
        onMaxQuoteDepthChange={handleMaxQuoteDepthChange}
        onDefaultQuoteMaxLimitChange={handleDefaultQuoteMaxLimitChange}
        onSceneBackgroundColorChange={handleSceneBackgroundColorChange}
        onItemBackgroundColorChange={handleItemBackgroundColorChange}
        onQuoteBackgroundColorChange={handleQuoteBackgroundColorChange}
        onQuoteBorderColorChange={handleQuoteBorderColorChange}
        onSetAllSceneLayouts={setAllSceneLayouts}
        onAddScene={addScene}
        canApplyCommentSort={!!rawResult}
        allAuthors={allAuthors}
        authorProfiles={authorProfiles}
        colorArrangement={colorArrangement}
        setColorArrangement={setColorArrangement}
        galleryPageSize={galleryPageSize}
        setGalleryPageSize={setGalleryPageSize}
        previewLayoutMode={previewLayoutMode}
        setPreviewLayoutMode={setPreviewLayoutMode}
        previewMinWidth={previewMinWidth}
        setPreviewMinWidth={setPreviewMinWidth}
      />
    </div>
  );
};

export default StudioPage;
