import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { VideoConfig, TitleAlignmentType } from '@/types';
import { createDefaultVideoCanvasConfig } from '@/rendering/videoCanvas';
import { VIDEO_CONFIG_STORAGE_KEY } from '@/constants/storage';

interface VideoState {
  videoConfig: VideoConfig;
  past: VideoConfig[];
  future: VideoConfig[];
  
  // Actions
  setVideoConfig: (config: VideoConfig, skipHistory?: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
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

const HISTORY_LIMIT = 30;

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
      past: [],
      future: [],

      setVideoConfig: (videoConfig, skipHistory = false) => {
        const { videoConfig: currentConfig, past } = get();
        
        // 如果数据没变，不处理
        if (JSON.stringify(currentConfig) === JSON.stringify(videoConfig)) {
          return;
        }

        if (skipHistory) {
          set({ videoConfig });
          return;
        }

        const newPast = [currentConfig, ...past].slice(0, HISTORY_LIMIT);
        set({
          videoConfig,
          past: newPast,
          future: [] // 开启新分支时清空未来
        });
      },

      undo: () => {
        const { past, videoConfig, future } = get();
        if (past.length === 0) return;

        const previous = past[0];
        const newPast = past.slice(1);
        
        set({
          videoConfig: previous,
          past: newPast,
          future: [videoConfig, ...future].slice(0, HISTORY_LIMIT)
        });
      },

      redo: () => {
        const { future, videoConfig, past } = get();
        if (future.length === 0) return;

        const next = future[0];
        const newFuture = future.slice(1);

        set({
          videoConfig: next,
          past: [videoConfig, ...past].slice(0, HISTORY_LIMIT),
          future: newFuture
        });
      },

      canUndo: () => get().past.length > 0,
      canRedo: () => get().future.length > 0,

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
      partialize: (state) => ({
        videoConfig: state.videoConfig,
      }),
    }
  )
);
