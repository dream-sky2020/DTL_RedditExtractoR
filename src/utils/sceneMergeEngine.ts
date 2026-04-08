import { SceneMergeInput, SceneMergeResult, SceneMergeRule } from './sceneMergeTypes';
import { parallelItemPackMergeRule } from './mergeRules/parallelItemPackMerge';
import { quoteAbsorbMergeRule } from './mergeRules/quoteAbsorbMerge';
import { quoteSiblingStitchMergeRule } from './mergeRules/quoteSiblingStitchMerge';

const DEFAULT_OPTIONS: Required<NonNullable<SceneMergeInput['options']>> = {
  allowQuotedItemsInParallelPack: false,
};

const RULES: SceneMergeRule[] = [
  quoteAbsorbMergeRule,
  quoteSiblingStitchMergeRule,
  parallelItemPackMergeRule,
].sort((a, b) => b.priority - a.priority);

const pickPrimarySceneId = (input: SceneMergeInput): string | null => {
  const selected = input.selectedSceneIds.filter((id) => input.scenes.some((scene) => scene.id === id));
  if (selected.length === 0) return null;

  if (input.primarySceneId && selected.includes(input.primarySceneId)) {
    return input.primarySceneId;
  }
  return selected[0];
};

const buildContext = (input: SceneMergeInput) => {
  const primarySceneId = pickPrimarySceneId(input);
  if (!primarySceneId) return null;
  return {
    scenes: input.scenes,
    selectedSceneIds: input.selectedSceneIds.filter((id) => input.scenes.some((scene) => scene.id === id)),
    primarySceneId,
    options: {
      ...DEFAULT_OPTIONS,
      ...(input.options || {}),
    },
  };
};

const resolveRuleByStrategy = (strategy: SceneMergeInput['strategy']): SceneMergeRule | null => {
  if (strategy === 'auto') return null;
  return RULES.find((rule) => rule.id === strategy) || null;
};

export const getSceneMergeRules = (): SceneMergeRule[] => [...RULES];

export const mergeSelectedScenes = (input: SceneMergeInput): SceneMergeResult => {
  if (!Array.isArray(input.scenes) || input.scenes.length === 0) {
    return { ok: false, scenes: input.scenes || [], mergedSceneIds: [], message: '没有可合并的场景数据' };
  }

  if (!Array.isArray(input.selectedSceneIds) || input.selectedSceneIds.length < 2) {
    return { ok: false, scenes: input.scenes, mergedSceneIds: [], message: '至少需要选择 2 个场景才能合并' };
  }

  const ctx = buildContext(input);
  if (!ctx) {
    return { ok: false, scenes: input.scenes, mergedSceneIds: [], message: '未找到有效的主场景' };
  }

  const forcedRule = resolveRuleByStrategy(input.strategy);
  if (forcedRule) {
    const can = forcedRule.canApply(ctx);
    if (!can) {
      return {
        ok: false,
        scenes: input.scenes,
        mergedSceneIds: [],
        message: `当前选择不满足规则：${forcedRule.name}`,
      };
    }
    const applied = forcedRule.apply(ctx);
    if (!applied.changed) {
      return {
        ok: false,
        scenes: input.scenes,
        mergedSceneIds: [],
        appliedRuleId: forcedRule.id,
        message: applied.reason || `规则 ${forcedRule.name} 未产生变更`,
      };
    }
    return {
      ok: true,
      scenes: applied.scenes,
      appliedRuleId: forcedRule.id,
      mergedSceneIds: applied.mergedSceneIds,
      message: applied.reason || `已执行规则：${forcedRule.name}`,
    };
  }

  let bestRule: SceneMergeRule | null = null;
  let bestScore = -1;
  let bestReason = '';
  for (const rule of RULES) {
    const matched = rule.canApply(ctx);
    if (!matched) continue;
    if (matched.confidence > bestScore) {
      bestRule = rule;
      bestScore = matched.confidence;
      bestReason = matched.reason;
    }
  }

  if (!bestRule) {
    return {
      ok: false,
      scenes: input.scenes,
      mergedSceneIds: [],
      message: '自动模式下未命中任何可执行合并规则',
    };
  }

  const applied = bestRule.apply(ctx);
  if (!applied.changed) {
    return {
      ok: false,
      scenes: input.scenes,
      mergedSceneIds: [],
      appliedRuleId: bestRule.id,
      message: applied.reason || `规则 ${bestRule.name} 未产生变更`,
    };
  }

  return {
    ok: true,
    scenes: applied.scenes,
    appliedRuleId: bestRule.id,
    mergedSceneIds: applied.mergedSceneIds,
    message: `${applied.reason}（自动命中：${bestReason}）`,
  };
};

export type { MergeRuleId, MergeStrategy, SceneMergeInput, SceneMergeResult } from './sceneMergeTypes';
