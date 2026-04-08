import { SceneMergeRule } from '../sceneMergeTypes';
import {
  cloneScenes,
  ensureUniqueItemId,
  getCandidateScenes,
  getPrimaryScene,
  hasQuoteTag,
  removeScenesByIds,
  replaceSceneById,
} from '../sceneMergeHelpers';

export const parallelItemPackMergeRule: SceneMergeRule = {
  id: 'parallel-item-pack-merge',
  name: '并列评论收纳合并',
  priority: 40,
  canApply: (ctx) => {
    const primary = getPrimaryScene(ctx.scenes, ctx.primarySceneId);
    if (!primary) return null;

    const candidates = getCandidateScenes(ctx.scenes, ctx.selectedSceneIds, ctx.primarySceneId).filter(
      (scene) => scene.items.length > 0
    );
    if (candidates.length === 0) return null;

    const hasQuoteDependency =
      primary.items.some((item) => hasQuoteTag(item.content)) ||
      candidates.some((scene) => scene.items.some((item) => hasQuoteTag(item.content)));

    if (hasQuoteDependency && !ctx.options.allowQuotedItemsInParallelPack) {
      return null;
    }

    return {
      confidence: hasQuoteDependency ? 0.5 : 0.85,
      reason: hasQuoteDependency
        ? '存在 quote 依赖，但允许强制并列收纳'
        : '场景内容独立，可安全并列收纳',
    };
  },
  apply: (ctx) => {
    const nextScenes = cloneScenes(ctx.scenes);
    const primary = getPrimaryScene(nextScenes, ctx.primarySceneId);
    if (!primary) {
      return { changed: false, scenes: ctx.scenes, mergedSceneIds: [], reason: '主场景不存在' };
    }

    const candidates = getCandidateScenes(nextScenes, ctx.selectedSceneIds, ctx.primarySceneId).filter(
      (scene) => scene.items.length > 0
    );
    if (candidates.length === 0) {
      return { changed: false, scenes: ctx.scenes, mergedSceneIds: [], reason: '无可收纳场景' };
    }

    const hasQuoteDependency =
      primary.items.some((item) => hasQuoteTag(item.content)) ||
      candidates.some((scene) => scene.items.some((item) => hasQuoteTag(item.content)));
    if (hasQuoteDependency && !ctx.options.allowQuotedItemsInParallelPack) {
      return {
        changed: false,
        scenes: ctx.scenes,
        mergedSceneIds: [],
        reason: '存在 quote 依赖，默认不执行并列评论收纳合并',
      };
    }

    const existingItemIds = new Set(primary.items.map((item) => item.id));
    const mergedSceneIds: string[] = [];
    const removeIds = new Set<string>();

    for (const candidate of candidates) {
      for (const item of candidate.items) {
        const nextItemId = ensureUniqueItemId(existingItemIds, item.id);
        existingItemIds.add(nextItemId);
        primary.items.push({
          ...item,
          id: nextItemId,
        });
      }
      removeIds.add(candidate.id);
      mergedSceneIds.push(candidate.id);
    }

    const replacedScenes = replaceSceneById(nextScenes, primary);
    const cleanedScenes = removeScenesByIds(replacedScenes, removeIds);
    return {
      changed: mergedSceneIds.length > 0,
      scenes: cleanedScenes,
      mergedSceneIds,
      reason: `已按并列评论收纳合并 ${mergedSceneIds.length} 个场景`,
    };
  },
};
