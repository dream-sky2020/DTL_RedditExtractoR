export interface VideoSegment {
  id: string;
  type: 'post' | 'comment';
  author: string;
  content: string;
  image?: string;
  duration: number; // 秒
  depth?: number;
  parentAuthor?: string;
}

export interface VideoConfig {
  title: string;
  subreddit: string;
  segments: VideoSegment[];
}
