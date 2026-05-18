import { 
  VideoConfig, 
  ImageLayoutMode, 
  SceneLayoutType, 
  TitleAlignmentType,
  AuthorProfile, 
  CommentSortMode, 
  ReplyOrderMode,
  ColorArrangementSettings
} from '../../types';

export interface VideoSettingsSidebarProps {
  // Sidebar UI State
  sidebarWidth: number;
  SIDEBAR_MIN_WIDTH: number;
  SIDEBAR_MAX_WIDTH: number;
  FIXED_SIDEBAR_TOP_OFFSET: number;
  isSidebarResizing: boolean;
  startSidebarResize: (event: React.MouseEvent<HTMLDivElement>) => void;
  updateSidebarWidthByInput: (value: number | null) => void;
  resetSidebarWidthToDefault: () => void;

  // Header
  toolTitle?: string;
  toolDesc?: string;

  // Video Config & State
  draftConfig: VideoConfig;
  setDraftConfig: (config: VideoConfig) => void;
  
  // Shared Settings Logic
  commentSortMode: CommentSortMode;
  replyOrderMode: ReplyOrderMode;
  imageLayoutMode: ImageLayoutMode;
  sceneLayout: SceneLayoutType;
  titleAlignment: TitleAlignmentType;
  titleFontSize: number;
  contentFontSize: number;
  quoteFontSize: number;
  titleFontColor: string;
  contentFontColor: string;
  quoteFontColor: string;
  avatarSize: number;
  avatarShape: 'circle' | 'square';
  avatarOffset: number;
  titleFontBold: boolean;
  contentFontBold: boolean;
  maxQuoteDepth: number;
  defaultQuoteMaxLimit: number;
  sceneBackgroundColor: string;
  sceneBackgroundColorEnd: string;
  sceneBackgroundGradientMode: boolean;
  itemBackgroundColor: string;
  itemBackgroundColorEnd: string;
  itemBackgroundGradientMode: boolean;
  quoteBackgroundColor: string;
  quoteBorderColor: string;
  
  // Handlers for Settings (Moving logic here)
  onRefreshStyles: () => void;
  onRearrangeScenes: (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => void;
  onResetAndRebuild: (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => void;
  onApplyCommentSort: (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => void;
  onImageLayoutModeChange: (mode: ImageLayoutMode) => void;
  onSceneLayoutChange: (layout: SceneLayoutType) => void;
  onTitleAlignmentChange: (alignment: TitleAlignmentType) => void;
  onTitleFontSizeChange: (size: number) => void;
  onContentFontSizeChange: (size: number) => void;
  onQuoteFontSizeChange: (size: number) => void;
  onTitleFontColorChange: (color: string) => void;
  onContentFontColorChange: (color: string) => void;
  onQuoteFontColorChange: (color: string) => void;
  onTitleFontBoldChange: (bold: boolean) => void;
  onContentFontBoldChange: (bold: boolean) => void;
  onMaxQuoteDepthChange: (depth: number) => void;
  onDefaultQuoteMaxLimitChange: (limit: number) => void;
  onSceneBackgroundColorChange: (color: string) => void;
  onSceneBackgroundColorEndChange: (color: string) => void;
  onSceneBackgroundGradientModeChange: (mode: boolean) => void;
  onItemBackgroundColorChange: (color: string) => void;
  onItemBackgroundColorEndChange: (color: string) => void;
  onItemBackgroundGradientModeChange: (mode: boolean) => void;
  onQuoteBackgroundColorChange: (color: string) => void;
  onQuoteBorderColorChange: (color: string) => void;
  onAvatarSizeChange: (size: number) => void;
  onAvatarShapeChange: (shape: 'circle' | 'square') => void;
  onAvatarOffsetChange: (offset: number) => void;
  onRefreshAvatars: () => void;
  onRefreshColors: () => void;
  onAddScene: () => void;

  // Shared Data
  canApplyCommentSort: boolean;

  // Mode-Specific Features
  mode: 'editor' | 'studio';

  // Editor-Specific
  isMultiSelectMode?: boolean;
  setIsMultiSelectMode?: (mode: boolean) => void;
  selectedSceneIds?: string[];
  setSelectedSceneIds?: (ids: string[]) => void;
  onRemoveSelectedScenes?: () => void;
  onOpenTranslationModal?: () => void;

  // Studio-Specific
  galleryPage?: number;
  galleryPageSize?: number;
  setGalleryPageSize?: (size: number) => void;
  previewLayoutMode?: 'auto' | 'fixed';
  setPreviewLayoutMode?: (mode: 'auto' | 'fixed') => void;
  previewMinWidth?: number;
  setPreviewMinWidth?: (width: number) => void;
}
