import React from 'react';
import { Form, Divider } from 'antd';
import { VideoConfig, CommentSortMode, ReplyOrderMode, ImageLayoutMode, SceneLayoutType, TitleAlignmentType } from '../../../types';
import { BasicMetaSection } from './BasicMetaSection';
import { SortStrategySection } from './SortStrategySection';
import { LayoutSection } from './LayoutSection';
import { CanvasConfigSection } from './CanvasConfigSection';
import { CollapsibleSection } from '../components/CollapsibleSection';

interface GlobalConfigSectionProps {
  idPrefix: string;
  isCollapsed: boolean;
  onToggle: () => void;
  draftConfig: VideoConfig;
  setDraftConfig: (config: VideoConfig) => void;
  commentSortMode: CommentSortMode;
  replyOrderMode: ReplyOrderMode;
  onApplyCommentSort: (sortMode: CommentSortMode, replyOrder: ReplyOrderMode) => void;
  titleAlignment: TitleAlignmentType;
  onTitleAlignmentChange: (alignment: TitleAlignmentType) => void;
  imageLayoutMode: ImageLayoutMode;
  onImageLayoutModeChange: (mode: ImageLayoutMode) => void;
  sceneLayout: SceneLayoutType;
  onSceneLayoutChange: (layout: SceneLayoutType) => void;
}

export const GlobalConfigSection: React.FC<GlobalConfigSectionProps> = (props) => {
  const {
    idPrefix,
    isCollapsed,
    onToggle,
    draftConfig,
    setDraftConfig,
    commentSortMode,
    replyOrderMode,
    onApplyCommentSort,
    titleAlignment,
    onTitleAlignmentChange,
    imageLayoutMode,
    onImageLayoutModeChange,
    sceneLayout,
    onSceneLayoutChange,
  } = props;

  return (
    <CollapsibleSection
      title="整体配置"
      isCollapsed={isCollapsed}
      onToggle={onToggle}
      containerStyle={{ background: 'var(--panel-bg-darker)' }}
    >
      <Form layout="vertical" variant="filled">
        <BasicMetaSection idPrefix={idPrefix} draftConfig={draftConfig} setDraftConfig={setDraftConfig} />
        <SortStrategySection
          idPrefix={idPrefix}
          editorSortMode={commentSortMode}
          setEditorSortMode={(mode) => onApplyCommentSort(mode, replyOrderMode)}
          editorReplyOrderMode={replyOrderMode}
          setEditorReplyOrderMode={(order) => onApplyCommentSort(commentSortMode, order)}
        />
        <LayoutSection
          idPrefix={idPrefix}
          titleAlignment={titleAlignment}
          setTitleAlignment={onTitleAlignmentChange}
          imageLayoutMode={imageLayoutMode}
          setImageLayoutMode={onImageLayoutModeChange}
          sceneLayout={sceneLayout}
          setSceneLayout={onSceneLayoutChange}
        />
        <Divider style={{ margin: '12px 0', borderColor: 'var(--brand-border)' }} />
        <CanvasConfigSection idPrefix={idPrefix} draftConfig={draftConfig} setDraftConfig={setDraftConfig} />
      </Form>
    </CollapsibleSection>
  );
};
