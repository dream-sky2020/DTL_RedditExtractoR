import { useState } from 'react';
import { useSettingsStore } from '@/store';
import { useSceneMerge } from '@/hooks/useSceneMerge';
import { useSelectionActions } from '@/hooks/useSelectionActions';
import { useSceneModificationActions } from '@/hooks/useSceneModificationActions';
import { useBatchTextActions } from '@/hooks/useBatchTextActions';
import { useBatchGlassActions } from '@/hooks/useBatchGlassActions';
import { useBatchLayoutActions } from '@/hooks/useBatchLayoutActions';
import { useBatchChatFlowActions } from '@/hooks/useBatchChatFlowActions';
import { useBatchBgImageActions } from '@/hooks/useBatchBgImageActions';
import { VideoSettingsSidebarProps } from './types';

export const useVideoSettingsSidebar = (props: VideoSettingsSidebarProps) => {
  const {
    draftConfig,
    setDraftConfig,
    selectedSceneIds,
    setSelectedSceneIds,
    galleryPage,
    galleryPageSize,
  } = props;

  const [isConfigCollapsed, setIsConfigCollapsed] = useState(false);
  const [isCanvasConfigCollapsed, setIsCanvasConfigCollapsed] = useState(false);
  const [isMultiSelectCollapsed, setIsMultiSelectCollapsed] = useState(false);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  const [isBatchDuplicateCollapsed, setIsBatchDuplicateCollapsed] = useState(false);
  const [isBatchSplitCollapsed, setIsBatchSplitCollapsed] = useState(false);
  const [isBatchClearQuotesCollapsed, setIsBatchClearQuotesCollapsed] = useState(false);
  const [isBatchCleanTextCollapsed, setIsBatchCleanTextCollapsed] = useState(false);
  const [isBatchDeleteCollapsed, setIsBatchDeleteCollapsed] = useState(false);
  const [isBatchTranslateCollapsed, setIsBatchTranslateCollapsed] = useState(false);
  const [isBatchMergeCollapsed, setIsBatchMergeCollapsed] = useState(false);
  const [isBatchGlassCollapsed, setIsBatchGlassCollapsed] = useState(false);
  const [isBatchLayoutTypeCollapsed, setIsBatchLayoutTypeCollapsed] = useState(false);
  const [isBatchDurationCollapsed, setIsBatchDurationCollapsed] = useState(false);
  const [isBatchSpacingCollapsed, setIsBatchSpacingCollapsed] = useState(false);
  const [isBatchOffsetCollapsed, setIsBatchOffsetCollapsed] = useState(false);
  const [isBatchStickyCollapsed, setIsBatchStickyCollapsed] = useState(false);
  const [isBatchContentCollapsed, setIsBatchContentCollapsed] = useState(false);
  const [isBatchChatFlowCollapsed, setIsBatchChatFlowCollapsed] = useState(false);
  const [isBatchBgImageCollapsed, setIsBatchBgImageCollapsed] = useState(false);
  const [isSceneReorderCollapsed, setIsSceneReorderCollapsed] = useState(false);
  const [isTextStyleCollapsed, setIsTextStyleCollapsed] = useState(false);
  const [isBackgroundColorCollapsed, setIsBackgroundColorCollapsed] = useState(false);
  const [isQuoteSettingsCollapsed, setIsQuoteSettingsCollapsed] = useState(false);
  const [isAvatarSettingsCollapsed, setIsAvatarSettingsCollapsed] = useState(false);

  const { editorUiSettings, setMultiSelectUiSettings } = useSettingsStore();
  const multiSelectSettings = editorUiSettings.multiSelect;

  const {
    historyLimit,
    batchSceneDuration = 3,
    batchItemSpacing,
    offsetX,
    offsetY,
    stickyItemIndex,
    stickyValue,
    insertTextItemIndex,
    insertTextMode = 'fixed',
    insertTextValue,
    insertTextWeightedOptions = '',
    animationItemIndex = 1,
    animationKeyframes = '',
    batchGlassBlur = 16,
    batchGlassOpacity = 0.42,
    batchGlassBorder = 'rgba(255, 255, 255, 0.35)',
    batchGlassShadow = '0 18px 48px rgba(0, 0, 0, 0.28)',
    batchGlassDistort = 0,
    batchGlassAberration = 0,
    batchGlassEdgeGlow = 'rgba(255, 255, 255, 0.5)',
    batchGlassFresnel = 0.3,
    batchGlassGrain = 0,
    batchGlassRefraction = 1.0,
    batchBgImage = '',
    batchItemBgImage = '',
  } = multiSelectSettings;

  const setHistoryLimit = (value: number) => setMultiSelectUiSettings({ historyLimit: value });
  const setBatchSceneDuration = (value: number) => setMultiSelectUiSettings({ batchSceneDuration: value });
  const setBatchItemSpacing = (value: number) => setMultiSelectUiSettings({ batchItemSpacing: value });
  const setOffsetX = (value: number) => setMultiSelectUiSettings({ offsetX: value });
  const setOffsetY = (value: number) => setMultiSelectUiSettings({ offsetY: value });
  const setStickyItemIndex = (value: number) => setMultiSelectUiSettings({ stickyItemIndex: value });
  const setStickyValue = (value: number | boolean) => setMultiSelectUiSettings({ stickyValue: value });
  const setInsertTextItemIndex = (value: number) => setMultiSelectUiSettings({ insertTextItemIndex: value });
  const setInsertTextMode = (value: any) => setMultiSelectUiSettings({ insertTextMode: value });
  const setInsertTextValue = (value: string) => setMultiSelectUiSettings({ insertTextValue: value });
  const setInsertTextWeightedOptions = (value: string) => setMultiSelectUiSettings({ insertTextWeightedOptions: value });
  const setAnimationItemIndex = (value: number) => setMultiSelectUiSettings({ animationItemIndex: value });
  const setAnimationKeyframes = (value: string) => setMultiSelectUiSettings({ animationKeyframes: value });
  const setBatchGlassBlur = (value: number) => setMultiSelectUiSettings({ batchGlassBlur: value });
  const setBatchGlassOpacity = (value: number) => setMultiSelectUiSettings({ batchGlassOpacity: value });
  const setBatchGlassBorder = (value: string) => setMultiSelectUiSettings({ batchGlassBorder: value });
  const setBatchGlassShadow = (value: string) => setMultiSelectUiSettings({ batchGlassShadow: value });
  const setBatchGlassDistort = (value: number) => setMultiSelectUiSettings({ batchGlassDistort: value });
  const setBatchGlassAberration = (value: number) => setMultiSelectUiSettings({ batchGlassAberration: value });
  const setBatchGlassEdgeGlow = (value: string) => setMultiSelectUiSettings({ batchGlassEdgeGlow: value });
  const setBatchGlassFresnel = (value: number) => setMultiSelectUiSettings({ batchGlassFresnel: value });
  const setBatchGlassGrain = (value: number) => setMultiSelectUiSettings({ batchGlassGrain: value });
  const setBatchGlassRefraction = (value: number) => setMultiSelectUiSettings({ batchGlassRefraction: value });
  const setBatchBgImage = (value: string) => setMultiSelectUiSettings({ batchBgImage: value });
  const setBatchItemBgImage = (value: string) => setMultiSelectUiSettings({ batchItemBgImage: value });

  const { mergeScenes } = useSceneMerge({
    selectedSceneIds: selectedSceneIds || [],
    setSelectedSceneIds: setSelectedSceneIds || (() => {}),
  });

  const {
    handleSelectAll,
    handleSelectCurrentPage,
  } = useSelectionActions({
    draftConfig,
    setSelectedSceneIds: setSelectedSceneIds || (() => {}),
    galleryPage,
    galleryPageSize,
  });

  const {
    handleOpenSplitModal,
    handleDuplicateSelectedScene,
  } = useSceneModificationActions({
    selectedSceneIds: selectedSceneIds || [],
    setSelectedSceneIds: setSelectedSceneIds || (() => {}),
    draftConfig,
    setDraftConfig,
  });

  const {
    handleClearQuotes,
    handleRemoveLineBreakTags,
    handleRemoveFirstLineBreakTag,
    handleAddLineBreakAfterAuthor,
    handleBatchInsertTextToItem,
    handleBatchItemKeyframesChange,
    canInsertText,
  } = useBatchTextActions({
    selectedSceneIds: selectedSceneIds || [],
    draftConfig,
    setDraftConfig,
    insertTextItemIndex,
    insertTextMode,
    insertTextValue,
    insertTextWeightedOptions,
    animationItemIndex,
    animationKeyframes,
  });

  const {
    handleEnableGlassForSelectedItems,
    handleDisableGlassForSelectedItems,
  } = useBatchGlassActions({
    selectedSceneIds: selectedSceneIds || [],
    draftConfig,
    setDraftConfig,
    batchGlassBlur,
    batchGlassOpacity,
    batchGlassBorder,
    batchGlassShadow,
    batchGlassDistort,
    batchGlassAberration,
    batchGlassEdgeGlow,
    batchGlassFresnel,
    batchGlassGrain,
    batchGlassRefraction,
  });

  const {
    handleBatchLayoutChange,
    handleBatchItemSpacingChange,
    handleBatchSceneDurationChange,
    handleBatchOffsetChange,
    handleBatchStickyChange,
  } = useBatchLayoutActions({
    selectedSceneIds: selectedSceneIds || [],
    draftConfig,
    setDraftConfig,
    batchSceneDuration,
    batchItemSpacing,
    offsetX,
    offsetY,
    stickyItemIndex,
    stickyValue,
  });

  const {
    handleChatFlow,
  } = useBatchChatFlowActions({
    selectedSceneIds: selectedSceneIds || [],
    draftConfig,
    setDraftConfig,
    historyLimit,
  });

  const {
    handleBatchBgImageChange,
    handleBatchItemBgImageChange,
    handleClearBatchBgImage,
    handleClearBatchItemBgImage,
  } = useBatchBgImageActions({
    selectedSceneIds: selectedSceneIds || [],
    draftConfig,
    setDraftConfig,
    batchBgImage,
    batchItemBgImage,
  });

  return {
    // Collapse states
    isConfigCollapsed, setIsConfigCollapsed,
    isCanvasConfigCollapsed, setIsCanvasConfigCollapsed,
    isMultiSelectCollapsed, setIsMultiSelectCollapsed,
    isHistoryCollapsed, setIsHistoryCollapsed,
    isBatchDuplicateCollapsed, setIsBatchDuplicateCollapsed,
    isBatchSplitCollapsed, setIsBatchSplitCollapsed,
    isBatchClearQuotesCollapsed, setIsBatchClearQuotesCollapsed,
    isBatchCleanTextCollapsed, setIsBatchCleanTextCollapsed,
    isBatchDeleteCollapsed, setIsBatchDeleteCollapsed,
    isBatchTranslateCollapsed, setIsBatchTranslateCollapsed,
    isBatchMergeCollapsed, setIsBatchMergeCollapsed,
    isBatchGlassCollapsed, setIsBatchGlassCollapsed,
    isBatchLayoutTypeCollapsed, setIsBatchLayoutTypeCollapsed,
    isBatchDurationCollapsed, setIsBatchDurationCollapsed,
    isBatchSpacingCollapsed, setIsBatchSpacingCollapsed,
    isBatchOffsetCollapsed, setIsBatchOffsetCollapsed,
    isBatchStickyCollapsed, setIsBatchStickyCollapsed,
    isBatchContentCollapsed, setIsBatchContentCollapsed,
    isBatchChatFlowCollapsed, setIsBatchChatFlowCollapsed,
    isBatchBgImageCollapsed, setIsBatchBgImageCollapsed,
    isSceneReorderCollapsed, setIsSceneReorderCollapsed,
    isTextStyleCollapsed, setIsTextStyleCollapsed,
    isBackgroundColorCollapsed, setIsBackgroundColorCollapsed,
    isQuoteSettingsCollapsed, setIsQuoteSettingsCollapsed,
    isAvatarSettingsCollapsed, setIsAvatarSettingsCollapsed,

    // Multi-select settings and setters
    multiSelectSettings,
    historyLimit, setHistoryLimit,
    batchSceneDuration, setBatchSceneDuration,
    batchItemSpacing, setBatchItemSpacing,
    offsetX, setOffsetX,
    offsetY, setOffsetY,
    stickyItemIndex, setStickyItemIndex,
    stickyValue, setStickyValue,
    insertTextItemIndex, setInsertTextItemIndex,
    insertTextMode, setInsertTextMode,
    insertTextValue, setInsertTextValue,
    insertTextWeightedOptions, setInsertTextWeightedOptions,
    animationItemIndex, setAnimationItemIndex,
    animationKeyframes, setAnimationKeyframes,
    batchGlassBlur, setBatchGlassBlur,
    batchGlassOpacity, setBatchGlassOpacity,
    batchGlassBorder, setBatchGlassBorder,
    batchGlassShadow, setBatchGlassShadow,
    batchGlassDistort, setBatchGlassDistort,
    batchGlassAberration, setBatchGlassAberration,
    batchGlassEdgeGlow, setBatchGlassEdgeGlow,
    batchGlassFresnel, setBatchGlassFresnel,
    batchGlassGrain, setBatchGlassGrain,
    batchGlassRefraction, setBatchGlassRefraction,
    batchBgImage, setBatchBgImage,
    batchItemBgImage, setBatchItemBgImage,

    // Action handlers
    mergeScenes,
    handleSelectAll,
    handleSelectCurrentPage,
    handleOpenSplitModal,
    handleDuplicateSelectedScene,
    handleClearQuotes,
    handleRemoveLineBreakTags,
    handleRemoveFirstLineBreakTag,
    handleAddLineBreakAfterAuthor,
    handleBatchInsertTextToItem,
    handleBatchItemKeyframesChange,
    canInsertText,
    handleEnableGlassForSelectedItems,
    handleDisableGlassForSelectedItems,
    handleBatchLayoutChange,
    handleBatchItemSpacingChange,
    handleBatchSceneDurationChange,
    handleBatchOffsetChange,
    handleBatchStickyChange,
    handleChatFlow,
    handleBatchBgImageChange,
    handleBatchItemBgImageChange,
    handleClearBatchBgImage,
    handleClearBatchItemBgImage,
  };
};
