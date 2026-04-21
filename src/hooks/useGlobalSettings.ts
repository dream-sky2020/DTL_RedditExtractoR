import { useState, useEffect } from 'react';
import { 
  GlobalSettings, 
  DEFAULT_GLOBAL_SETTINGS, 
  CommentSortMode, 
  ReplyOrderMode, 
  TitleAlignmentType, 
  ColorArrangementSettings 
} from '../types';
import { GLOBAL_CONFIG_STORAGE_KEY } from '../constants/storage';

export const useGlobalSettings = () => {
  const [commentSortMode, setCommentSortMode] = useState<CommentSortMode>(DEFAULT_GLOBAL_SETTINGS.commentSortMode);
  const [replyOrderMode, setReplyOrderMode] = useState<ReplyOrderMode>(DEFAULT_GLOBAL_SETTINGS.replyOrderMode);
  const [imageLayoutMode, setImageLayoutMode] = useState<'gallery' | 'row' | 'single'>(DEFAULT_GLOBAL_SETTINGS.imageLayoutMode);
  const [sceneLayout, setSceneLayout] = useState<'top' | 'center'>(DEFAULT_GLOBAL_SETTINGS.sceneLayout);
  const [titleAlignment, setTitleAlignment] = useState<TitleAlignmentType>(DEFAULT_GLOBAL_SETTINGS.titleAlignment);
  const [titleFontSize, setTitleFontSize] = useState<number>(DEFAULT_GLOBAL_SETTINGS.titleFontSize);
  const [contentFontSize, setContentFontSize] = useState<number>(DEFAULT_GLOBAL_SETTINGS.contentFontSize);
  const [quoteFontSize, setQuoteFontSize] = useState<number>(DEFAULT_GLOBAL_SETTINGS.quoteFontSize);
  const [maxQuoteDepth, setMaxQuoteDepth] = useState<number>(DEFAULT_GLOBAL_SETTINGS.maxQuoteDepth);
  const [defaultQuoteMaxLimit, setDefaultQuoteMaxLimit] = useState<number>(DEFAULT_GLOBAL_SETTINGS.defaultQuoteMaxLimit);
  const [sceneBackgroundColor, setSceneBackgroundColor] = useState<string>(DEFAULT_GLOBAL_SETTINGS.sceneBackgroundColor);
  const [itemBackgroundColor, setItemBackgroundColor] = useState<string>(DEFAULT_GLOBAL_SETTINGS.itemBackgroundColor);
  const [quoteBackgroundColor, setQuoteBackgroundColor] = useState<string>(DEFAULT_GLOBAL_SETTINGS.quoteBackgroundColor);
  const [quoteBorderColor, setQuoteBorderColor] = useState<string>(DEFAULT_GLOBAL_SETTINGS.quoteBorderColor);
  const [colorArrangement, setColorArrangement] = useState<ColorArrangementSettings>({
    mode: 'uniform',
    hueOffset: 0,
    hueStep: 137.508,
    saturation: 68,
    lightness: 52,
    seed: 20260402,
  });

  // 恢复配置
  useEffect(() => {
    try {
      const cached = localStorage.getItem(GLOBAL_CONFIG_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as GlobalSettings;
        if (parsed.commentSortMode) setCommentSortMode(parsed.commentSortMode);
        if (parsed.replyOrderMode) setReplyOrderMode(parsed.replyOrderMode);
        if (parsed.imageLayoutMode) setImageLayoutMode(parsed.imageLayoutMode);
        if (parsed.sceneLayout) setSceneLayout(parsed.sceneLayout);
        if (parsed.titleAlignment) setTitleAlignment(parsed.titleAlignment);
        if (parsed.titleFontSize) setTitleFontSize(parsed.titleFontSize);
        if (parsed.contentFontSize) setContentFontSize(parsed.contentFontSize);
        if (parsed.quoteFontSize) setQuoteFontSize(parsed.quoteFontSize);
        if (parsed.maxQuoteDepth) setMaxQuoteDepth(parsed.maxQuoteDepth);
        if (parsed.defaultQuoteMaxLimit) setDefaultQuoteMaxLimit(parsed.defaultQuoteMaxLimit);
        if (parsed.sceneBackgroundColor) setSceneBackgroundColor(parsed.sceneBackgroundColor);
        if (parsed.itemBackgroundColor) setItemBackgroundColor(parsed.itemBackgroundColor);
        if (parsed.quoteBackgroundColor) setQuoteBackgroundColor(parsed.quoteBackgroundColor);
        if (parsed.quoteBorderColor) setQuoteBorderColor(parsed.quoteBorderColor);
      }
    } catch (err) {
      console.warn('读取 localStorage 中的全局配置失败:', err);
    }
  }, []);

  // 持久化配置
  useEffect(() => {
    const settings: GlobalSettings = {
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
    };
    try {
      localStorage.setItem(GLOBAL_CONFIG_STORAGE_KEY, JSON.stringify(settings));
    } catch (err) {
      console.warn('保存全局配置到 localStorage 失败:', err);
    }
  }, [
    commentSortMode, replyOrderMode, imageLayoutMode, sceneLayout, 
    titleAlignment, titleFontSize, contentFontSize, quoteFontSize, 
    maxQuoteDepth, defaultQuoteMaxLimit, sceneBackgroundColor, 
    itemBackgroundColor, quoteBackgroundColor, quoteBorderColor
  ]);

  return {
    commentSortMode, setCommentSortMode,
    replyOrderMode, setReplyOrderMode,
    imageLayoutMode, setImageLayoutMode,
    sceneLayout, setSceneLayout,
    titleAlignment, setTitleAlignment,
    titleFontSize, setTitleFontSize,
    contentFontSize, setContentFontSize,
    quoteFontSize, setQuoteFontSize,
    maxQuoteDepth, setMaxQuoteDepth,
    defaultQuoteMaxLimit, setDefaultQuoteMaxLimit,
    sceneBackgroundColor, setSceneBackgroundColor,
    itemBackgroundColor, setItemBackgroundColor,
    quoteBackgroundColor, setQuoteBackgroundColor,
    quoteBorderColor, setQuoteBorderColor,
    colorArrangement, setColorArrangement,
  };
};
