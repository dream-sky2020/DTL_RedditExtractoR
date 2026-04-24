import { SceneMergeRule } from '../sceneMergeTypes';
import {
  cloneScenes,
  getCandidateScenes,
  getPrimaryScene,
  removeScenesByIds,
  replaceSceneById,
} from '../sceneMergeHelpers';

/**
 * 强制追加合并规则：不管三七二十一，直接把选中的候选场景中的所有 items 追加到主场景末尾。
 * 这相当于 EditorPage 中的拖拽合并（combine）。
 */
export const forceAppendMergeRule: SceneMergeRule = {
  id: 'force-append-merge',
  name: '强制追加合并',
  priority: 0, // 优先级最低，除非显式指定，否则不应被 auto-merge 自动选中
  canApply: (ctx) => {
    const primary = getPrimaryScene(ctx.scenes, ctx.primarySceneId);
    if (!primary) return null;

    const candidates = getCandidateScenes(ctx.scenes, ctx.selectedSceneIds, ctx.primarySceneId);
    if (candidates.length === 0) return null;

    return {
      confidence: 0.1, // 信心极低，防止被 auto-merge 误选
      reason: '强制追加合并（将所有内容移至主场景）',
    };
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
      // 追加 items
      primary.items.push(...candidate.items);
      // 累加时长
      primary.duration += candidate.duration;
      
      removeIds.add(candidate.id);
      mergedSceneIds.push(candidate.id);
    }

    const replacedScenes = replaceSceneById(nextScenes, primary);
    const cleanedScenes = removeScenesByIds(replacedScenes, removeIds);

    return {
      changed: true,
      scenes: cleanedScenes,
      mergedSceneIds,
      reason: `已将 ${mergedSceneIds.length} 个场景内容强制合并至场景 "${primary.title || primary.id}"`,
    };
  },
};
