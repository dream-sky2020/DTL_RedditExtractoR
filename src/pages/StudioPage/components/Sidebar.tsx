import React, { useState } from 'react';
import {
  InputNumber,
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
  LayoutOutlined,
} from '@ant-design/icons';
import { Radio, Slider } from 'antd';
import { VideoConfig, ImageLayoutMode, SceneLayoutType, TitleAlignmentType } from '../../../types';
import { AuthorProfile, CommentSortMode, ReplyOrderMode } from '../../../utils/redditTransformer';
import { BasicMetaSection } from '../../../components/DashboardSettings/BasicMetaSection';
import { SortStrategySection } from '../../../components/DashboardSettings/SortStrategySection';
import { LayoutSection } from '../../../components/DashboardSettings/LayoutSection';
import { CanvasConfigSection } from '../../../components/DashboardSettings/CanvasConfigSection';
import { TypographySection } from '../../../components/DashboardSettings/TypographySection';
import { DefaultColorsSection } from '../../../components/DashboardSettings/DefaultColorsSection';
import { QuoteStyleSection } from '../../../components/DashboardSettings/QuoteStyleSection';
import { PrivacyConfigPanel } from '../../../components/DashboardSettings/PrivacyConfigPanel';
import { QuickActions } from '../../../components/DashboardSettings/QuickActions';

const { Text } = Typography;
type PreviewLayoutMode = 'auto' | 'fixed';

type ColorArrangementMode = 'uniform' | 'randomized';
interface ColorArrangementSettings {
  mode: ColorArrangementMode;
  hueOffset: number;
  hueStep: number;
  saturation: number;
  lightness: number;
  seed: number;
}

interface SidebarProps {
  sidebarWidth: number;
  FIXED_SIDEBAR_TOP_OFFSET: number;
  startSidebarResize: (event: React.MouseEvent<HTMLDivElement>) => void;
  isSidebarResizing: boolean;
  SIDEBAR_MIN_WIDTH: number;
  SIDEBAR_MAX_WIDTH: number;
  updateSidebarWidthByInput: (value: number | null) => void;
  resetSidebarWidthToDefault: () => void;
  videoConfig: VideoConfig;
  setVideoConfig: (config: VideoConfig) => void;
  commentSortMode: CommentSortMode;
  replyOrderMode: ReplyOrderMode;
  imageLayoutMode: ImageLayoutMode;
  setImageLayoutMode: (mode: ImageLayoutMode) => void;
  sceneLayout: SceneLayoutType;
  setSceneLayout: (layout: SceneLayoutType) => void;
  titleAlignment: TitleAlignmentType;
  setTitleAlignment: (alignment: TitleAlignmentType) => void;
  titleFontSize: number;
  setTitleFontSize: (size: number) => void;
  contentFontSize: number;
  setContentFontSize: (size: number) => void;
  quoteFontSize: number;
  setQuoteFontSize: (size: number) => void;
  maxQuoteDepth: number;
  setMaxQuoteDepth: (depth: number) => void;
  defaultQuoteMaxLimit: number;
  setDefaultQuoteMaxLimit: (limit: number) => void;
  sceneBackgroundColor: string;
  setSceneBackgroundColor: (color: string) => void;
  itemBackgroundColor: string;
  setItemBackgroundColor: (color: string) => void;
  quoteBackgroundColor: string;
  setQuoteBackgroundColor: (color: string) => void;
  quoteBorderColor: string;
  setQuoteBorderColor: (color: string) => void;
  canApplyCommentSort: boolean;
  onApplyCommentSort: (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => void;
  allAuthors: string[];
  onRandomizeAliasesAndApply: (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => void;
  onClearAliasesAndApply: (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => void;
  colorArrangement: ColorArrangementSettings;
  onRearrangeColorsAndApply: (
    sortMode: CommentSortMode, 
    replyOrder: ReplyOrderMode, 
    settings: ColorArrangementSettings
  ) => void;
  authorProfiles: Record<string, AuthorProfile>;
  onUpdateAuthorProfile: (author: string, updates: Partial<AuthorProfile>) => void;
  setAllSceneLayouts: (layout: 'top' | 'center') => void;
  addScene: () => void;
  
  // Gallery specific
  galleryPageSize: number;
  setGalleryPageSize: (size: number) => void;
  previewLayoutMode: PreviewLayoutMode;
  setPreviewLayoutMode: (mode: PreviewLayoutMode) => void;
  previewMinWidth: number;
  setPreviewMinWidth: (width: number) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sidebarWidth,
  FIXED_SIDEBAR_TOP_OFFSET,
  startSidebarResize,
  isSidebarResizing,
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_MAX_WIDTH,
  updateSidebarWidthByInput,
  resetSidebarWidthToDefault,
  videoConfig,
  setVideoConfig,
  commentSortMode,
  replyOrderMode,
  imageLayoutMode,
  setImageLayoutMode,
  sceneLayout,
  setSceneLayout,
  titleAlignment,
  setTitleAlignment,
  titleFontSize,
  setTitleFontSize,
  contentFontSize,
  setContentFontSize,
  quoteFontSize,
  setQuoteFontSize,
  maxQuoteDepth,
  setMaxQuoteDepth,
  defaultQuoteMaxLimit,
  setDefaultQuoteMaxLimit,
  sceneBackgroundColor,
  setSceneBackgroundColor,
  itemBackgroundColor,
  setItemBackgroundColor,
  quoteBackgroundColor,
  setQuoteBackgroundColor,
  quoteBorderColor,
  setQuoteBorderColor,
  canApplyCommentSort,
  onApplyCommentSort,
  allAuthors,
  onRandomizeAliasesAndApply,
  onClearAliasesAndApply,
  colorArrangement,
  onRearrangeColorsAndApply,
  authorProfiles,
  onUpdateAuthorProfile,
  setAllSceneLayouts,
  addScene,
  galleryPageSize,
  setGalleryPageSize,
  previewLayoutMode,
  setPreviewLayoutMode,
  previewMinWidth,
  setPreviewMinWidth,
}) => {
  const [isConfigCollapsed, setIsConfigCollapsed] = useState(false);
  const [isPrivacyCollapsed, setIsPrivacyCollapsed] = useState(false);

  const [editorSortMode, setEditorSortMode] = useState<CommentSortMode>(commentSortMode);
  const [editorReplyOrderMode, setEditorReplyOrderMode] = useState<ReplyOrderMode>(replyOrderMode);
  const [editorColorArrangement, setEditorColorArrangement] = useState<ColorArrangementSettings>(colorArrangement);

  React.useEffect(() => {
    setEditorSortMode(commentSortMode);
  }, [commentSortMode]);

  React.useEffect(() => {
    setEditorReplyOrderMode(replyOrderMode);
  }, [replyOrderMode]);

  React.useEffect(() => {
    setEditorColorArrangement(colorArrangement);
  }, [colorArrangement]);

  return (
    <div
      id="studio-page-sidebar"
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
        id="studio-page-sidebar-resizer"
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
        id="studio-page-sidebar-inner"
        style={{
          borderRadius: 0,
          border: 'none',
          background: 'transparent',
          overflow: 'hidden',
        }}
      >
        <div
          id="studio-page-sidebar-header"
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
            <Text id="studio-page-sidebar-title" strong style={{ color: 'var(--text-primary)' }}>Studio 操作面板</Text>
          </Space>
        </div>

        <div id="studio-page-sidebar-content" style={{ padding: 16 }}>
          {/* Sidebar Width Config */}
          <div
            id="studio-page-sidebar-width-config"
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 8,
              border: '1px solid var(--brand-border)',
              background: 'var(--panel-bg-translucent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px'
            }}
          >
            <Text strong style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>侧栏宽度</Text>
            <Space size="small" align="center">
              <Space.Compact style={{ width: 110 }}>
                <InputNumber
                  id="studio-page-sidebar-width-input"
                  min={SIDEBAR_MIN_WIDTH}
                  max={SIDEBAR_MAX_WIDTH}
                  value={sidebarWidth}
                  onChange={updateSidebarWidthByInput}
                  style={{ width: '100%', color: 'var(--text-primary)', background: 'var(--input-bg)' }}
                />
                <Button disabled style={{ background: 'var(--input-bg)', color: 'var(--text-secondary)' }}>px</Button>
              </Space.Compact>
              <Button onClick={resetSidebarWidthToDefault} size="small" style={{ color: 'var(--text-light-blue)', borderColor: 'var(--btn-primary-border)', background: 'transparent' }}>还原</Button>
            </Space>
          </div>

          {/* Gallery Config */}
          <div
            id="studio-page-view-config-panel"
            style={{
              padding: 12,
              borderRadius: 8,
              border: '1px solid var(--brand-border)',
              background: 'var(--panel-bg-translucent)',
              marginBottom: 16
            }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                <LayoutOutlined style={{ color: 'var(--text-primary)' }} />
                <Text strong style={{ color: 'var(--text-primary)' }}>图库显示设置</Text>
              </Space>
              <div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>布局模式</Text>
                <Radio.Group
                  value={previewLayoutMode}
                  onChange={(e) => setPreviewLayoutMode(e.target.value)}
                  size="small"
                  style={{ marginBottom: 12 }}
                >
                  <Radio.Button value="auto">自动适配列数</Radio.Button>
                  <Radio.Button value="fixed">固定分页数量</Radio.Button>
                </Radio.Group>
              </div>
              {previewLayoutMode === 'auto' ? (
                <div>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                    每个预览最小宽度（px）
                  </Text>
                  <Space direction="vertical" style={{ width: '100%' }} size={6}>
                    <Slider
                      min={180}
                      max={520}
                      step={10}
                      value={previewMinWidth}
                      onChange={(value) => setPreviewMinWidth(value)}
                    />
                    <Space.Compact style={{ width: 120 }}>
                      <InputNumber
                        min={180}
                        max={520}
                        value={previewMinWidth}
                        onChange={(value) => setPreviewMinWidth(value ?? 280)}
                        style={{ width: '100%', color: 'var(--text-primary)', background: 'var(--input-bg)' }}
                      />
                      <Button disabled style={{ background: 'var(--input-bg)', color: 'var(--text-secondary)' }}>px</Button>
                    </Space.Compact>
                  </Space>
                </div>
              ) : (
                <div>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>每页显示数量</Text>
                  <Radio.Group
                    value={galleryPageSize}
                    onChange={e => setGalleryPageSize(e.target.value)}
                    size="small"
                  >
                    <Radio.Button value={12}>12</Radio.Button>
                    <Radio.Button value={24}>24</Radio.Button>
                    <Radio.Button value={48}>48</Radio.Button>
                  </Radio.Group>
                </div>
              )}
            </Space>
          </div>

          {/* Global Config */}
          <div id="studio-page-global-config-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text strong style={{ color: 'var(--text-primary)' }}>整体配置</Text>
            <Button
              size="small"
              type="text"
              onClick={() => setIsConfigCollapsed(!isConfigCollapsed)}
              icon={isConfigCollapsed ? <DownOutlined style={{ color: 'var(--text-primary)' }} /> : <UpOutlined style={{ color: 'var(--text-primary)' }} />}
              style={{ color: 'var(--text-primary)' }}
            >
              {isConfigCollapsed ? '展开' : '收起'}
            </Button>
          </div>
          {!isConfigCollapsed && (
            <div
              id="editor-page-global-config-panel"
              style={{
                padding: 12,
                borderRadius: 8,
                background: 'var(--panel-bg-darker)',
                border: '1px solid var(--brand-border)',
                marginBottom: 16,
              }}
            >
              <Form id="editor-page-global-config-form" layout="vertical" variant="filled">
                <BasicMetaSection idPrefix="editor-page" draftConfig={videoConfig} setDraftConfig={setVideoConfig} />
                <SortStrategySection
                  idPrefix="editor-page"
                  editorSortMode={editorSortMode}
                  setEditorSortMode={setEditorSortMode}
                  editorReplyOrderMode={editorReplyOrderMode}
                  setEditorReplyOrderMode={setEditorReplyOrderMode}
                />
                <LayoutSection
                  idPrefix="editor-page"
                  titleAlignment={titleAlignment}
                  setTitleAlignment={setTitleAlignment}
                  imageLayoutMode={imageLayoutMode}
                  setImageLayoutMode={setImageLayoutMode}
                  sceneLayout={sceneLayout}
                  setSceneLayout={setSceneLayout}
                />
                <Divider style={{ margin: '12px 0', borderColor: 'var(--brand-border)' }} />
                <CanvasConfigSection idPrefix="editor-page" draftConfig={videoConfig} setDraftConfig={setVideoConfig} />
                <Divider style={{ margin: '12px 0', borderColor: 'var(--brand-border)' }} />
                <TypographySection
                  titleFontSize={titleFontSize}
                  setTitleFontSize={setTitleFontSize}
                  contentFontSize={contentFontSize}
                  setContentFontSize={setContentFontSize}
                  quoteFontSize={quoteFontSize}
                  setQuoteFontSize={setQuoteFontSize}
                  maxQuoteDepth={maxQuoteDepth}
                  setMaxQuoteDepth={setMaxQuoteDepth}
                  defaultQuoteMaxLimit={defaultQuoteMaxLimit}
                  setDefaultQuoteMaxLimit={setDefaultQuoteMaxLimit}
                />
                <DefaultColorsSection
                  sceneBackgroundColor={sceneBackgroundColor}
                  setSceneBackgroundColor={setSceneBackgroundColor}
                  itemBackgroundColor={itemBackgroundColor}
                  setItemBackgroundColor={setItemBackgroundColor}
                />
                <Divider style={{ margin: '12px 0', borderColor: 'var(--brand-border)' }} />
                <QuoteStyleSection
                  quoteBackgroundColor={quoteBackgroundColor}
                  setQuoteBackgroundColor={setQuoteBackgroundColor}
                  quoteBorderColor={quoteBorderColor}
                  setQuoteBorderColor={setQuoteBorderColor}
                />
              </Form>
            </div>
          )}

          <Divider style={{ margin: '16px 0', borderColor: 'var(--brand-border)' }} />

          {/* Privacy Config */}
          <div id="studio-page-privacy-config-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text strong style={{ color: 'var(--text-primary)' }}>用户隐私映射</Text>
            <Button
              size="small"
              type="text"
              onClick={() => setIsPrivacyCollapsed(!isPrivacyCollapsed)}
              icon={isPrivacyCollapsed ? <DownOutlined style={{ color: 'var(--text-primary)' }} /> : <UpOutlined style={{ color: 'var(--text-primary)' }} />}
              style={{ color: 'var(--text-primary)' }}
            >
              {isPrivacyCollapsed ? '展开' : '收起'}
            </Button>
          </div>
          {!isPrivacyCollapsed && (
            <PrivacyConfigPanel
              idPrefix="editor-page"
              editorColorArrangement={editorColorArrangement}
              setEditorColorArrangement={setEditorColorArrangement}
              onRearrangeColorsAndApply={onRearrangeColorsAndApply}
              editorSortMode={editorSortMode}
              editorReplyOrderMode={editorReplyOrderMode}
              allAuthors={allAuthors}
              authorProfiles={authorProfiles}
              onUpdateAuthorProfile={onUpdateAuthorProfile}
            />
          )}

          <Divider style={{ margin: '16px 0', borderColor: 'var(--brand-border)' }} />

          {/* Quick Actions */}
          <div id="studio-page-quick-actions-header" style={{ marginBottom: 12 }}>
            <Text strong style={{ color: 'var(--text-primary)' }}>快速操作</Text>
          </div>
          <QuickActions
            idPrefix="editor-page"
            canApplyCommentSort={canApplyCommentSort}
            onApplyCommentSort={onApplyCommentSort}
            editorSortMode={editorSortMode}
            editorReplyOrderMode={editorReplyOrderMode}
            allAuthors={allAuthors}
            onRandomizeAliasesAndApply={onRandomizeAliasesAndApply}
            onClearAliasesAndApply={onClearAliasesAndApply}
            setAllSceneLayouts={setAllSceneLayouts}
            addScene={addScene}
          />
        </div>
      </div>
    </div>
  );
};
