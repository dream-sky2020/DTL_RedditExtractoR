import { useState, useEffect } from 'react';
import { VideoConfig, TitleAlignmentType } from '../types';
import { createDefaultVideoCanvasConfig, normalizeVideoConfig } from '../rendering/videoCanvas';
import { VIDEO_CONFIG_STORAGE_KEY } from '../constants/storage';

export const useVideoConfig = (
  result: any,
  globalSettings: {
    titleAlignment: TitleAlignmentType;
    titleFontSize: number;
    contentFontSize: number;
    quoteFontSize: number;
    quoteBackgroundColor: string;
    quoteBorderColor: string;
    maxQuoteDepth: number;
    defaultQuoteMaxLimit: number;
    sceneBackgroundColor: string;
    itemBackgroundColor: string;
    sceneLayout: 'top' | 'center';
    imageLayoutMode: 'gallery' | 'row' | 'single';
  }
) => {
  const [videoConfig, setVideoConfig] = useState<VideoConfig>({
    title: '你的精彩标题',
    subreddit: 'interestingasfuck',
    canvas: createDefaultVideoCanvasConfig(),
    scenes: [
      {
        id: 'scene-main',
        type: 'post',
        title: '贴子正文',
        duration: 5,
        items: [
          {
            id: 'main-post',
            author: 'RedditUser',
            content: '这里是你的视频正文内容预览。你可以通过抓取 Reddit 链接自动填充，或者在这里手动修改。'
          }
        ]
      }
    ]
  });

  const [draftConfig, setDraftConfig] = useState<VideoConfig>(videoConfig);

  const buildVideoConfigFromResult = (
    nextResult: any,
    canvas = createDefaultVideoCanvasConfig()
  ): VideoConfig => {
    const { 
      titleAlignment, titleFontSize, contentFontSize, 
      quoteFontSize, quoteBackgroundColor, quoteBorderColor,
      maxQuoteDepth, defaultQuoteMaxLimit, sceneBackgroundColor,
      itemBackgroundColor 
    } = globalSettings;

    const postScene = {
      id: 'scene-post-' + Date.now(),
      type: 'post' as const,
      title: '贴子正文',
      layout: 'top' as const,
      duration: 5,
      items: [{
        id: 'post-content',
        author: nextResult.author,
        content: `[style size=${titleFontSize} b align=${titleAlignment}]${nextResult.title}[/style]\n\n[style size=${contentFontSize}]${nextResult.content || ''}[/style]`,
      }]
    };

    const commentScenes = nextResult.comments.map((c: any) => ({
      id: 'scene-' + c.id,
      type: 'comments' as const,
      title: `评论 u/${c.author}`,
      layout: 'center' as const,
      duration: 3,
      items: [{
        id: c.id,
        author: c.author,
        content: `[style size=${contentFontSize}]${c.body}[/style]`,
        replyChain: c.replyChain
      }]
    }));

    return {
      title: nextResult.title,
      subreddit: nextResult.subreddit,
      scenes: [postScene, ...commentScenes],
      titleFontSize,
      contentFontSize,
      quoteFontSize,
      quoteBackgroundColor,
      quoteBorderColor,
      maxQuoteDepth,
      defaultQuoteMaxLimit,
      sceneBackgroundColor,
      itemBackgroundColor,
      canvas,
    };
  };

  const persistVideoConfig = (config: VideoConfig) => {
    try {
      localStorage.setItem(VIDEO_CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch (err) {
      console.warn('保存视频配置到 localStorage 失败:', err);
    }
  };

  // 当抓取结果更新时，自动同步到配置
  useEffect(() => {
    if (result) {
      const newConfig: VideoConfig = {
        ...buildVideoConfigFromResult(
          result, 
          draftConfig.canvas || videoConfig.canvas || createDefaultVideoCanvasConfig()
        ),
        imageLayoutMode: globalSettings.imageLayoutMode,
        titleAlignment: globalSettings.titleAlignment,
        titleFontSize: globalSettings.titleFontSize,
        contentFontSize: globalSettings.contentFontSize,
        quoteFontSize: globalSettings.quoteFontSize,
        quoteBackgroundColor: globalSettings.quoteBackgroundColor,
        quoteBorderColor: globalSettings.quoteBorderColor,
        maxQuoteDepth: globalSettings.maxQuoteDepth,
        defaultQuoteMaxLimit: globalSettings.defaultQuoteMaxLimit,
        sceneBackgroundColor: globalSettings.sceneBackgroundColor,
        itemBackgroundColor: globalSettings.itemBackgroundColor,
      };
      
      newConfig.scenes = newConfig.scenes.map((scene) => ({
        ...scene,
        layout: globalSettings.sceneLayout,
        backgroundColor: globalSettings.sceneBackgroundColor,
        items: scene.items.map((item) => ({ ...item, backgroundColor: globalSettings.itemBackgroundColor })),
      }));
      
      setVideoConfig(newConfig);
      setDraftConfig(newConfig);
      persistVideoConfig(newConfig);
    }
  }, [result]);

  return {
    videoConfig, setVideoConfig,
    draftConfig, setDraftConfig,
    persistVideoConfig,
    buildVideoConfigFromResult
  };
};
