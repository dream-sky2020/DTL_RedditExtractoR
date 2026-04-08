import { SceneMergeRule } from '../sceneMergeTypes';
import {
  cloneScenes,
  getCandidateScenes,
  getContentAfterFirstQuote,
  getFirstQuoteBlock,
  getPrimaryScene,
  normalizeComparableText,
  removeScenesByIds,
  replaceSceneById,
  safeConcatBlocks,
  textsLookEquivalent,
  updateItemContent,
} from '../sceneMergeHelpers';

const buildQuoteSignature = (content: string): { id: string; normalizedInner: string } | null => {
  const quote = getFirstQuoteBlock(content);
  if (!quote) return null;
  const quoteId = (quote.attrs.id || '').trim();
  if (!quoteId) return null;
  return {
    id: quoteId,
    normalizedInner: normalizeComparableText(quote.innerText),
  };
};

export const quoteSiblingStitchMergeRule: SceneMergeRule = {
  id: 'quote-sibling-stitch-merge',
  name: '同源引用拼接合并',
  priority: 80,
  canApply: (ctx) => {
    const primary = getPrimaryScene(ctx.scenes, ctx.primarySceneId);
    if (!primary) return null;
    const primaryItems = primary.items;
    const candidates = getCandidateScenes(ctx.scenes, ctx.selectedSceneIds, ctx.primarySceneId);
    if (candidates.length === 0) return null;

    for (const candidate of candidates) {
      for (const candidateItem of candidate.items) {
        const candidateSignature = buildQuoteSignature(candidateItem.content);
        const candidateTail = getContentAfterFirstQuote(candidateItem.content);
        if (!candidateSignature || !candidateTail.trim()) continue;

        for (const primaryItem of primaryItems) {
          const primarySignature = buildQuoteSignature(primaryItem.content);
          if (!primarySignature) continue;
          if (candidateSignature.id !== primarySignature.id) continue;
          if (!textsLookEquivalent(candidateSignature.normalizedInner, primarySignature.normalizedInner)) continue;
          return {
            confidence: 0.92,
            reason: `命中同源 quote id=${candidateSignature.id}，可执行正文拼接`,
          };
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
        const candidateSignature = buildQuoteSignature(candidateItem.content);
        const candidateTail = getContentAfterFirstQuote(candidateItem.content);
        if (!candidateSignature || !candidateTail.trim()) continue;

        for (let i = 0; i < primary.items.length; i += 1) {
          const primaryItem = primary.items[i];
          const primarySignature = buildQuoteSignature(primaryItem.content);
          if (!primarySignature) continue;
          if (candidateSignature.id !== primarySignature.id) continue;
          if (!textsLookEquivalent(candidateSignature.normalizedInner, primarySignature.normalizedInner)) continue;

          const nextContent = safeConcatBlocks(primaryItem.content, candidateTail);
          primary.items[i] = updateItemContent(primaryItem, nextContent);
          candidateMerged = true;
          break;
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
        reason: '没有命中可拼接的同源引用关系',
      };
    }

    const replacedScenes = replaceSceneById(nextScenes, primary);
    const cleanedScenes = removeScenesByIds(replacedScenes, removeIds);
    return {
      changed: true,
      scenes: cleanedScenes,
      mergedSceneIds,
      reason: `已按同源引用拼接合并 ${mergedSceneIds.length} 个场景`,
    };
  },
};
