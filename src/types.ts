export type CommentSortMode = 'best' | 'top' | 'new' | 'old' | 'controversial';
export type ReplyOrderMode = 'preserve' | 'global';

export interface AuthorProfile {
  alias?: string;
  color?: string;
  avatar?: string;
  updatedAt?: number;
}

export type ColorArrangementMode = 'uniform' | 'randomized';

export interface ColorArrangementSettings {
  mode: ColorArrangementMode;
  hueOffset: number;
  hueStep: number;
  saturation: number;
  lightness: number;
  seed: number;
}

export interface GlobalSettings {
  commentSortMode: CommentSortMode;
  replyOrderMode: ReplyOrderMode;
  imageLayoutMode: 'gallery' | 'row' | 'single';
  sceneLayout: 'top' | 'center';
  titleAlignment: TitleAlignmentType;
  titleFontSize: number;
  contentFontSize: number;
  quoteFontSize: number;
  titleFontColor: string;
  contentFontColor: string;
  quoteFontColor: string;
  avatarSize: number;
  avatarShape: 'circle' | 'square';
  avatarOffset: number;
  titleFontBold: boolean;
  contentFontBold: boolean;
  authorFontSize: number;
  authorFontBold: boolean;
  maxQuoteDepth: number;
  defaultQuoteMaxLimit: number;
  sceneBackgroundColor: string;
  sceneBackgroundColorEnd: string;
  sceneBackgroundGradientMode: boolean;
  itemBackgroundColor: string;
  itemBackgroundColorEnd: string;
  itemBackgroundGradientMode: boolean;
  quoteBackgroundColor: string;
  quoteBorderColor: string;
  sceneDisplayMode: SceneDisplayMode;
  postAuthorSuffix: string;
}

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  commentSortMode: 'best',
  replyOrderMode: 'preserve',
  imageLayoutMode: 'gallery',
  sceneLayout: 'center',
  titleAlignment: 'center',
  titleFontSize: 64,
  contentFontSize: 32,
  quoteFontSize: 12,
  titleFontColor: '#ffffff',
  contentFontColor: '#ffffff',
  quoteFontColor: '#ffffff',
  avatarSize: 24,
  avatarShape: 'circle',
  avatarOffset: 0,
  titleFontBold: true,
  contentFontBold: false,
  authorFontSize: 24,
  authorFontBold: true,
  maxQuoteDepth: 4,
  defaultQuoteMaxLimit: 150,
  sceneBackgroundColor: '#ffffff',
  sceneBackgroundColorEnd: '#ffffff',
  sceneBackgroundGradientMode: false,
  itemBackgroundColor: 'transparent',
  itemBackgroundColorEnd: 'transparent',
  itemBackgroundGradientMode: false,
  quoteBackgroundColor: 'rgba(0, 0, 0, 0.04)',
  quoteBorderColor: '#e0e0e0',
  sceneDisplayMode: 'normal',
  postAuthorSuffix: ' (OP)',
};

export type ToolKey = 'extract' | 'projects' | 'raw_data' | 'filtered_data' | 'script_data' | 'editor' | 'preview' | 'render_tasks' | 'ad_placement' | 'background_video' | 'bgm_settings' | 'static_preview' | 'studio' | 'studio_scene' | 'frame_test' | 'simulation' | 'audio_preview' | 'component_test' | 'qwen_tts_try' | 'identity' | 'history_manager' | 'avatar_manager';

export interface ReplyInfo {
  author: string;
  content: string; // 包含内容，用于预览回复路径
}

export type ItemAnimationType =
  | 'none'
  | 'fade'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'zoom-in'
  | 'zoom-out';

export type SceneLayoutType = 'top' | 'center' | 'bottom';
export type TitleAlignmentType = 'left' | 'right' | 'center';
export type ImageLayoutMode = 'gallery' | 'row' | 'single';
export type SceneDisplayMode = 'normal' | 'compact';
export type VideoCanvasPreset = 'landscape' | 'portrait';

export interface VideoCanvasPresetSize {
  width: number;
  height: number;
}

export interface VideoCanvasConfig {
  activePreset: VideoCanvasPreset;
  presets: {
    landscape: VideoCanvasPresetSize;
    portrait: VideoCanvasPresetSize;
  };
}

export type RenderMode = 'preview' | 'final';
export type BackgroundVideoFit = 'cover' | 'contain' | 'fill';
export type BackgroundVideoContainPosition = 'center' | 'top' | 'bottom' | 'left' | 'right';
export type BackgroundImageMode = 'stretch' | 'contain' | 'cover' | 'repeat';
export type BackgroundVideoPlaybackMode = 'play-once' | 'repeat-count';
export type BackgroundVideoAfterEndMode = 'color' | 'image';
export type BackgroundVideoTimelineMode = 'cut-at-dsl-end' | 'wait-for-background';

export interface BackgroundVideoConfig {
  enabled?: boolean;
  src?: string;
  fit?: BackgroundVideoFit;
  containPosition?: BackgroundVideoContainPosition;
  opacity?: number;
  overlayColor?: string;
  blurredBackgroundEnabled?: boolean;
  blurredBackgroundBlur?: number;
  blurredBackgroundContain?: boolean;
  playbackRate?: number;
  startOffset?: number;
  audioEnabled?: boolean;
  audioVolume?: number;
  durationInSeconds?: number;
  playbackMode?: BackgroundVideoPlaybackMode;
  repeatCount?: number;
  afterEndMode?: BackgroundVideoAfterEndMode;
  afterEndColor?: string;
  afterEndImageSrc?: string;
  timelineMode?: BackgroundVideoTimelineMode;
  fadeOutDuration?: number;
}

export interface BgmConfig {
  enabled?: boolean;
  src?: string;
  volume?: number;
  loop?: boolean;
  fadeOutDuration?: number;
}

export interface VideoContentItem {
  id: string;
  author: string;
  content: string;
  image?: string;
  replyChain?: ReplyInfo[]; // 改为存储包含内容的回复链
  enterAt?: number; // 在场景内的进入时间(秒)
  exitAt?: number; // 在场景内的退出时间(秒)
  enterAnimation?: ItemAnimationType; // 进入动画
  exitAnimation?: ItemAnimationType; // 退出动画
  backgroundColor?: string; // 项背景颜色
  animateFrom?: string;
  animateTo?: string;
  animateStart?: number;
  animateDuration?: number;
  animateEasing?: string;
  offset?: string;
  sticky?: boolean | number;
  keyframes?: string;
  glass?: boolean;
  glassBlur?: number;
  glassOpacity?: number;
  glassBorderColor?: string;
  glassShadow?: string;
  glassDistort?: number;
  glassAberration?: number;
  glassEdgeGlow?: string;
  glassFresnel?: number;
  glassGrain?: number;
  glassRefraction?: number;
  backgroundImage?: string;
  backgroundImageMode?: BackgroundImageMode;
}

export interface VideoScene {
  id: string;
  type: 'post' | 'comments'; // 是原贴还是评论画面
  title?: string; // 画面标题或主要标识
  layout?: SceneLayoutType; // 内容布局：顶部开始或垂直居中
  backgroundColor?: string; // 场景背景颜色
  duration: number; // 整个画面的显示时间 (秒)
  items: VideoContentItem[]; // 画面中包含的内容项 (评论)
  itemSpacing?: number; // 项之间的间距 (像素)
  animateFrom?: string;
  animateTo?: string;
  animateStart?: number;
  animateDuration?: number;
  animateEasing?: string;
  offset?: string;
  keyframes?: string;
  backgroundImage?: string;
  backgroundImageMode?: BackgroundImageMode;
}

export interface VideoConfig {
  title: string;
  subreddit: string;
  scenes: VideoScene[]; // 现在配置由画面格组成
  imageLayoutMode?: ImageLayoutMode; // 图片排列模式
  titleAlignment?: TitleAlignmentType; // 标题对齐方式
  titleFontSize?: number; // 标题字体大小
  contentFontSize?: number; // 正文字体大小
  quoteFontSize?: number; // 引用块字体大小
  titleFontColor?: string; // 标题字体颜色
  contentFontColor?: string; // 正文字体颜色
  quoteFontColor?: string; // 引用块字体颜色
  titleFontBold?: boolean; // 标题是否加粗
  contentFontBold?: boolean; // 正文是否加粗
  authorFontSize?: number; // 作者字体大小
  authorFontBold?: boolean; // 作者是否加粗
  quoteBackgroundColor?: string; // 引用块默认背景颜色
  quoteBorderColor?: string; // 引用块默认边框颜色
  maxQuoteDepth?: number; // 最大嵌套深度
  defaultQuoteMaxLimit?: number; // 默认最大字数限制
  sceneBackgroundColor?: string; // 默认场景背景颜色
  itemBackgroundColor?: string; // 默认项背景颜色
  avatarSize?: number; // 默认头像大小
  avatarShape?: 'circle' | 'square'; // 默认头像形状
  avatarOffset?: number; // 默认头像偏移
  canvas?: VideoCanvasConfig; // 画布尺寸配置（横版/竖版）
  backgroundVideo?: BackgroundVideoConfig; // 最终导出专用背景视频
  bgm?: BgmConfig; // 全局背景音乐
  renderMode?: RenderMode; // preview 不渲染背景视频，final 才启用最终轨道
}

export interface AudioItem {
  name: string;
  path: string;
  url: string;
  alias: string;
  tags: string[];
  category?: string;
  previewVolume: number;
}
