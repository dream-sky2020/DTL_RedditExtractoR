import React from 'react';
import { Space, Typography, Divider } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { SidebarWidthSection } from './sections/SidebarWidthSection';
import { StudioPreviewSection } from './sections/StudioPreviewSection';
import { GlobalConfigSection } from './sections/GlobalConfigSection';
import { TextStyleSection } from './sections/TextStyleSection';
import { BackgroundColorSection } from './sections/BackgroundColorSection';
import { QuoteSettingsSection } from './sections/QuoteSettingsSection';
import { AvatarSettingsSection } from './sections/AvatarSettingsSection';
import { HistorySection } from './sections/HistorySection';
import { MultiSelectSection } from './sections/MultiSelectSection';
import { BatchSelectionSection } from './sections/BatchSelectionSection';
import { BatchDuplicateSection } from './sections/BatchDuplicateSection';
import { BatchSplitSection } from './sections/BatchSplitSection';
import { BatchClearQuotesSection } from './sections/BatchClearQuotesSection';
import { BatchCleanTextSection } from './sections/BatchCleanTextSection';
import { BatchDeleteSection } from './sections/BatchDeleteSection';
import { BatchTranslateSection } from './sections/BatchTranslateSection';
import { BatchMergeSection } from './sections/BatchMergeSection';
import { BatchGlassSection } from './sections/BatchGlassSection';
import { BatchLayoutTypeSection } from './sections/BatchLayoutTypeSection';
import { BatchDurationSection } from './sections/BatchDurationSection';
import { BatchSpacingSection } from './sections/BatchSpacingSection';
import { BatchOffsetSection } from './sections/BatchOffsetSection';
import { BatchStickySection } from './sections/BatchStickySection';
import { BatchContentSection } from './sections/BatchContentSection';
import { BatchChatFlowSection } from './sections/BatchChatFlowSection';
import { BatchBgImageSection } from './sections/BatchBgImageSection';
import { SceneReorderSection } from './sections/SceneReorderSection';
import { QuickActionsSection } from './sections/QuickActionsSection';
import { VideoSettingsSidebarProps } from './types';
import { useVideoSettingsSidebar } from './useVideoSettingsSidebar';
import { CollapsibleSection } from './components/CollapsibleSection';

const { Text } = Typography;

export const VideoSettingsSidebar: React.FC<VideoSettingsSidebarProps> = (props) => {
  const {
    sidebarWidth, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH, FIXED_SIDEBAR_TOP_OFFSET,
    isSidebarResizing, startSidebarResize, updateSidebarWidthByInput, resetSidebarWidthToDefault,
    toolTitle = '操作面板', toolDesc, draftConfig, setDraftConfig,
    commentSortMode, replyOrderMode, imageLayoutMode, sceneLayout, titleAlignment,
    titleFontSize, contentFontSize, quoteFontSize, titleFontColor, contentFontColor, quoteFontColor,
    avatarSize, avatarShape, avatarOffset,
    titleFontBold, contentFontBold, maxQuoteDepth, defaultQuoteMaxLimit,
    sceneBackgroundColor, sceneBackgroundColorEnd, sceneBackgroundGradientMode,
    itemBackgroundColor, itemBackgroundColorEnd, itemBackgroundGradientMode,
    quoteBackgroundColor, quoteBorderColor, onApplyCommentSort,
    onRefreshStyles, onRefreshAvatars, onRefreshColors, onRearrangeScenes, onResetAndRebuild,
    onImageLayoutModeChange, onSceneLayoutChange, onTitleAlignmentChange,
    onTitleFontSizeChange, onContentFontSizeChange, onQuoteFontSizeChange,
    onTitleFontColorChange, onContentFontColorChange, onQuoteFontColorChange,
    onTitleFontBoldChange, onContentFontBoldChange, onMaxQuoteDepthChange,
    onDefaultQuoteMaxLimitChange, onSceneBackgroundColorChange, onSceneBackgroundColorEndChange,
    onSceneBackgroundGradientModeChange, onItemBackgroundColorChange, onItemBackgroundColorEndChange,
    onItemBackgroundGradientModeChange,     onQuoteBackgroundColorChange, onQuoteBorderColorChange,
    onAvatarSizeChange, onAvatarShapeChange, onAvatarOffsetChange,
    onAddScene,
    canApplyCommentSort, mode, isMultiSelectMode, setIsMultiSelectMode, selectedSceneIds, setSelectedSceneIds,
    onRemoveSelectedScenes, onOpenTranslationModal, galleryPageSize, setGalleryPageSize,
    previewLayoutMode, setPreviewLayoutMode, previewMinWidth, setPreviewMinWidth,
  } = props;

  const state = useVideoSettingsSidebar(props);

  return (
    <div
      id={`${mode}-page-sidebar`}
      style={{
        position: 'fixed', right: 0, top: FIXED_SIDEBAR_TOP_OFFSET, bottom: 0,
        width: sidebarWidth, overflowY: 'auto', zIndex: 20,
        borderLeft: '1px solid var(--brand-border)', background: 'var(--brand-dark)',
      }}
    >
      <div
        id={`${mode}-page-sidebar-resizer`}
        role="separator" aria-label="调整右侧面板宽度"
        onMouseDown={startSidebarResize}
        style={{
          position: 'absolute', left: -4, top: 0, bottom: 0, width: 8, cursor: 'col-resize', zIndex: 21,
          background: isSidebarResizing ? 'rgba(24,144,255,0.22)' : 'transparent',
        }}
      />
      <div id={`${mode}-page-sidebar-inner`} style={{ borderRadius: 0, border: 'none', background: 'transparent', overflow: 'hidden' }}>
        <div
          id={`${mode}-page-sidebar-header`}
          style={{
            padding: '10px 14px', borderBottom: '1px solid var(--brand-border)',
            background: 'var(--brand-dark)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <Space size="small">
            <EditOutlined style={{ color: 'var(--text-primary)' }} />
            <Text strong style={{ color: 'var(--text-primary)' }}>{toolTitle}</Text>
          </Space>
          {toolDesc && <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{toolDesc}</Text>}
        </div>

        <div id={`${mode}-page-sidebar-content`} style={{ padding: 16 }}>
          <SidebarWidthSection
            sidebarWidth={sidebarWidth} SIDEBAR_MIN_WIDTH={SIDEBAR_MIN_WIDTH} SIDEBAR_MAX_WIDTH={SIDEBAR_MAX_WIDTH}
            updateSidebarWidthByInput={updateSidebarWidthByInput} resetSidebarWidthToDefault={resetSidebarWidthToDefault}
          />

          {mode === 'studio' && setPreviewLayoutMode && (
            <StudioPreviewSection
              previewLayoutMode={previewLayoutMode} setPreviewLayoutMode={setPreviewLayoutMode}
              previewMinWidth={previewMinWidth} setPreviewMinWidth={setPreviewMinWidth}
              galleryPageSize={galleryPageSize} setGalleryPageSize={setGalleryPageSize}
            />
          )}

          <GlobalConfigSection
            idPrefix={mode} isCollapsed={state.isConfigCollapsed} onToggle={() => state.setIsConfigCollapsed(!state.isConfigCollapsed)}
            draftConfig={draftConfig} setDraftConfig={setDraftConfig} commentSortMode={commentSortMode} replyOrderMode={replyOrderMode}
            onApplyCommentSort={onApplyCommentSort} titleAlignment={titleAlignment} onTitleAlignmentChange={onTitleAlignmentChange}
            imageLayoutMode={imageLayoutMode} onImageLayoutModeChange={onImageLayoutModeChange}
            sceneLayout={sceneLayout} onSceneLayoutChange={onSceneLayoutChange}
          />

          <Divider style={{ margin: '16px 0', borderColor: 'var(--brand-border)' }} />

          <CollapsibleSection title="文本样式" isCollapsed={state.isTextStyleCollapsed} onToggle={() => state.setIsTextStyleCollapsed(!state.isTextStyleCollapsed)}>
            <TextStyleSection
              titleFontSize={titleFontSize} setTitleFontSize={onTitleFontSizeChange}
              contentFontSize={contentFontSize} setContentFontSize={onContentFontSizeChange}
              titleFontColor={titleFontColor} setTitleFontColor={onTitleFontColorChange}
              contentFontColor={contentFontColor} setContentFontColor={onContentFontColorChange}
              titleFontBold={titleFontBold} setTitleFontBold={onTitleFontBoldChange}
              contentFontBold={contentFontBold} setContentFontBold={onContentFontBoldChange}
              onRefreshStyles={onRefreshStyles}
            />
          </CollapsibleSection>

          <Divider style={{ margin: '16px 0', borderColor: 'var(--brand-border)' }} />

          <CollapsibleSection title="背景颜色" isCollapsed={state.isBackgroundColorCollapsed} onToggle={() => state.setIsBackgroundColorCollapsed(!state.isBackgroundColorCollapsed)}>
            <BackgroundColorSection
              sceneBackgroundColor={sceneBackgroundColor} setSceneBackgroundColor={onSceneBackgroundColorChange}
              sceneBackgroundColorEnd={sceneBackgroundColorEnd} setSceneBackgroundColorEnd={onSceneBackgroundColorEndChange}
              sceneBackgroundGradientMode={sceneBackgroundGradientMode} setSceneBackgroundGradientMode={onSceneBackgroundGradientModeChange}
              itemBackgroundColor={itemBackgroundColor} setItemBackgroundColor={onItemBackgroundColorChange}
              itemBackgroundColorEnd={itemBackgroundColorEnd} setItemBackgroundColorEnd={onItemBackgroundColorEndChange}
              itemBackgroundGradientMode={itemBackgroundGradientMode} setItemBackgroundGradientMode={onItemBackgroundGradientModeChange}
              onRefreshColors={onRefreshColors}
            />
          </CollapsibleSection>

          <Divider style={{ margin: '16px 0', borderColor: 'var(--brand-border)' }} />

          <CollapsibleSection title="引用设置" isCollapsed={state.isQuoteSettingsCollapsed} onToggle={() => state.setIsQuoteSettingsCollapsed(!state.isQuoteSettingsCollapsed)}>
            <QuoteSettingsSection
              quoteFontSize={quoteFontSize} setQuoteFontSize={onQuoteFontSizeChange}
              quoteFontColor={quoteFontColor} setQuoteFontColor={onQuoteFontColorChange}
              maxQuoteDepth={maxQuoteDepth} setMaxQuoteDepth={onMaxQuoteDepthChange}
              defaultQuoteMaxLimit={defaultQuoteMaxLimit} setDefaultQuoteMaxLimit={onDefaultQuoteMaxLimitChange}
              quoteBackgroundColor={quoteBackgroundColor} setQuoteBackgroundColor={onQuoteBackgroundColorChange}
              quoteBorderColor={quoteBorderColor} setQuoteBorderColor={onQuoteBorderColorChange}
            />
          </CollapsibleSection>

          <Divider style={{ margin: '16px 0', borderColor: 'var(--brand-border)' }} />

          <CollapsibleSection title="头像设置" isCollapsed={state.isAvatarSettingsCollapsed} onToggle={() => state.setIsAvatarSettingsCollapsed(!state.isAvatarSettingsCollapsed)}>
            <AvatarSettingsSection
              avatarSize={avatarSize} setAvatarSize={onAvatarSizeChange}
              avatarShape={avatarShape} setAvatarShape={onAvatarShapeChange}
              avatarOffset={avatarOffset} setAvatarOffset={onAvatarOffsetChange}
              onRefreshAvatars={onRefreshAvatars}
            />
          </CollapsibleSection>

          <Divider style={{ margin: '16px 0', borderColor: 'var(--brand-border)' }} />

          <HistorySection isCollapsed={state.isHistoryCollapsed} setIsCollapsed={state.setIsHistoryCollapsed} />

          <Divider style={{ margin: '16px 0', borderColor: 'var(--brand-border)' }} />

          {setIsMultiSelectMode && selectedSceneIds && setSelectedSceneIds && (
            <>
              <MultiSelectSection
                isMultiSelectMode={Boolean(isMultiSelectMode)} setIsMultiSelectMode={setIsMultiSelectMode}
                selectedSceneIds={selectedSceneIds} setSelectedSceneIds={setSelectedSceneIds}
                isCollapsed={state.isMultiSelectCollapsed} setIsCollapsed={state.setIsMultiSelectCollapsed}
                draftConfig={draftConfig}
              />
              <Divider style={{ margin: '16px 0', borderColor: 'var(--brand-border)' }} />

              <CollapsibleSection title="批量选择" isCollapsed={state.isBatchSelectionCollapsed} onToggle={() => state.setIsBatchSelectionCollapsed(!state.isBatchSelectionCollapsed)}>
                <BatchSelectionSection selectedSceneIds={selectedSceneIds} handleSelectAll={state.handleSelectAll} handleSelectCurrentPage={state.handleSelectCurrentPage} onClearSelection={() => setSelectedSceneIds([])} />
              </CollapsibleSection>

              <CollapsibleSection title="新建画面格" isCollapsed={state.isBatchDuplicateCollapsed} onToggle={() => state.setIsBatchDuplicateCollapsed(!state.isBatchDuplicateCollapsed)}>
                <BatchDuplicateSection selectedSceneIds={selectedSceneIds} handleDuplicateSelectedScene={state.handleDuplicateSelectedScene} onAddScene={onAddScene} />
              </CollapsibleSection>

              <CollapsibleSection title="根据符号裁剪" isCollapsed={state.isBatchSplitCollapsed} onToggle={() => state.setIsBatchSplitCollapsed(!state.isBatchSplitCollapsed)}>
                <BatchSplitSection selectedSceneIds={selectedSceneIds} handleOpenSplitModal={state.handleOpenSplitModal} />
              </CollapsibleSection>

              <CollapsibleSection title="清理引用" isCollapsed={state.isBatchClearQuotesCollapsed} onToggle={() => state.setIsBatchClearQuotesCollapsed(!state.isBatchClearQuotesCollapsed)}>
                <BatchClearQuotesSection selectedSceneIds={selectedSceneIds} handleClearQuotes={state.handleClearQuotes} />
              </CollapsibleSection>

              <CollapsibleSection title="去除换行" isCollapsed={state.isBatchCleanTextCollapsed} onToggle={() => state.setIsBatchCleanTextCollapsed(!state.isBatchCleanTextCollapsed)}>
                <BatchCleanTextSection selectedSceneIds={selectedSceneIds} handleRemoveLineBreakTags={state.handleRemoveLineBreakTags} handleRemoveFirstLineBreakTag={state.handleRemoveFirstLineBreakTag} />
              </CollapsibleSection>

              <CollapsibleSection title="批量删除" isCollapsed={state.isBatchDeleteCollapsed} onToggle={() => state.setIsBatchDeleteCollapsed(!state.isBatchDeleteCollapsed)}>
                <BatchDeleteSection selectedSceneIds={selectedSceneIds} onRemoveSelectedScenes={onRemoveSelectedScenes} />
              </CollapsibleSection>

              <CollapsibleSection title="批量翻译" isCollapsed={state.isBatchTranslateCollapsed} onToggle={() => state.setIsBatchTranslateCollapsed(!state.isBatchTranslateCollapsed)}>
                <BatchTranslateSection selectedSceneIds={selectedSceneIds} onOpenTranslationModal={onOpenTranslationModal} />
              </CollapsibleSection>

              <CollapsibleSection title="批量合并" isCollapsed={state.isBatchMergeCollapsed} onToggle={() => state.setIsBatchMergeCollapsed(!state.isBatchMergeCollapsed)}>
                <BatchMergeSection selectedSceneIds={selectedSceneIds} mergeScenes={state.mergeScenes} />
              </CollapsibleSection>

              <CollapsibleSection title="item玻璃" isCollapsed={state.isBatchGlassCollapsed} onToggle={() => state.setIsBatchGlassCollapsed(!state.isBatchGlassCollapsed)}>
                <BatchGlassSection
                  selectedSceneIds={selectedSceneIds} batchGlassBlur={state.batchGlassBlur} setBatchGlassBlur={state.setBatchGlassBlur}
                  batchGlassOpacity={state.batchGlassOpacity} setBatchGlassOpacity={state.setBatchGlassOpacity}
                  batchGlassBorder={state.batchGlassBorder} setBatchGlassBorder={state.setBatchGlassBorder}
                  batchGlassShadow={state.batchGlassShadow} setBatchGlassShadow={state.setBatchGlassShadow}
                  batchGlassDistort={state.batchGlassDistort} setBatchGlassDistort={state.setBatchGlassDistort}
                  batchGlassAberration={state.batchGlassAberration} setBatchGlassAberration={state.setBatchGlassAberration}
                  batchGlassEdgeGlow={state.batchGlassEdgeGlow} setBatchGlassEdgeGlow={state.setBatchGlassEdgeGlow}
                  batchGlassFresnel={state.batchGlassFresnel} setBatchGlassFresnel={state.setBatchGlassFresnel}
                  batchGlassGrain={state.batchGlassGrain} setBatchGlassGrain={state.setBatchGlassGrain}
                  batchGlassRefraction={state.batchGlassRefraction} setBatchGlassRefraction={state.setBatchGlassRefraction}
                  handleEnableGlassForSelectedItems={state.handleEnableGlassForSelectedItems} handleDisableGlassForSelectedItems={state.handleDisableGlassForSelectedItems}
                />
              </CollapsibleSection>

              <CollapsibleSection title="批量布局" isCollapsed={state.isBatchLayoutTypeCollapsed} onToggle={() => state.setIsBatchLayoutTypeCollapsed(!state.isBatchLayoutTypeCollapsed)}>
                <BatchLayoutTypeSection selectedSceneIds={selectedSceneIds} handleBatchLayoutChange={state.handleBatchLayoutChange} />
              </CollapsibleSection>

              <CollapsibleSection title="修改时长" isCollapsed={state.isBatchDurationCollapsed} onToggle={() => state.setIsBatchDurationCollapsed(!state.isBatchDurationCollapsed)}>
                <BatchDurationSection selectedSceneIds={selectedSceneIds} batchSceneDuration={state.batchSceneDuration} setBatchSceneDuration={state.setBatchSceneDuration} handleBatchSceneDurationChange={state.handleBatchSceneDurationChange} />
              </CollapsibleSection>

              <CollapsibleSection title="统一间距" isCollapsed={state.isBatchSpacingCollapsed} onToggle={() => state.setIsBatchSpacingCollapsed(!state.isBatchSpacingCollapsed)}>
                <BatchSpacingSection selectedSceneIds={selectedSceneIds} batchItemSpacing={state.batchItemSpacing} setBatchItemSpacing={state.setBatchItemSpacing} handleBatchItemSpacingChange={state.handleBatchItemSpacingChange} />
              </CollapsibleSection>

              <CollapsibleSection title="统一偏移" isCollapsed={state.isBatchOffsetCollapsed} onToggle={() => state.setIsBatchOffsetCollapsed(!state.isBatchOffsetCollapsed)}>
                <BatchOffsetSection selectedSceneIds={selectedSceneIds} offsetX={state.offsetX} setOffsetX={state.setOffsetX} offsetY={state.offsetY} setOffsetY={state.setOffsetY} handleBatchOffsetChange={state.handleBatchOffsetChange} />
              </CollapsibleSection>

              <CollapsibleSection title="设置居中项" isCollapsed={state.isBatchStickyCollapsed} onToggle={() => state.setIsBatchStickyCollapsed(!state.isBatchStickyCollapsed)}>
                <BatchStickySection selectedSceneIds={selectedSceneIds} stickyItemIndex={state.stickyItemIndex} setStickyItemIndex={state.setStickyItemIndex} stickyValue={state.stickyValue} setStickyValue={state.setStickyValue} handleBatchStickyChange={state.handleBatchStickyChange} />
              </CollapsibleSection>

              <CollapsibleSection title="批量内容与动画" isCollapsed={state.isBatchContentCollapsed} onToggle={() => state.setIsBatchContentCollapsed(!state.isBatchContentCollapsed)}>
                <BatchContentSection
                  selectedSceneIds={selectedSceneIds} insertTextItemIndex={state.insertTextItemIndex} setInsertTextItemIndex={state.setInsertTextItemIndex}
                  insertTextMode={state.insertTextMode} setInsertTextMode={state.setInsertTextMode} insertTextValue={state.insertTextValue} setInsertTextValue={state.setInsertTextValue}
                  insertTextWeightedOptions={state.insertTextWeightedOptions} setInsertTextWeightedOptions={state.setInsertTextWeightedOptions}
                  animationItemIndex={state.animationItemIndex} setAnimationItemIndex={state.setAnimationItemIndex}
                  animationKeyframes={state.animationKeyframes} setAnimationKeyframes={state.setAnimationKeyframes}
                  canInsertText={state.canInsertText} handleBatchInsertTextToItem={state.handleBatchInsertTextToItem} handleBatchItemKeyframesChange={state.handleBatchItemKeyframesChange}
                />
              </CollapsibleSection>

              <CollapsibleSection title="批量聊天流处理" isCollapsed={state.isBatchChatFlowCollapsed} onToggle={() => state.setIsBatchChatFlowCollapsed(!state.isBatchChatFlowCollapsed)}>
                <BatchChatFlowSection selectedSceneIds={selectedSceneIds} historyLimit={state.historyLimit} setHistoryLimit={state.setHistoryLimit} handleChatFlow={state.handleChatFlow} />
              </CollapsibleSection>

              <CollapsibleSection title="批量背景图" isCollapsed={state.isBatchBgImageCollapsed} onToggle={() => state.setIsBatchBgImageCollapsed(!state.isBatchBgImageCollapsed)}>
                <BatchBgImageSection 
                  selectedSceneIds={selectedSceneIds} 
                  batchBgImage={state.batchBgImage} 
                  setBatchBgImage={state.setBatchBgImage} 
                  batchItemBgImage={state.batchItemBgImage}
                  setBatchItemBgImage={state.setBatchItemBgImage}
                  handleBatchBgImageChange={state.handleBatchBgImageChange} 
                  handleBatchItemBgImageChange={state.handleBatchItemBgImageChange}
                  handleClearBatchBgImage={state.handleClearBatchBgImage}
                  handleClearBatchItemBgImage={state.handleClearBatchItemBgImage}
                />
              </CollapsibleSection>

              <CollapsibleSection title="画面格重排" isCollapsed={state.isSceneReorderCollapsed} onToggle={() => state.setIsSceneReorderCollapsed(!state.isSceneReorderCollapsed)}>
                <SceneReorderSection selectedSceneIds={selectedSceneIds} totalScenes={draftConfig.scenes.length} />
              </CollapsibleSection>

              <Divider style={{ margin: '16px 0', borderColor: 'var(--brand-border)' }} />
            </>
          )}

          <div style={{ marginBottom: 8 }}><Text strong style={{ color: 'var(--text-primary)' }}>画面流快捷操作</Text></div>
          <QuickActionsSection
            idPrefix={mode} canApplyCommentSort={canApplyCommentSort} onApplyCommentSort={onApplyCommentSort}
            onRefreshStyles={onRefreshStyles}
            onRearrangeScenes={onRearrangeScenes} onResetAndRebuild={onResetAndRebuild}
            editorSortMode={commentSortMode} editorReplyOrderMode={replyOrderMode}
            scenes={draftConfig.scenes} onLoadScenes={(scenes) => setDraftConfig({ ...draftConfig, scenes })}
          />
        </div>
      </div>
    </div>
  );
};
