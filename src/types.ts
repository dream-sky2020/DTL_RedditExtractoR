export interface ReplyInfo {
  author: string;
  content: string; // 包含内容，用于预览回复路径
}

export interface VideoContentItem {
  id: string;
  author: string;
  content: string;
  image?: string;
  replyChain?: ReplyInfo[]; // 改为存储包含内容的回复链
}

export interface VideoScene {
  id: string;
  type: 'post' | 'comments'; // 是原贴还是评论画面
  title?: string; // 画面标题或主要标识
  duration: number; // 整个画面的显示时间 (秒)
  items: VideoContentItem[]; // 画面中包含的内容项 (评论)
}

export interface VideoConfig {
  title: string;
  subreddit: string;
  scenes: VideoScene[]; // 现在配置由画面格组成
}
