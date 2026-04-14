import React, { useState } from 'react';
import {
  InputNumber,
  Space,
  Button,
  Typography,
  Divider,
  message,
} from 'antd';
import {
  EditOutlined,
  DownOutlined,
  UpOutlined,
  SelectOutlined,
  DeleteOutlined,
  MergeCellsOutlined,
} from '@ant-design/icons';
import { VideoConfig, VideoScene, ImageLayoutMode, SceneLayoutType } from '../../../types';
import { AuthorProfile, CommentSortMode, ReplyOrderMode } from '../../../utils/redditTransformer';
import { mergeSelectedScenes } from '../../../utils/sceneMergeEngine';
import { GlobalConfigPanel } from './GlobalConfigPanel';
import { PrivacyConfigPanel } from './PrivacyConfigPanel';
import { QuickActions } from './QuickActions';

const { Text } = Typography;

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
  toolDesc: string;
  draftConfig: VideoConfig;
  setDraftConfig: (config: VideoConfig) => void;
  editorSortMode: CommentSortMode;
  setEditorSortMode: (mode: CommentSortMode) => void;
  editorReplyOrderMode: ReplyOrderMode;
  setEditorReplyOrderMode: (mode: ReplyOrderMode) => void;
  imageLayoutMode: ImageLayoutMode;
  setImageLayoutMode: (mode: ImageLayoutMode) => void;
  sceneLayout: SceneLayoutType;
  setSceneLayout: (layout: SceneLayoutType) => void;
  canApplyCommentSort: boolean;
  onApplyCommentSort: (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => void;
  allAuthors: string[];
  onRandomizeAliasesAndApply: (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => void;
  onClearAliasesAndApply: (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => void;
  editorColorArrangement: ColorArrangementSettings;
  setEditorColorArrangement: React.Dispatch<React.SetStateAction<ColorArrangementSettings>>;
  onRearrangeColorsAndApply: (sortMode: CommentSortMode, replyOrder: ReplyOrderMode, settings: ColorArrangementSettings) => void;
  authorProfiles: Record<string, AuthorProfile>;
  onUpdateAuthorProfile: (author: string, updates: Partial<AuthorProfile>) => void;
  setAllSceneLayouts: (layout: 'top' | 'center') => void;
  addScene: () => void;
  isMultiSelectMode: boolean;
  setIsMultiSelectMode: (mode: boolean) => void;
  selectedSceneIds: string[];
  setSelectedSceneIds: (ids: string[]) => void;
  onRemoveSelectedScenes: () => void;
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
  toolDesc,
  draftConfig,
  setDraftConfig,
  editorSortMode,
  setEditorSortMode,
  editorReplyOrderMode,
  setEditorReplyOrderMode,
  imageLayoutMode,
  setImageLayoutMode,
  sceneLayout,
  setSceneLayout,
  canApplyCommentSort,
  onApplyCommentSort,
  allAuthors,
  onRandomizeAliasesAndApply,
  onClearAliasesAndApply,
  editorColorArrangement,
  setEditorColorArrangement,
  onRearrangeColorsAndApply,
  authorProfiles,
  onUpdateAuthorProfile,
  setAllSceneLayouts,
  addScene,
  isMultiSelectMode,
  setIsMultiSelectMode,
  selectedSceneIds,
  setSelectedSceneIds,
  onRemoveSelectedScenes,
}) => {
  const [isConfigCollapsed, setIsConfigCollapsed] = useState(false);
  const [isPrivacyCollapsed, setIsPrivacyCollapsed] = useState(false);
  const [isMultiSelectCollapsed, setIsMultiSelectCollapsed] = useState(false);

  return (
    <div
      id="editor-page-sidebar"
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
        id="editor-page-sidebar-resizer"
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
        id="editor-page-sidebar-inner"
        style={{
          borderRadius: 0,
          border: 'none',
          background: 'transparent',
          overflow: 'hidden',
        }}
      >
        <div
          id="editor-page-sidebar-header"
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
            <Text id="editor-page-sidebar-title" strong style={{ color: 'var(--text-primary)' }}>右侧操作面板</Text>
          </Space>
          <Text id="editor-page-sidebar-desc" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{toolDesc}</Text>
        </div>

        <div id="editor-page-sidebar-content" style={{ padding: 16 }}>
          <div
            id="editor-page-sidebar-width-config"
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
                  id="editor-page-sidebar-width-input"
                  name="sidebar-width-input"
                  min={SIDEBAR_MIN_WIDTH}
                  max={SIDEBAR_MAX_WIDTH}
                  value={sidebarWidth}
                  onChange={updateSidebarWidthByInput}
                  style={{ width: '100%', color: 'var(--text-primary)', background: 'var(--input-bg)' }}
                />
                <Button disabled style={{ background: 'var(--input-bg)', color: 'var(--text-secondary)' }}>px</Button>
              </Space.Compact>
              <Button id="editor-page-sidebar-width-reset-btn" name="sidebar-width-reset-btn" onClick={resetSidebarWidthToDefault} size="small" style={{ color: 'var(--text-light-blue)', borderColor: 'var(--btn-primary-border)', background: 'transparent' }}>还原默认</Button>
            </Space>
          </div>
          
          <div id="editor-page-global-config-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text strong style={{ color: 'var(--text-primary)' }}>整体配置</Text>
            <Button
              id="editor-page-global-config-toggle-btn"
              name="global-config-toggle-btn"
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
            <GlobalConfigPanel
              draftConfig={draftConfig}
              setDraftConfig={setDraftConfig}
              editorSortMode={editorSortMode}
              setEditorSortMode={setEditorSortMode}
              editorReplyOrderMode={editorReplyOrderMode}
              setEditorReplyOrderMode={setEditorReplyOrderMode}
              imageLayoutMode={imageLayoutMode}
              setImageLayoutMode={setImageLayoutMode}
              sceneLayout={sceneLayout}
              setSceneLayout={setSceneLayout}
            />
          )}

          <div id="editor-page-sidebar-divider-wrapper">
            <Divider style={{ margin: '16px 0', borderColor: 'var(--brand-border)' }} />
          </div>

          <div id="editor-page-privacy-config-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text strong style={{ color: 'var(--text-primary)' }}>用户隐私与身份映射</Text>
            <Button
              id="editor-page-privacy-config-toggle-btn"
              name="privacy-config-toggle-btn"
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

          <div id="editor-page-sidebar-bottom-divider-wrapper">
            <Divider style={{ margin: '16px 0', borderColor: 'var(--brand-border)' }} />
          </div>

          <div id="editor-page-multi-select-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Space size="small">
              <SelectOutlined style={{ color: 'var(--text-primary)' }} />
              <Text strong style={{ color: 'var(--text-primary)' }}>多选模式</Text>
            </Space>
            <Button
              id="editor-page-multi-select-toggle-btn"
              name="multi-select-toggle-btn"
              size="small"
              type="text"
              onClick={() => setIsMultiSelectCollapsed((prev) => !prev)}
              icon={isMultiSelectCollapsed ? <DownOutlined style={{ color: 'var(--text-primary)' }} /> : <UpOutlined style={{ color: 'var(--text-primary)' }} />}
              style={{ color: 'var(--text-primary)' }}
            >
              {isMultiSelectCollapsed ? '展开' : '收起'}
            </Button>
          </div>
          {!isMultiSelectCollapsed && (
            <div
              id="editor-page-multi-select-panel"
              style={{
                padding: 12,
                borderRadius: 8,
                border: '1px solid var(--brand-border)',
                background: 'var(--panel-bg-translucent)',
              }}
            >
              <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: 'var(--text-secondary)' }}>
                  {isMultiSelectMode ? `已选择 ${selectedSceneIds.length} 个画面格` : '未开启多选模式'}
                </Text>
                <Button
                  id="editor-page-multi-select-mode-btn"
                  size="small"
                  type={isMultiSelectMode ? 'primary' : 'default'}
                  onClick={() => {
                    setIsMultiSelectMode(!isMultiSelectMode);
                    if (isMultiSelectMode) setSelectedSceneIds([]);
                  }}
                >
                  {isMultiSelectMode ? '退出多选' : '开启多选'}
                </Button>
              </div>
              {isMultiSelectMode && (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button
                    id="editor-page-multi-delete-btn"
                    block
                    danger
                    icon={<DeleteOutlined />}
                    disabled={selectedSceneIds.length === 0}
                    onClick={onRemoveSelectedScenes}
                  >
                    批量删除
                  </Button>
                  <Button
                    id="editor-page-multi-merge-btn"
                    block
                    icon={<MergeCellsOutlined />}
                    disabled={selectedSceneIds.length < 2}
                    onClick={() => {
                      const result = mergeSelectedScenes({
                        scenes: draftConfig.scenes,
                        selectedSceneIds: selectedSceneIds,
                        strategy: 'auto',
                      });
                      if (result.ok) {
                        setDraftConfig({ ...draftConfig, scenes: result.scenes });
                        setSelectedSceneIds([]);
                        message.success(result.message || '合并成功');
                      } else {
                        message.error(result.message || '合并失败');
                      }
                    }}
                  >
                    批量合并
                  </Button>
                  <Button
                    id="editor-page-multi-clear-btn"
                    block
                    size="small"
                    onClick={() => setSelectedSceneIds([])}
                    disabled={selectedSceneIds.length === 0}
                  >
                    清空选择
                  </Button>
                </Space>
              )}
            </div>
          )}

          <div id="editor-page-sidebar-bottom-divider-wrapper">
            <Divider style={{ margin: '16px 0', borderColor: 'var(--brand-border)' }} />
          </div>

          <div id="editor-page-quick-actions-header" style={{ marginBottom: 8 }}>
            <Text strong style={{ color: 'var(--text-primary)' }}>画面流快捷操作</Text>
          </div>
          <QuickActions
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
