import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  GlobalSettings, 
  DEFAULT_GLOBAL_SETTINGS, 
  CommentSortMode, 
  ReplyOrderMode, 
  TitleAlignmentType, 
  ColorArrangementSettings 
} from '@/types';
import { GLOBAL_CONFIG_STORAGE_KEY } from '@/constants/storage';

interface SettingsState extends GlobalSettings {
  colorArrangement: ColorArrangementSettings;
  
  // Actions
  updateSettings: (settings: Partial<GlobalSettings>) => void;
  setColorArrangement: (settings: Partial<ColorArrangementSettings> | ((prev: ColorArrangementSettings) => ColorArrangementSettings)) => void;
  
  // Specific Setters (for compatibility with old code if needed)
  setCommentSortMode: (mode: CommentSortMode) => void;
  setReplyOrderMode: (mode: ReplyOrderMode) => void;
  setImageLayoutMode: (mode: 'gallery' | 'row' | 'single') => void;
  setSceneLayout: (layout: 'top' | 'center') => void;
  setTitleAlignment: (alignment: TitleAlignmentType) => void;
  setTitleFontSize: (size: number) => void;
  setContentFontSize: (size: number) => void;
  setQuoteFontSize: (size: number) => void;
  setMaxQuoteDepth: (depth: number) => void;
  setDefaultQuoteMaxLimit: (limit: number) => void;
  setSceneBackgroundColor: (color: string) => void;
  setItemBackgroundColor: (color: string) => void;
  setQuoteBackgroundColor: (color: string) => void;
  setQuoteBorderColor: (color: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_GLOBAL_SETTINGS,
      colorArrangement: {
        mode: 'uniform',
        hueOffset: 0,
        hueStep: 137.508,
        saturation: 68,
        lightness: 52,
        seed: 20260402,
      },

      updateSettings: (newSettings) => set((state) => ({ ...state, ...newSettings })),
      
      setColorArrangement: (newArrangement) => set((state) => ({
        colorArrangement: typeof newArrangement === 'function' 
          ? (newArrangement as any)(state.colorArrangement)
          : { ...state.colorArrangement, ...newArrangement }
      })),

      setCommentSortMode: (commentSortMode) => set({ commentSortMode }),
      setReplyOrderMode: (replyOrderMode) => set({ replyOrderMode }),
      setImageLayoutMode: (imageLayoutMode) => set({ imageLayoutMode }),
      setSceneLayout: (sceneLayout) => set({ sceneLayout }),
      setTitleAlignment: (titleAlignment) => set({ titleAlignment }),
      setTitleFontSize: (titleFontSize) => set({ titleFontSize }),
      setContentFontSize: (contentFontSize) => set({ contentFontSize }),
      setQuoteFontSize: (quoteFontSize) => set({ quoteFontSize }),
      setMaxQuoteDepth: (maxQuoteDepth) => set({ maxQuoteDepth }),
      setDefaultQuoteMaxLimit: (defaultQuoteMaxLimit) => set({ defaultQuoteMaxLimit }),
      setSceneBackgroundColor: (sceneBackgroundColor) => set({ sceneBackgroundColor }),
      setItemBackgroundColor: (itemBackgroundColor) => set({ itemBackgroundColor }),
      setQuoteBackgroundColor: (quoteBackgroundColor) => set({ quoteBackgroundColor }),
      setQuoteBorderColor: (quoteBorderColor) => set({ quoteBorderColor }),
    }),
    {
      name: GLOBAL_CONFIG_STORAGE_KEY,
    }
  )
);
