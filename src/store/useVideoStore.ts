import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { VideoConfig, TitleAlignmentType } from '@/types';
import { createDefaultVideoCanvasConfig } from '@/rendering/videoCanvas';
import { VIDEO_CONFIG_STORAGE_KEY } from '@/constants/storage';

interface VideoState {
  videoConfig: VideoConfig;
  
  // Actions
  setVideoConfig: (config: VideoConfig) => void;
  
  buildVideoConfigFromResult: (
    nextResult: any,
    globalSettings: {
      titleAlignment: TitleAlignmentType;
      titleFontSize: number;
      contentFontSize: number;
      quoteFontSize: number;
      quoteBackgroundColor: string;
      quoteBorderColor: string;
      maxQuoteDepth: number;
      defaultQuoteMaxLimit: number;
      sceneBackgroundColor: string;
      itemBackgroundColor: string;
    }
  ) => VideoConfig;
}

export const useVideoStore = create<VideoState>()(
  persist(
    (set, get) => ({
      videoConfig: {
        title: '你的精彩标题',
        subreddit: 'interestingasfuck',
        canvas: createDefaultVideoCanvasConfig(),
        scenes: [
          {
            id: 'scene-main',
            type: 'post',
            title: '贴子正文',
            duration: 5,
            items: [
              {
                id: 'main-post',
                author: 'RedditUser',
                content: '这里是你的视频正文内容预览。你可以通过抓取 Reddit 链接自动填充，或者在这里手动修改。'
              }
            ]
          }
        ]
      },

      setVideoConfig: (videoConfig) => set({ videoConfig }),

      buildVideoConfigFromResult: (nextResult, globalSettings) => {
        const { 
          titleAlignment, titleFontSize, contentFontSize, 
          quoteFontSize, quoteBackgroundColor, quoteBorderColor,
          maxQuoteDepth, defaultQuoteMaxLimit, sceneBackgroundColor,
          itemBackgroundColor 
        } = globalSettings;

        const postScene = {
          id: 'scene-post-' + Date.now(),
          type: 'post' as const,
          title: '贴子正文',
          layout: 'top' as const,
          duration: 5,
          items: [{
            id: 'post-content',
            author: nextResult.author,
            content: `[style size=${titleFontSize} b align=${titleAlignment}]${nextResult.title}[/style]\n\n[style size=${contentFontSize}]${nextResult.content || ''}[/style]`,
          }]
        };

        const commentScenes = nextResult.comments.map((c: any) => ({
          id: 'scene-' + c.id,
          type: 'comments' as const,
          title: `评论 u/${c.author}`,
          layout: 'center' as const,
          duration: 3,
          items: [{
            id: c.id,
            author: c.author,
            content: `[style size=${contentFontSize}]${c.body}[/style]`,
            replyChain: c.replyChain
          }]
        }));

        return {
          title: nextResult.title,
          subreddit: nextResult.subreddit,
          scenes: [postScene, ...commentScenes],
          titleFontSize,
          contentFontSize,
          quoteFontSize,
          quoteBackgroundColor,
          quoteBorderColor,
          maxQuoteDepth,
          defaultQuoteMaxLimit,
          sceneBackgroundColor,
          itemBackgroundColor,
          canvas: createDefaultVideoCanvasConfig(),
        };
      },
    }),
    {
      name: VIDEO_CONFIG_STORAGE_KEY,
    }
  )
);
