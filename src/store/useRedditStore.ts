import { createIndexedDBWithMigration } from '@/utils/storageAdapter';
import { AUTHOR_PROFILES_STORAGE_KEY } from '@/constants/storage';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import { toast } from '@components/Toast';
import {
  transformRedditJson,
  extractAuthorsFromRawData
} from '@/utils/redditTransformer';
import {
  AuthorProfile,
  CommentSortMode,
  ReplyOrderMode,
  ColorArrangementSettings,
  VideoScene
} from '@/types';
import { AVATAR_POOL } from '@/constants/avatars';
import { useAvatarStore } from './useAvatarStore';
import { useSettingsStore } from './useSettingsStore';
import { hslToHex } from '@/utils/color/hslToHex';
import { pseudoRandom01 } from '@/utils/random/pseudoRandom01';

import { generateRandomAliasProfiles, nextUniqueAlias } from '@/utils/aliasGenerator';

type FetchRedditDataMode = 'replace' | 'append';

const suffixSceneIds = (scenes: VideoScene[], suffix: string): VideoScene[] =>
  scenes.map((scene) => ({
    ...scene,
    id: `${scene.id}-${suffix}`,
    items: scene.items.map((item) => ({
      ...item,
      id: `${item.id}-${suffix}`,
    })),
  }));

const uniqueAuthorsFromRawResults = (rawResults: any[]) => {
  const authors = rawResults.flatMap((raw) => extractAuthorsFromRawData(raw));
  return Array.from(new Set(authors));
};

interface RedditState {
  redditUrl: string;
  loading: boolean;
  result: any;
  rawResult: any;
  results: any[];
  rawResults: any[];
  error: string;
  errorDebug: string;
  allAuthors: string[];
  authorProfiles: Record<string, AuthorProfile>;
  hasStoredRawData: boolean;

  // Actions
  setRedditUrl: (url: string) => void;
  setResult: (result: any) => void;
  setRawResult: (raw: any) => void;
  setResults: (results: any[]) => void;
  setRawResults: (rawResults: any[]) => void;
  setAuthorProfiles: (profiles: Record<string, AuthorProfile>) => void;
  setAllAuthors: (authors: string[]) => void;
  setHasStoredRawData: (has: boolean) => void;
  removeRawResult: (index: number) => void;

  fetchRedditData: (
    commentSortMode: CommentSortMode,
    replyOrderMode: ReplyOrderMode,
    colorArrangement: ColorArrangementSettings,
    mode?: FetchRedditDataMode
  ) => Promise<void>;

  clearPersistedData: () => void;

  buildProfilesForAuthors: (
    authors: string[],
    previousProfiles: Record<string, AuthorProfile>,
    settings: ColorArrangementSettings,
    options?: {
      refreshColors?: boolean;
      refreshAvatars?: boolean;
      refreshAliases?: boolean;
    }
  ) => Record<string, AuthorProfile>;

  clearAllAliases: () => void;

  getProjectState: () => {
    redditUrl: string;
    result: any;
    rawResult: any;
    results: any[];
    rawResults: any[];
    allAuthors: string[];
    authorProfiles: Record<string, AuthorProfile>;
    hasStoredRawData: boolean;
  };
  applyProjectState: (payload: {
    redditUrl: string;
    result: any;
    rawResult: any;
    results?: any[];
    rawResults?: any[];
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
      results: [],
      rawResults: [],
      error: '',
      errorDebug: '',
      allAuthors: [],
      authorProfiles: {},
      hasStoredRawData: false,

      setRedditUrl: (redditUrl) => set({ redditUrl }),
      setResult: (result) => set({ result }),
      setRawResult: (rawResult) => set({ rawResult }),
      setResults: (results) => set({
        results,
        result: results[results.length - 1] ?? null,
      }),
      setRawResults: (rawResults) => set({
        rawResults,
        rawResult: rawResults[rawResults.length - 1] ?? null,
        hasStoredRawData: rawResults.length > 0,
      }),
      setAuthorProfiles: (authorProfiles) => set({ authorProfiles }),
      setAllAuthors: (allAuthors) => set({ allAuthors }),
      setHasStoredRawData: (hasStoredRawData) => set({ hasStoredRawData }),
      removeRawResult: (index) => {
        const { rawResults, results } = get();
        if (index < 0 || index >= rawResults.length) return;

        const nextRawResults = rawResults.filter((_, currentIndex) => currentIndex !== index);
        const nextResults = results.filter((_, currentIndex) => currentIndex !== index);

        set({
          rawResults: nextRawResults,
          results: nextResults,
          rawResult: nextRawResults[nextRawResults.length - 1] ?? null,
          result: nextResults[nextResults.length - 1] ?? null,
          allAuthors: uniqueAuthorsFromRawResults(nextRawResults),
          hasStoredRawData: nextRawResults.length > 0,
        });
      },

      buildProfilesForAuthors: (authors, previousProfiles, settings, options = {}) => {
        const { refreshColors, refreshAvatars, refreshAliases } = options;
        let nextProfiles: Record<string, AuthorProfile> = { ...previousProfiles };

        // 获取题主作者
        const { rawResult } = get();
        let postAuthor = '';
        if (Array.isArray(rawResult) && rawResult.length >= 2) {
          postAuthor = rawResult[0]?.data?.children?.[0]?.data?.author;
        }

        const { postAuthorSuffix } = (useSettingsStore.getState() as any);

        // 1. 处理代号刷新
        if (refreshAliases) {
          nextProfiles = generateRandomAliasProfiles(authors, nextProfiles, postAuthor, postAuthorSuffix);
        }

        // 2. 获取头像池
        const avatarStore = useAvatarStore.getState();
        let avatarPool = avatarStore.getEnabledAvatars();
        if (avatarPool.length === 0) {
          avatarPool = AVATAR_POOL.map(a => `public/avatar/${a}`);
        }

        // 3. 准备已使用的代号集合（用于补全缺失代号）
        const usedAliases = new Set<string>();
        Object.values(nextProfiles).forEach(p => {
          if (p.alias) usedAliases.add(p.alias.toLowerCase());
        });

        authors.forEach((author, index) => {
          const existing = nextProfiles[author] || {};
          const needsColor = refreshColors || !existing.color;
          const needsAvatar = refreshAvatars || !existing.avatar;
          const needsAlias = !existing.alias; // 即使不刷新，缺失的也要补全
          const isOP = postAuthor && author === postAuthor;
          const opMissingSuffix = isOP && existing.alias && !existing.alias.endsWith(postAuthorSuffix);

          if (needsColor || needsAvatar || needsAlias || opMissingSuffix) {
            const profile = { ...existing };
            if (needsColor) {
              profile.color = buildColorWithSettings(index, settings);
            }
            if (needsAvatar) {
              const avatarIdx = Math.floor(pseudoRandom01(settings.seed + 1, index) * avatarPool.length);
              profile.avatar = avatarPool[avatarIdx];
            }
            if (needsAlias) {
              let alias = nextUniqueAlias(usedAliases);
              if (isOP) {
                alias = `${alias}${postAuthorSuffix}`;
              }
              profile.alias = alias;
            } else if (opMissingSuffix) {
              profile.alias = `${existing.alias}${postAuthorSuffix}`;
            }
            profile.updatedAt = Date.now();
            nextProfiles[author] = profile;
          }
        });
        return nextProfiles;
      },

      clearAllAliases: () => {
        const { authorProfiles } = get();
        const next = { ...authorProfiles };
        Object.keys(next).forEach(author => {
          next[author] = { ...next[author], alias: '', updatedAt: Date.now() };
        });
        set({ authorProfiles: next });
      },

      getProjectState: () => {
        const state = get();
        return {
          redditUrl: state.redditUrl,
          result: state.result,
          rawResult: state.rawResult,
          results: state.results,
          rawResults: state.rawResults,
          allAuthors: state.allAuthors,
          authorProfiles: state.authorProfiles,
          hasStoredRawData: state.hasStoredRawData,
        };
      },

      applyProjectState: (payload) => {
        const rawResults = Array.isArray(payload.rawResults)
          ? payload.rawResults
          : payload.rawResult
            ? [payload.rawResult]
            : [];
        const results = Array.isArray(payload.results)
          ? payload.results
          : payload.result
            ? [payload.result]
            : [];

        set({
          redditUrl: payload.redditUrl || '',
          result: results[results.length - 1] ?? null,
          rawResult: rawResults[rawResults.length - 1] ?? null,
          results,
          rawResults,
          allAuthors: Array.isArray(payload.allAuthors) ? payload.allAuthors : [],
          authorProfiles: payload.authorProfiles || {},
          hasStoredRawData: rawResults.length > 0 || Boolean(payload.hasStoredRawData),
          loading: false,
          error: '',
          errorDebug: '',
        });
      },

      fetchRedditData: async (commentSortMode, replyOrderMode, colorArrangement, mode = 'replace') => {
        const { redditUrl, authorProfiles, buildProfilesForAuthors } = get();
        if (!redditUrl.trim()) return;

        set({
          loading: true,
          error: '',
          errorDebug: '',
          ...(mode === 'replace'
            ? {
                result: null,
                rawResult: null,
                results: [],
                rawResults: [],
                allAuthors: [],
                hasStoredRawData: false,
              }
            : {}),
        });

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
          const nextRawResults = mode === 'append'
            ? [...get().rawResults, response.data]
            : [response.data];
          const allAuthors = Array.from(new Set([...get().allAuthors, ...nextAuthors]));
          const nextProfiles = buildProfilesForAuthors(allAuthors, authorProfiles, colorArrangement);

          const globalSettings = (await import('./useSettingsStore')).useSettingsStore.getState();

          const nextResult = transformRedditJson(response.data, {
            sortMode: commentSortMode,
            replyOrder: replyOrderMode,
            authorProfiles: nextProfiles,
            imageLayoutMode: globalSettings.imageLayoutMode,
            contentFontColor: globalSettings.contentFontColor,
            contentFontBold: globalSettings.contentFontBold,
            authorFontSize: globalSettings.authorFontSize,
            authorFontBold: globalSettings.authorFontBold,
            contentFontSize: globalSettings.contentFontSize,
            titleFontSize: globalSettings.titleFontSize,
            titleFontColor: globalSettings.titleFontColor,
            titleFontBold: globalSettings.titleFontBold,
            titleAlignment: globalSettings.titleAlignment,
            avatarSize: globalSettings.avatarSize,
            avatarShape: globalSettings.avatarShape,
            avatarOffset: globalSettings.avatarOffset,
            maxQuoteDepth: globalSettings.maxQuoteDepth,
            quoteFontSize: globalSettings.quoteFontSize,
            quoteFontColor: globalSettings.quoteFontColor,
            quoteBackgroundColor: globalSettings.quoteBackgroundColor,
            quoteBorderColor: globalSettings.quoteBorderColor,
            sceneBackgroundColor: globalSettings.sceneBackgroundColor,
            sceneBackgroundColorEnd: globalSettings.sceneBackgroundColorEnd,
            sceneBackgroundGradientMode: globalSettings.sceneBackgroundGradientMode,
            itemBackgroundColor: globalSettings.itemBackgroundColor,
            itemBackgroundColorEnd: globalSettings.itemBackgroundColorEnd,
            itemBackgroundGradientMode: globalSettings.itemBackgroundGradientMode,
            canvas: (await import('./useVideoStore')).useVideoStore.getState().videoConfig.canvas,
          });

          // 更新 Reddit 数据
          const nextResults = mode === 'append'
            ? [...get().results, nextResult]
            : [nextResult];

          set({
            allAuthors,
            authorProfiles: nextProfiles,
            rawResults: nextRawResults,
            results: nextResults,
            rawResult: response.data,
            result: nextResult,
            hasStoredRawData: true,
            loading: false
          });

          // 【关键修正】同时更新 VideoStore 中的配置，确保其他页面能看到新数据
          const videoStore = (await import('./useVideoStore')).useVideoStore.getState();

          const newConfig = videoStore.buildVideoConfigFromResult(nextResult, {
            titleAlignment: globalSettings.titleAlignment,
            titleFontSize: globalSettings.titleFontSize,
            contentFontSize: globalSettings.contentFontSize,
            authorFontSize: globalSettings.authorFontSize,
            quoteFontSize: globalSettings.quoteFontSize,
            titleFontColor: globalSettings.titleFontColor,
            contentFontColor: globalSettings.contentFontColor,
            quoteFontColor: globalSettings.quoteFontColor,
            titleFontBold: globalSettings.titleFontBold,
            contentFontBold: globalSettings.contentFontBold,
            authorFontBold: globalSettings.authorFontBold,
            quoteBackgroundColor: globalSettings.quoteBackgroundColor,
            quoteBorderColor: globalSettings.quoteBorderColor,
            maxQuoteDepth: globalSettings.maxQuoteDepth,
            defaultQuoteMaxLimit: globalSettings.defaultQuoteMaxLimit,
            sceneBackgroundColor: globalSettings.sceneBackgroundColor,
            sceneBackgroundColorEnd: globalSettings.sceneBackgroundColorEnd,
            sceneBackgroundGradientMode: globalSettings.sceneBackgroundGradientMode,
            itemBackgroundColor: globalSettings.itemBackgroundColor,
            itemBackgroundColorEnd: globalSettings.itemBackgroundColorEnd,
            itemBackgroundGradientMode: globalSettings.itemBackgroundGradientMode,
          });

          if (mode === 'append') {
            const suffix = `append-${Date.now()}`;
            const currentConfig = videoStore.videoConfig;
            videoStore.setVideoConfig({
              ...currentConfig,
              scenes: [
                ...currentConfig.scenes,
                ...suffixSceneIds(newConfig.scenes, suffix),
              ],
            });
          } else {
            videoStore.setVideoConfig(newConfig);
          }

          toast.success(mode === 'append' ? '数据提取成功，已追加到当前脚本' : '数据提取成功');
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
          results: [],
          rawResults: [],
          allAuthors: [],
          authorProfiles: {},
          redditUrl: ''
        });
        toast.success('已清除本地缓存的数据');
      },
    }),
    {
      name: 'reddit-storage',
      storage: createIndexedDBWithMigration('reddit-storage'),
      onRehydrateStorage: (state) => {
        return (rehydratedState, error) => {
          if (error || !rehydratedState) return;

          const migratedRawResults = (!Array.isArray(rehydratedState.rawResults) || rehydratedState.rawResults.length === 0)
            && rehydratedState.rawResult
            ? [rehydratedState.rawResult]
            : rehydratedState.rawResults;
          const migratedResults = (!Array.isArray(rehydratedState.results) || rehydratedState.results.length === 0)
            && rehydratedState.result
            ? [rehydratedState.result]
            : rehydratedState.results;

          if (migratedRawResults !== rehydratedState.rawResults || migratedResults !== rehydratedState.results) {
            rehydratedState.setRawResults(Array.isArray(migratedRawResults) ? migratedRawResults : []);
            rehydratedState.setResults(Array.isArray(migratedResults) ? migratedResults : []);
          }

          // 兼容性迁移：如果现有的 authorProfiles 为空，尝试从旧的 AUTHOR_PROFILES_STORAGE_KEY 恢复
          if (Object.keys(rehydratedState.authorProfiles || {}).length === 0) {
            const legacyData = localStorage.getItem(AUTHOR_PROFILES_STORAGE_KEY);
            if (legacyData) {
              try {
                const parsed = JSON.parse(legacyData);
                if (parsed && typeof parsed === 'object') {
                  rehydratedState.setAuthorProfiles(parsed);
                  localStorage.removeItem(AUTHOR_PROFILES_STORAGE_KEY);
                  console.log('[useRedditStore] Migrated authorProfiles from legacy storage and cleared legacy key');
                }
              } catch (e) {
                console.error('[useRedditStore] Failed to migrate legacy authorProfiles:', e);
              }
            }
          }
        };
      },
      partialize: (state) => ({
        redditUrl: state.redditUrl,
        rawResult: state.rawResult, // 恢复持久化：现在使用 IndexedDB，空间不再是限制
        rawResults: state.rawResults,
        result: state.result,
        results: state.results,
        authorProfiles: state.authorProfiles,
        allAuthors: state.allAuthors,
        hasStoredRawData: state.hasStoredRawData,
      }),
    }
  )
);
