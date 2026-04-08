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
}

export interface VideoScene {
  id: string;
  type: 'post' | 'comments'; // 是原贴还是评论画面
  title?: string; // 画面标题或主要标识
  layout?: SceneLayoutType; // 内容布局：顶部开始或垂直居中
  duration: number; // 整个画面的显示时间 (秒)
  items: VideoContentItem[]; // 画面中包含的内容项 (评论)
}

export interface VideoConfig {
  title: string;
  subreddit: string;
  scenes: VideoScene[]; // 现在配置由画面格组成
}
