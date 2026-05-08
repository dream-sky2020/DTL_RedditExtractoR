import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  GlobalSettings, 
  DEFAULT_GLOBAL_SETTINGS, 
  CommentSortMode, 
  ReplyOrderMode, 
  TitleAlignmentType, 
  ColorArrangementSettings,
  SceneDisplayMode,
} from '@/types';
import { GLOBAL_CONFIG_STORAGE_KEY } from '@/constants/storage';

type PreviewLayoutMode = 'auto' | 'fixed';

interface StudioUiSettings {
  galleryPage: number;
  galleryPageSize: number;
  previewLayoutMode: PreviewLayoutMode;
  previewMinWidth: number;
  frameOffset: number;
}

interface EditorPaginationSettings {
  currentPage: number;
  pageSize: number;
}

interface MultiSelectUiSettings {
  historyLimit: number;
  batchSceneDuration: number;
  batchItemSpacing: number;
  offsetX: number;
  offsetY: number;
  stickyItemIndex: number;
  stickyValue: number | boolean;
  insertTextItemIndex: number;
  insertTextValue: string;
  animationItemIndex: number;
  animationKeyframes: string;
}

interface EditorUiSettings {
  studio: StudioUiSettings;
  editor: EditorPaginationSettings;
  multiSelect: MultiSelectUiSettings;
}

interface SettingsState extends GlobalSettings {
  colorArrangement: ColorArrangementSettings;
  editorUiSettings: EditorUiSettings;
  
  // Actions
  updateSettings: (settings: Partial<GlobalSettings>) => void;
  setColorArrangement: (settings: Partial<ColorArrangementSettings> | ((prev: ColorArrangementSettings) => ColorArrangementSettings)) => void;
  setStudioUiSettings: (settings: Partial<StudioUiSettings>) => void;
  setEditorPaginationSettings: (settings: Partial<EditorPaginationSettings>) => void;
  setMultiSelectUiSettings: (settings: Partial<MultiSelectUiSettings>) => void;
  
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
  setSceneBackgroundColorEnd: (color: string) => void;
  setSceneBackgroundGradientMode: (mode: boolean) => void;
  setItemBackgroundColorEnd: (color: string) => void;
  setItemBackgroundGradientMode: (mode: boolean) => void;
  setSceneDisplayMode: (mode: SceneDisplayMode) => void;
  getProjectState: () => GlobalSettings & { colorArrangement: ColorArrangementSettings };
  applyProjectState: (payload: Partial<GlobalSettings> & { colorArrangement?: ColorArrangementSettings }) => void;
}

const DEFAULT_COLOR_ARRANGEMENT: ColorArrangementSettings = {
  mode: 'uniform',
  hueOffset: 0,
  hueStep: 137.508,
  saturation: 68,
  lightness: 52,
  seed: 20260402,
};

const DEFAULT_EDITOR_UI_SETTINGS: EditorUiSettings = {
  studio: {
    galleryPage: 1,
    galleryPageSize: 12,
    previewLayoutMode: 'auto',
    previewMinWidth: 280,
    frameOffset: 15,
  },
  editor: {
    currentPage: 1,
    pageSize: 10,
  },
  multiSelect: {
    historyLimit: 2,
    batchSceneDuration: 3,
    batchItemSpacing: 12,
    offsetX: 0,
    offsetY: 0,
    stickyItemIndex: 1,
    stickyValue: 0.5,
    insertTextItemIndex: 1,
    insertTextValue: '',
    animationItemIndex: 1,
    animationKeyframes: '',
  },
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_GLOBAL_SETTINGS,
      colorArrangement: DEFAULT_COLOR_ARRANGEMENT,
      editorUiSettings: DEFAULT_EDITOR_UI_SETTINGS,

      updateSettings: (newSettings) => set((state) => ({ ...state, ...newSettings })),
      
      setColorArrangement: (newArrangement) => set((state) => ({
        colorArrangement: typeof newArrangement === 'function' 
          ? (newArrangement as any)(state.colorArrangement)
          : { ...state.colorArrangement, ...newArrangement }
      })),

      setStudioUiSettings: (newSettings) => set((state) => ({
        editorUiSettings: {
          ...state.editorUiSettings,
          studio: { ...state.editorUiSettings.studio, ...newSettings },
        },
      })),

      setEditorPaginationSettings: (newSettings) => set((state) => ({
        editorUiSettings: {
          ...state.editorUiSettings,
          editor: { ...state.editorUiSettings.editor, ...newSettings },
        },
      })),

      setMultiSelectUiSettings: (newSettings) => set((state) => ({
        editorUiSettings: {
          ...state.editorUiSettings,
          multiSelect: { ...state.editorUiSettings.multiSelect, ...newSettings },
        },
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
      setSceneBackgroundColorEnd: (sceneBackgroundColorEnd) => set({ sceneBackgroundColorEnd }),
      setSceneBackgroundGradientMode: (sceneBackgroundGradientMode) => set({ sceneBackgroundGradientMode }),
      setItemBackgroundColorEnd: (itemBackgroundColorEnd) => set({ itemBackgroundColorEnd }),
      setItemBackgroundGradientMode: (itemBackgroundGradientMode) => set({ itemBackgroundGradientMode }),
      setSceneDisplayMode: (sceneDisplayMode) => set({ sceneDisplayMode }),

      getProjectState: () => {
        const state = get();
        return {
          commentSortMode: state.commentSortMode,
          replyOrderMode: state.replyOrderMode,
          imageLayoutMode: state.imageLayoutMode,
          sceneLayout: state.sceneLayout,
          titleAlignment: state.titleAlignment,
          titleFontSize: state.titleFontSize,
          contentFontSize: state.contentFontSize,
          quoteFontSize: state.quoteFontSize,
          maxQuoteDepth: state.maxQuoteDepth,
          defaultQuoteMaxLimit: state.defaultQuoteMaxLimit,
          sceneBackgroundColor: state.sceneBackgroundColor,
          sceneBackgroundColorEnd: state.sceneBackgroundColorEnd,
          sceneBackgroundGradientMode: state.sceneBackgroundGradientMode,
          itemBackgroundColor: state.itemBackgroundColor,
          itemBackgroundColorEnd: state.itemBackgroundColorEnd,
          itemBackgroundGradientMode: state.itemBackgroundGradientMode,
          quoteBackgroundColor: state.quoteBackgroundColor,
          quoteBorderColor: state.quoteBorderColor,
          sceneDisplayMode: state.sceneDisplayMode,
          colorArrangement: state.colorArrangement,
        };
      },

      applyProjectState: (payload) => {
        set({
          ...DEFAULT_GLOBAL_SETTINGS,
          ...payload,
          colorArrangement: {
            ...DEFAULT_COLOR_ARRANGEMENT,
            ...(payload.colorArrangement || {}),
          },
        });
      },
    }),
    {
      name: GLOBAL_CONFIG_STORAGE_KEY,
    }
  )
);
