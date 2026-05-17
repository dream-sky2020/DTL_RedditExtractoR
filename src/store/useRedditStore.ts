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
import { hslToHex } from '@/utils/color/hslToHex';
import { pseudoRandom01 } from '@/utils/random/pseudoRandom01';

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
    colorArrangement: ColorArrangementSettings,
    mode?: FetchRedditDataMode
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
        
        const avatarPool = [
          '01_dish.png', '02_dish_2.png', '03_dish_pile.png', '04_bowl.png', '05_apple_pie.png',
          '06_apple_pie_dish.png', '07_bread.png', '08_bread_dish.png', '09_baguette.png', '10_baguette_dish.png',
          '11_bun.png', '12_bun_dish.png', '13_bacon.png', '14_bacon_dish.png', '15_burger.png',
          '16_burger_dish.png', '17_burger_napkin.png', '18_burrito.png', '19_burrito_dish.png', '20_bagel.png',
          '21_bagel_dish.png', '22_cheesecake.png', '23_cheesecake_dish.png', '24_cheesepuff.png', '25_cheesepuff_bowl.png',
          '26_chocolate.png', '27_chocolate_dish.png', '28_cookies.png', '29_cookies_dish.png', '30_chocolatecake.png',
          '31_chocolatecake_dish.png', '32_curry.png', '33_curry_dish.png', '34_donut.png', '35_donut_dish.png',
          '36_dumplings.png', '37_dumplings_dish.png', '38_friedegg.png', '39_friedegg_dish.png', '40_eggsalad.png',
          '41_eggsalad_bowl.png', '42_eggtart.png', '43_eggtart_dish.png', '44_frenchfries.png', '45_frenchfries_dish.png',
          '46_fruitcake.png', '47_fruitcake_dish.png', '48_garlicbread.png', '49_garlicbread_dish.png', '50_giantgummybear.png',
          '51_giantgummybear_dish.png', '52_gingerbreadman.png', '53_gingerbreadman_dish.png', '54_hotdog.png', '55_hotdog_sauce.png',
          '56_hotdog_dish.png', '57_icecream.png', '58_icecream_bowl.png', '59_jelly.png', '60_jelly_dish.png',
          '61_jam.png', '62_jam_dish.png', '63_lemonpie.png', '64_lemonpie_dish.png', '65_loafbread.png',
          '66_loafbread_dish.png', '67_macncheese.png', '68_macncheese_dish.png', '69_meatball.png', '70_meatball_dish.png',
          '71_nacho.png', '72_nacho_dish.png', '73_omlet.png', '74_omlet_dish.png', '75_pudding.png',
          '76_pudding_dish.png', '77_potatochips.png', '78_potatochips_bowl.png', '79_pancakes.png', '80_pancakes_dish.png',
          '81_pizza.png', '82_pizza_dish.png', '83_popcorn.png', '84_popcorn_bowl.png', '85_roastedchicken.png',
          '86_roastedchicken_dish.png', '87_ramen.png', '88_salmon.png', '89_salmon_dish.png', '90_strawberrycake.png',
          '91_strawberrycake_dish.png', '92_sandwich.png', '93_sandwich_dish.png', '94_spaghetti.png', '95_steak.png',
          '96_steak_dish.png', '97_sushi.png', '98_sushi_dish.png', '99_taco.png', '100_taco_dish.png'
        ];

        authors.forEach((author, index) => {
          const existing = nextProfiles[author] || {};
          const needsColor = overwriteColors || !existing.color;
          const needsAvatar = !existing.avatar;

          if (needsColor || needsAvatar) {
            const profile = { ...existing };
            if (needsColor) {
              profile.color = buildColorWithSettings(index, settings);
            }
            if (needsAvatar) {
              const avatarIdx = Math.floor(pseudoRandom01(settings.seed + 1, index) * avatarPool.length);
              profile.avatar = `public/avatar/${avatarPool[avatarIdx]}`;
            }
            nextProfiles[author] = profile;
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

      fetchRedditData: async (commentSortMode, replyOrderMode, colorArrangement, mode = 'replace') => {
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
            titleFontColor: globalSettings.titleFontColor,
            contentFontColor: globalSettings.contentFontColor,
            quoteFontColor: globalSettings.quoteFontColor,
            titleFontBold: globalSettings.titleFontBold,
            contentFontBold: globalSettings.contentFontBold,
            quoteBackgroundColor: globalSettings.quoteBackgroundColor,
            quoteBorderColor: globalSettings.quoteBorderColor,
            maxQuoteDepth: globalSettings.maxQuoteDepth,
            defaultQuoteMaxLimit: globalSettings.defaultQuoteMaxLimit,
            sceneBackgroundColor: globalSettings.sceneBackgroundColor,
            itemBackgroundColor: globalSettings.itemBackgroundColor,
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
          allAuthors: [],
          authorProfiles: {},
          redditUrl: ''
        });
        toast.success('已清除本地缓存的数据');
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
