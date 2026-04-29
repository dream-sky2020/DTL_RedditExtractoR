import React, { useState } from 'react';
import {
  Space,
  Button,
  Typography,
  Divider,
  Form,
} from 'antd';
import {
  EditOutlined,
  DownOutlined,
  UpOutlined,
} from '@ant-design/icons';
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
import { BasicMetaSection } from './sections/BasicMetaSection';
import { SortStrategySection } from './sections/SortStrategySection';
import { LayoutSection } from './sections/LayoutSection';
import { CanvasConfigSection } from './sections/CanvasConfigSection';
import { TypographySection } from './sections/TypographySection';
import { DefaultColorsSection } from './sections/DefaultColorsSection';
import { QuoteStyleSection } from './sections/QuoteStyleSection';
import { PrivacyConfigPanel } from './panels/PrivacyConfigPanel';
import { QuickActionsPanel } from './panels/QuickActionsPanel';
import { SidebarWidthSection } from './sections/SidebarWidthSection';
import { StudioPreviewPanel } from './panels/StudioPreviewPanel';
import { EditorMultiSelectPanel } from './panels/EditorMultiSelectPanel';
import { HistoryPanel } from './panels/HistoryPanel';

const { Text } = Typography;

interface VideoSettingsSidebarProps {
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
  maxQuoteDepth: number;
  defaultQuoteMaxLimit: number;
  sceneBackgroundColor: string;
  itemBackgroundColor: string;
  quoteBackgroundColor: string;
  quoteBorderColor: string;
  
  // Handlers for Settings (Moving logic here)
  onApplyCommentSort: (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => void;
  onRandomizeAliasesAndApply: (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => void;
  onClearAliasesAndApply: (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => void;
  onRearrangeColorsAndApply: (sortMode: CommentSortMode, replyOrder: ReplyOrderMode, settings: ColorArrangementSettings) => void;
  onUpdateAuthorProfile: (author: string, updates: Partial<AuthorProfile>) => void;
  onImageLayoutModeChange: (mode: ImageLayoutMode) => void;
  onSceneLayoutChange: (layout: SceneLayoutType) => void;
  onTitleAlignmentChange: (alignment: TitleAlignmentType) => void;
  onTitleFontSizeChange: (size: number) => void;
  onContentFontSizeChange: (size: number) => void;
  onQuoteFontSizeChange: (size: number) => void;
  onMaxQuoteDepthChange: (depth: number) => void;
  onDefaultQuoteMaxLimitChange: (limit: number) => void;
  onSceneBackgroundColorChange: (color: string) => void;
  onItemBackgroundColorChange: (color: string) => void;
  onQuoteBackgroundColorChange: (color: string) => void;
  onQuoteBorderColorChange: (color: string) => void;
  onSetAllSceneLayouts: (layout: 'top' | 'center') => void;
  onSetAllSceneDurations: (duration: number) => void;
  onAddScene: () => void;

  // Shared Data
  canApplyCommentSort: boolean;
  allAuthors: string[];
  authorProfiles: Record<string, AuthorProfile>;
  colorArrangement: ColorArrangementSettings;
  setColorArrangement: (settings: ColorArrangementSettings | ((prev: ColorArrangementSettings) => ColorArrangementSettings)) => void;

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
  galleryPageSize?: number;
  setGalleryPageSize?: (size: number) => void;
  previewLayoutMode?: 'auto' | 'fixed';
  setPreviewLayoutMode?: (mode: 'auto' | 'fixed') => void;
  previewMinWidth?: number;
  setPreviewMinWidth?: (width: number) => void;
}

export const VideoSettingsSidebar: React.FC<VideoSettingsSidebarProps> = (props) => {
  const {
    sidebarWidth,
    SIDEBAR_MIN_WIDTH,
    SIDEBAR_MAX_WIDTH,
    FIXED_SIDEBAR_TOP_OFFSET,
    isSidebarResizing,
    startSidebarResize,
    updateSidebarWidthByInput,
    resetSidebarWidthToDefault,
    toolTitle = '操作面板',
    toolDesc,
    draftConfig,
    setDraftConfig,
    commentSortMode,
    replyOrderMode,
    imageLayoutMode,
    sceneLayout,
    titleAlignment,
    titleFontSize,
    contentFontSize,
    quoteFontSize,
    maxQuoteDepth,
    defaultQuoteMaxLimit,
    sceneBackgroundColor,
    itemBackgroundColor,
    quoteBackgroundColor,
    quoteBorderColor,
    onApplyCommentSort,
    onRandomizeAliasesAndApply,
    onClearAliasesAndApply,
    onRearrangeColorsAndApply,
    onUpdateAuthorProfile,
    onImageLayoutModeChange,
    onSceneLayoutChange,
    onTitleAlignmentChange,
    onTitleFontSizeChange,
    onContentFontSizeChange,
    onQuoteFontSizeChange,
    onMaxQuoteDepthChange,
    onDefaultQuoteMaxLimitChange,
    onSceneBackgroundColorChange,
    onItemBackgroundColorChange,
    onQuoteBackgroundColorChange,
    onQuoteBorderColorChange,
    onSetAllSceneLayouts,
    onSetAllSceneDurations,
    onAddScene,
    canApplyCommentSort,
    allAuthors,
    authorProfiles,
    colorArrangement,
    setColorArrangement,
    mode,
    // Editor specific
    isMultiSelectMode,
    setIsMultiSelectMode,
    selectedSceneIds,
    setSelectedSceneIds,
    onRemoveSelectedScenes,
    onOpenTranslationModal,
    // Studio specific
    galleryPageSize,
    setGalleryPageSize,
    previewLayoutMode,
    setPreviewLayoutMode,
    previewMinWidth,
    setPreviewMinWidth,
  } = props;

  const [isConfigCollapsed, setIsConfigCollapsed] = useState(false);
  const [isPrivacyCollapsed, setIsPrivacyCollapsed] = useState(false);
  const [isMultiSelectCollapsed, setIsMultiSelectCollapsed] = useState(false);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);

  return (
    <div
      id={`${mode}-page-sidebar`}
      style={{
        position: 'fixed',
        right: 0,
        top: FIXED_SIDEBAR_TOP_OFFSET,
        bottom: 0,
        width: sidebarWidth,
        overflowY: 'auto',
        zIndex: 20,
        borderLeft: '1px solid var(--brand-border)',
        background: 'var(--brand-dark)',
      }}
    >
      <div
        id={`${mode}-page-sidebar-resizer`}
        role="separator"
        aria-label="调整右侧面板宽度"
        onMouseDown={startSidebarResize}
        style={{
          position: 'absolute',
          left: -4,
          top: 0,
          bottom: 0,
          width: 8,
          cursor: 'col-resize',
          zIndex: 21,
          background: isSidebarResizing ? 'rgba(24,144,255,0.22)' : 'transparent',
        }}
      />
      <div
        id={`${mode}-page-sidebar-inner`}
        style={{
          borderRadius: 0,
          border: 'none',
          background: 'transparent',
          overflow: 'hidden',
        }}
      >
        <div
          id={`${mode}-page-sidebar-header`}
          style={{
            padding: '10px 14px',
            borderBottom: '1px solid var(--brand-border)',
            background: 'var(--brand-dark)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Space size="small">
            <EditOutlined style={{ color: 'var(--text-primary)' }} />
            <Text strong style={{ color: 'var(--text-primary)' }}>{toolTitle}</Text>
          </Space>
          {toolDesc && <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{toolDesc}</Text>}
        </div>

        <div id={`${mode}-page-sidebar-content`} style={{ padding: 16 }}>
          {/* Sidebar Width Config */}
          <SidebarWidthSection
            sidebarWidth={sidebarWidth}
            SIDEBAR_MIN_WIDTH={SIDEBAR_MIN_WIDTH}
            SIDEBAR_MAX_WIDTH={SIDEBAR_MAX_WIDTH}
            updateSidebarWidthByInput={updateSidebarWidthByInput}
            resetSidebarWidthToDefault={resetSidebarWidthToDefault}
          />

          {/* Studio Specific: Gallery Config */}
          {mode === 'studio' && setPreviewLayoutMode && (
            <StudioPreviewPanel
              previewLayoutMode={previewLayoutMode}
              setPreviewLayoutMode={setPreviewLayoutMode}
              previewMinWidth={previewMinWidth}
              setPreviewMinWidth={setPreviewMinWidth}
              galleryPageSize={galleryPageSize}
              setGalleryPageSize={setGalleryPageSize}
            />
          )}

          {/* Global Config Section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text strong style={{ color: 'var(--text-primary)' }}>整体配置</Text>
            <Button
              size="small"
              type="text"
              onClick={() => setIsConfigCollapsed((prev) => !prev)}
              icon={isConfigCollapsed ? <DownOutlined style={{ color: 'var(--text-primary)' }} /> : <UpOutlined style={{ color: 'var(--text-primary)' }} />}
              style={{ color: 'var(--text-primary)' }}
            >
              {isConfigCollapsed ? '展开' : '收起'}
            </Button>
          </div>
          {!isConfigCollapsed && (
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background: 'var(--panel-bg-darker)',
                border: '1px solid var(--brand-border)',
                marginBottom: 16,
              }}
            >
              <Form layout="vertical" variant="filled">
                <BasicMetaSection idPrefix={mode} draftConfig={draftConfig} setDraftConfig={setDraftConfig} />
                <SortStrategySection
                  idPrefix={mode}
                  editorSortMode={commentSortMode}
                  setEditorSortMode={(mode) => onApplyCommentSort(mode, replyOrderMode)}
                  editorReplyOrderMode={replyOrderMode}
                  setEditorReplyOrderMode={(order) => onApplyCommentSort(commentSortMode, order)}
                />
                <LayoutSection
                  idPrefix={mode}
                  titleAlignment={titleAlignment}
                  setTitleAlignment={onTitleAlignmentChange}
                  imageLayoutMode={imageLayoutMode}
                  setImageLayoutMode={onImageLayoutModeChange}
                  sceneLayout={sceneLayout}
                  setSceneLayout={onSceneLayoutChange}
                />
                <Divider style={{ margin: '12px 0', borderColor: 'var(--brand-border)' }} />
                <CanvasConfigSection idPrefix={mode} draftConfig={draftConfig} setDraftConfig={setDraftConfig} />
                <Divider style={{ margin: '12px 0', borderColor: 'var(--brand-border)' }} />
                <TypographySection
                  titleFontSize={titleFontSize}
                  setTitleFontSize={onTitleFontSizeChange}
                  contentFontSize={contentFontSize}
                  setContentFontSize={onContentFontSizeChange}
                  quoteFontSize={quoteFontSize}
                  setQuoteFontSize={onQuoteFontSizeChange}
                  maxQuoteDepth={maxQuoteDepth}
                  setMaxQuoteDepth={onMaxQuoteDepthChange}
                  defaultQuoteMaxLimit={defaultQuoteMaxLimit}
                  setDefaultQuoteMaxLimit={onDefaultQuoteMaxLimitChange}
                />
                <DefaultColorsSection
                  sceneBackgroundColor={sceneBackgroundColor}
                  setSceneBackgroundColor={onSceneBackgroundColorChange}
                  itemBackgroundColor={itemBackgroundColor}
                  setItemBackgroundColor={onItemBackgroundColorChange}
                />
                <Divider style={{ margin: '12px 0', borderColor: 'var(--brand-border)' }} />
                <QuoteStyleSection
                  quoteBackgroundColor={quoteBackgroundColor}
                  setQuoteBackgroundColor={onQuoteBackgroundColorChange}
                  quoteBorderColor={quoteBorderColor}
                  setQuoteBorderColor={onQuoteBorderColorChange}
                />
              </Form>
            </div>
          )}

          <Divider style={{ margin: '16px 0', borderColor: 'var(--brand-border)' }} />

          {/* Privacy Config Section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text strong style={{ color: 'var(--text-primary)' }}>用户隐私与身份映射</Text>
            <Button
              size="small"
              type="text"
              onClick={() => setIsPrivacyCollapsed((prev) => !prev)}
              icon={isPrivacyCollapsed ? <DownOutlined style={{ color: 'var(--text-primary)' }} /> : <UpOutlined style={{ color: 'var(--text-primary)' }} />}
              style={{ color: 'var(--text-primary)' }}
            >
              {isPrivacyCollapsed ? '展开' : '收起'}
            </Button>
          </div>
          {!isPrivacyCollapsed && (
            <PrivacyConfigPanel
              idPrefix={mode}
              editorColorArrangement={colorArrangement}
              setEditorColorArrangement={setColorArrangement}
              onRearrangeColorsAndApply={(sort, reply, settings) => onRearrangeColorsAndApply(sort, reply, settings)}
              editorSortMode={commentSortMode}
              editorReplyOrderMode={replyOrderMode}
              allAuthors={allAuthors}
              authorProfiles={authorProfiles}
              onUpdateAuthorProfile={onUpdateAuthorProfile}
            />
          )}

          <Divider style={{ margin: '16px 0', borderColor: 'var(--brand-border)' }} />

          {/* History Panel (Undo/Redo) */}
          <HistoryPanel 
            isCollapsed={isHistoryCollapsed} 
            setIsCollapsed={setIsHistoryCollapsed} 
          />

          <Divider style={{ margin: '16px 0', borderColor: 'var(--brand-border)' }} />

          {/* Multi-select Section (Available in both Editor and Studio) */}
          {setIsMultiSelectMode && selectedSceneIds && setSelectedSceneIds && (
            <>
              <EditorMultiSelectPanel
                isMultiSelectMode={Boolean(isMultiSelectMode)}
                setIsMultiSelectMode={setIsMultiSelectMode}
                selectedSceneIds={selectedSceneIds}
                setSelectedSceneIds={setSelectedSceneIds}
                isCollapsed={isMultiSelectCollapsed}
                setIsCollapsed={setIsMultiSelectCollapsed}
                onRemoveSelectedScenes={onRemoveSelectedScenes}
                onOpenTranslationModal={onOpenTranslationModal}
                draftConfig={draftConfig}
                setDraftConfig={setDraftConfig}
              />
              <Divider style={{ margin: '16px 0', borderColor: 'var(--brand-border)' }} />
            </>
          )}

          {/* Quick Actions Section */}
          <div style={{ marginBottom: 8 }}>
            <Text strong style={{ color: 'var(--text-primary)' }}>画面流快捷操作</Text>
          </div>
          <QuickActionsPanel
            idPrefix={mode}
            canApplyCommentSort={canApplyCommentSort}
            onApplyCommentSort={onApplyCommentSort}
            editorSortMode={commentSortMode}
            editorReplyOrderMode={replyOrderMode}
            allAuthors={allAuthors}
            onRandomizeAliasesAndApply={onRandomizeAliasesAndApply}
            onClearAliasesAndApply={onClearAliasesAndApply}
            setAllSceneLayouts={onSetAllSceneLayouts}
            setAllSceneDurations={onSetAllSceneDurations}
            addScene={onAddScene}
          />
        </div>
      </div>
    </div>
  );
};
