import { SceneMergeRule } from '../sceneMergeTypes';
import {
  cloneScenes,
  computeQuoteMaxByContent,
  extractTopLevelQuoteBlocks,
  getCandidateScenes,
  getPrimaryScene,
  patchQuoteMax,
  removeScenesByIds,
  replaceSceneById,
  textsLookEquivalent,
  updateItemContent,
} from '../sceneMergeHelpers';

export const quoteAbsorbMergeRule: SceneMergeRule = {
  id: 'quote-absorb-merge',
  name: '引用吸收合并',
  priority: 100,
  canApply: (ctx) => {
    const primary = getPrimaryScene(ctx.scenes, ctx.primarySceneId);
    if (!primary) return null;

    const candidates = getCandidateScenes(ctx.scenes, ctx.selectedSceneIds, ctx.primarySceneId).filter(
      (scene) => scene.items.length > 0
    );
    if (candidates.length === 0) return null;

    for (const candidate of candidates) {
      for (const candidateItem of candidate.items) {
        for (const primaryItem of primary.items) {
          const quotes = extractTopLevelQuoteBlocks(primaryItem.content);
          for (const quote of quotes) {
            const quoteTargetId = (quote.attrs.id || '').trim();
            if (!quoteTargetId || quoteTargetId !== candidateItem.id) continue;
            if (!textsLookEquivalent(quote.innerText, candidateItem.content)) continue;
            return {
              confidence: 0.98,
              reason: `命中 quote id=${quoteTargetId} 与 item.id 的引用吸收关系`,
            };
          }
        }
      }
    }

    return null;
  },
  apply: (ctx) => {
    const nextScenes = cloneScenes(ctx.scenes);
    const primary = getPrimaryScene(nextScenes, ctx.primarySceneId);
    if (!primary) {
      return { changed: false, scenes: ctx.scenes, mergedSceneIds: [], reason: '主场景不存在' };
    }

    const candidates = getCandidateScenes(nextScenes, ctx.selectedSceneIds, ctx.primarySceneId);
    const removeIds = new Set<string>();
    const mergedSceneIds: string[] = [];

    for (const candidate of candidates) {
      let candidateMerged = false;

      for (const candidateItem of candidate.items) {
        for (let i = 0; i < primary.items.length; i += 1) {
          const primaryItem = primary.items[i];
          const quotes = extractTopLevelQuoteBlocks(primaryItem.content);
          let replaced = false;
          let nextContent = primaryItem.content;

          for (const quote of quotes) {
            const quoteTargetId = (quote.attrs.id || '').trim();
            if (!quoteTargetId || quoteTargetId !== candidateItem.id) continue;
            if (!textsLookEquivalent(quote.innerText, candidateItem.content)) continue;

            const requiredMax = computeQuoteMaxByContent(candidateItem.content);
            const patchedStartTag = patchQuoteMax(quote.startTag, requiredMax);
            const oldSegment = nextContent.slice(quote.startIdx, quote.endIdx);
            const nextSegment = `${patchedStartTag}${quote.innerText}[/quote]`;
            nextContent = `${nextContent.slice(0, quote.startIdx)}${nextSegment}${nextContent.slice(quote.endIdx)}`;
            replaced = oldSegment !== nextSegment;
            break;
          }

          if (replaced) {
            primary.items[i] = updateItemContent(primaryItem, nextContent);
            candidateMerged = true;
            break;
          }
        }

        if (candidateMerged) break;
      }

      if (candidateMerged) {
        removeIds.add(candidate.id);
        mergedSceneIds.push(candidate.id);
      }
    }

    if (mergedSceneIds.length === 0) {
      return {
        changed: false,
        scenes: ctx.scenes,
        mergedSceneIds: [],
        reason: '没有找到可吸收的引用关系',
      };
    }

    const replacedScenes = replaceSceneById(nextScenes, primary);
    const cleanedScenes = removeScenesByIds(replacedScenes, removeIds);
    return {
      changed: true,
      scenes: cleanedScenes,
      mergedSceneIds,
      reason: `已按引用吸收合并 ${mergedSceneIds.length} 个场景`,
    };
  },
};
