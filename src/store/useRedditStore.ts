import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import { message } from 'antd';
import { 
  transformRedditJson, 
  extractAuthorsFromRawData 
} from '@/utils/redditTransformer';
import { 
  AuthorProfile, 
  CommentSortMode, 
  ReplyOrderMode, 
  ColorArrangementSettings 
} from '@/types';
import { 
  RAW_REDDIT_DATA_STORAGE_KEY, 
  AUTHOR_PROFILES_STORAGE_KEY 
} from '@/constants/storage';
import { hslToHex } from '@/utils/color/hslToHex';
import { pseudoRandom01 } from '@/utils/random/pseudoRandom01';

interface RedditState {
  redditUrl: string;
  loading: boolean;
  result: any;
  rawResult: any;
  error: string;
  errorDebug: string;
  allAuthors: string[];
  authorProfiles: Record<string, AuthorProfile>;
  hasStoredRawData: boolean;

  // Actions
  setRedditUrl: (url: string) => void;
  setResult: (result: any) => void;
  setRawResult: (raw: any) => void;
  setAuthorProfiles: (profiles: Record<string, AuthorProfile>) => void;
  setAllAuthors: (authors: string[]) => void;
  setHasStoredRawData: (has: boolean) => void;
  
  fetchRedditData: (
    commentSortMode: CommentSortMode,
    replyOrderMode: ReplyOrderMode,
    colorArrangement: ColorArrangementSettings
  ) => Promise<void>;
  
  clearPersistedData: () => void;
  
  buildProfilesForAuthors: (
    authors: string[],
    previousProfiles: Record<string, AuthorProfile>,
    settings: ColorArrangementSettings,
    overwriteColors?: boolean
  ) => Record<string, AuthorProfile>;

  getProjectState: () => {
    redditUrl: string;
    result: any;
    rawResult: any;
    allAuthors: string[];
    authorProfiles: Record<string, AuthorProfile>;
    hasStoredRawData: boolean;
  };
  applyProjectState: (payload: {
    redditUrl: string;
    result: any;
    rawResult: any;
    allAuthors: string[];
    authorProfiles: Record<string, AuthorProfile>;
    hasStoredRawData: boolean;
  }) => void;
}

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

export const useRedditStore = create<RedditState>()(
  persist(
    (set, get) => ({
      redditUrl: '',
      loading: false,
      result: null,
      rawResult: null,
      error: '',
      errorDebug: '',
      allAuthors: [],
      authorProfiles: {},
      hasStoredRawData: false,

      setRedditUrl: (redditUrl) => set({ redditUrl }),
      setResult: (result) => set({ result }),
      setRawResult: (rawResult) => set({ rawResult }),
      setAuthorProfiles: (authorProfiles) => set({ authorProfiles }),
      setAllAuthors: (allAuthors) => set({ allAuthors }),
      setHasStoredRawData: (hasStoredRawData) => set({ hasStoredRawData }),

      buildProfilesForAuthors: (authors, previousProfiles, settings, overwriteColors = false) => {
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
      },

      getProjectState: () => {
        const state = get();
        return {
          redditUrl: state.redditUrl,
          result: state.result,
          rawResult: state.rawResult,
          allAuthors: state.allAuthors,
          authorProfiles: state.authorProfiles,
          hasStoredRawData: state.hasStoredRawData,
        };
      },

      applyProjectState: (payload) => {
        set({
          redditUrl: payload.redditUrl || '',
          result: payload.result ?? null,
          rawResult: payload.rawResult ?? null,
          allAuthors: Array.isArray(payload.allAuthors) ? payload.allAuthors : [],
          authorProfiles: payload.authorProfiles || {},
          hasStoredRawData: Boolean(payload.hasStoredRawData),
          loading: false,
          error: '',
          errorDebug: '',
        });
      },

      fetchRedditData: async (commentSortMode, replyOrderMode, colorArrangement) => {
        const { redditUrl, authorProfiles, buildProfilesForAuthors } = get();
        if (!redditUrl.trim()) return;

        set({ loading: true, error: '', errorDebug: '', result: null, rawResult: null });

        try {
          const inputUrl = redditUrl.trim();
          const parsed = new URL(inputUrl);
          const cleanPath = parsed.pathname.replace(/\/$/, '');
          parsed.pathname = cleanPath.endsWith('.json') ? cleanPath : `${cleanPath}.json`;
          parsed.searchParams.set('raw_json', '1');
          const jsonUrl = parsed.toString();
          const proxyUrl = `http://localhost:5000/fetch_reddit?url=${encodeURIComponent(jsonUrl)}`;
          
          const response = await axios.get(proxyUrl);
          
          const nextAuthors = extractAuthorsFromRawData(response.data);
          const nextProfiles = buildProfilesForAuthors(nextAuthors, authorProfiles, colorArrangement);
          
          const nextResult = transformRedditJson(response.data, {
            sortMode: commentSortMode,
            replyOrder: replyOrderMode,
            authorProfiles: nextProfiles,
          });

          // 更新 Reddit 数据
          set({
            allAuthors: nextAuthors,
            authorProfiles: nextProfiles,
            rawResult: response.data,
            result: nextResult,
            hasStoredRawData: true,
            loading: false
          });

          // 【关键修正】同时更新 VideoStore 中的配置，确保其他页面能看到新数据
          const videoStore = (await import('./useVideoStore')).useVideoStore.getState();
          const globalSettings = (await import('./useSettingsStore')).useSettingsStore.getState();
          
          const newConfig = videoStore.buildVideoConfigFromResult(nextResult, {
            titleAlignment: globalSettings.titleAlignment,
            titleFontSize: globalSettings.titleFontSize,
            contentFontSize: globalSettings.contentFontSize,
            quoteFontSize: globalSettings.quoteFontSize,
            quoteBackgroundColor: globalSettings.quoteBackgroundColor,
            quoteBorderColor: globalSettings.quoteBorderColor,
            maxQuoteDepth: globalSettings.maxQuoteDepth,
            defaultQuoteMaxLimit: globalSettings.defaultQuoteMaxLimit,
            sceneBackgroundColor: globalSettings.sceneBackgroundColor,
            itemBackgroundColor: globalSettings.itemBackgroundColor,
          });
          
          videoStore.setVideoConfig(newConfig);

          message.success('数据提取成功');
        } catch (err) {
          console.error(err);
          const errorMsg = '抓取失败，请检查 URL 是否正确或 Python 后端是否运行。';
          let errorDebug = '';
          if (axios.isAxiosError(err)) {
            errorDebug = JSON.stringify(err.response?.data || err.message, null, 2);
          } else {
            errorDebug = err instanceof Error ? err.message : String(err);
          }
          set({ error: errorMsg, errorDebug, loading: false });
        }
      },

      clearPersistedData: () => {
        set({
          hasStoredRawData: false,
          result: null,
          rawResult: null,
          allAuthors: [],
          authorProfiles: {},
          redditUrl: ''
        });
        message.success('已清除本地缓存的数据');
      },
    }),
    {
      name: 'reddit-storage', // 使用统一的前缀或单独的 key，这里暂时用这个，后面可以统一
      partialize: (state) => ({
        redditUrl: state.redditUrl,
        rawResult: state.rawResult,
        result: state.result,
        authorProfiles: state.authorProfiles,
        allAuthors: state.allAuthors,
        hasStoredRawData: state.hasStoredRawData,
      }),
    }
  )
);
