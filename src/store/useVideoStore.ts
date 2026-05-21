import { createIndexedDBWithMigration } from '@/utils/storageAdapter';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { VideoConfig, TitleAlignmentType, VideoCanvasConfig } from '@/types';
import { createDefaultVideoCanvasConfig, normalizeVideoConfig } from '@/rendering/videoCanvas';
import { VIDEO_CONFIG_STORAGE_KEY } from '@/constants/storage';
import { interpolateColor } from '@/utils/color/interpolateColor';

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
      authorFontSize: number;
      quoteFontSize: number;
      titleFontColor: string;
      contentFontColor: string;
      quoteFontColor: string;
      titleFontBold: boolean;
      contentFontBold: boolean;
      authorFontBold: boolean;
      quoteBackgroundColor: string;
      quoteBorderColor: string;
      maxQuoteDepth: number;
      defaultQuoteMaxLimit: number;
      sceneBackgroundColor: string;
      sceneBackgroundColorEnd: string;
      sceneBackgroundGradientMode: boolean;
      itemBackgroundColor: string;
      itemBackgroundColorEnd: string;
      itemBackgroundGradientMode: boolean;
      canvas?: VideoCanvasConfig;
    }
  ) => VideoConfig;

  getProjectState: () => {
    videoConfig: VideoConfig;
  };
  applyProjectState: (payload: { videoConfig: VideoConfig }) => void;
}

const HISTORY_LIMIT = 15;

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

      setVideoConfig: (newConfig, skipHistory = false) => {
        const { videoConfig: currentConfig, past } = get();
        const videoConfig = normalizeVideoConfig(newConfig);

        // 快速引用相等检查
        if (currentConfig === videoConfig) {
          return;
        }

        // 只有在引用不等时才进行昂贵的字符串化检查
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
          titleAlignment, titleFontSize, contentFontSize, authorFontSize,
          quoteFontSize, titleFontColor, contentFontColor,
          quoteFontColor, titleFontBold, contentFontBold, authorFontBold,
          quoteBackgroundColor, quoteBorderColor,
          maxQuoteDepth, defaultQuoteMaxLimit, 
          sceneBackgroundColor, sceneBackgroundColorEnd, sceneBackgroundGradientMode,
          itemBackgroundColor, itemBackgroundColorEnd, itemBackgroundGradientMode,
          canvas: globalCanvas
        } = globalSettings;

        const totalScenes = nextResult.comments.length + 1;

        const getSceneBg = (index: number) => {
          if (!sceneBackgroundGradientMode) return sceneBackgroundColor;
          const factor = totalScenes > 1 ? index / (totalScenes - 1) : 0;
          return interpolateColor(sceneBackgroundColor, sceneBackgroundColorEnd, factor);
        };

        const getItemBg = (index: number) => {
          if (!itemBackgroundGradientMode) return itemBackgroundColor;
          const factor = totalScenes > 1 ? index / (totalScenes - 1) : 0;
          return interpolateColor(itemBackgroundColor, itemBackgroundColorEnd, factor);
        };

        const postScene = {
          id: 'scene-post-' + Date.now(),
          type: 'post' as const,
          title: '贴子正文',
          layout: 'top' as const,
          duration: 5,
          backgroundColor: getSceneBg(0),
          items: [{
            id: 'post-content',
            author: nextResult.author,
            content: `${nextResult.title}\n\n${nextResult.content || ''}`,
            backgroundColor: getItemBg(0),
          }]
        };

        const commentScenes = nextResult.comments.map((c: any, idx: number) => ({
          id: 'scene-' + c.id,
          type: 'comments' as const,
          title: `评论 u/${c.author}`,
          layout: 'center' as const,
          duration: 3,
          backgroundColor: getSceneBg(idx + 1),
          items: [{
            id: c.id,
            author: c.author,
            content: `${c.body}`,
            replyChain: c.replyChain,
            backgroundColor: getItemBg(idx + 1),
          }]
        }));

        return {
          title: nextResult.title,
          subreddit: nextResult.subreddit,
          scenes: [postScene, ...commentScenes],
          titleFontSize,
          contentFontSize,
          authorFontSize,
          quoteFontSize,
          titleFontColor,
          contentFontColor,
          quoteFontColor,
          titleFontBold,
          contentFontBold,
          authorFontBold,
          quoteBackgroundColor,
          quoteBorderColor,
          maxQuoteDepth,
          defaultQuoteMaxLimit,
          sceneBackgroundColor,
          sceneBackgroundColorEnd,
          sceneBackgroundGradientMode,
          itemBackgroundColor,
          itemBackgroundColorEnd,
          itemBackgroundGradientMode,
          canvas: nextResult.canvas || globalCanvas || createDefaultVideoCanvasConfig(),
        };
      },

      getProjectState: () => ({
        videoConfig: get().videoConfig,
      }),

      applyProjectState: (payload) => {
        set({
          videoConfig: payload.videoConfig,
          past: [],
          future: [],
        });
      },
    }),
    {
      name: VIDEO_CONFIG_STORAGE_KEY,
      storage: createIndexedDBWithMigration(VIDEO_CONFIG_STORAGE_KEY),
      partialize: (state) => ({
        videoConfig: state.videoConfig,
      }),
    }
  )
);
