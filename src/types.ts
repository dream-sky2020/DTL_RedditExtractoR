export type ToolKey = 'extract' | 'raw_data' | 'filtered_data' | 'script_data' | 'editor' | 'preview' | 'static_preview' | 'studio' | 'studio_scene' | 'frame_test' | 'simulation' | 'audio_preview' | 'component_test';

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

export type SceneLayoutType = 'top' | 'center';
export type TitleAlignmentType = 'left' | 'right' | 'center';
export type ImageLayoutMode = 'gallery' | 'row' | 'single';
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
}

export interface VideoScene {
  id: string;
  type: 'post' | 'comments'; // 是原贴还是评论画面
  title?: string; // 画面标题或主要标识
  layout?: SceneLayoutType; // 内容布局：顶部开始或垂直居中
  backgroundColor?: string; // 场景背景颜色
  duration: number; // 整个画面的显示时间 (秒)
  items: VideoContentItem[]; // 画面中包含的内容项 (评论)
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
  quoteBackgroundColor?: string; // 引用块默认背景颜色
  quoteBorderColor?: string; // 引用块默认边框颜色
  maxQuoteDepth?: number; // 最大嵌套深度
  defaultQuoteMaxLimit?: number; // 默认最大字数限制
  sceneBackgroundColor?: string; // 默认场景背景颜色
  itemBackgroundColor?: string; // 默认项背景颜色
  canvas?: VideoCanvasConfig; // 画布尺寸配置（横版/竖版）
}
