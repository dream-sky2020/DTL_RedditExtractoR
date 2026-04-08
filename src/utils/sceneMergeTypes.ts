import { VideoScene } from '../types';

export type MergeRuleId =
  | 'quote-absorb-merge'
  | 'quote-sibling-stitch-merge'
  | 'parallel-item-pack-merge';

export type MergeStrategy = MergeRuleId | 'auto';

export interface SceneMergeInput {
  scenes: VideoScene[];
  selectedSceneIds: string[];
  primarySceneId?: string;
  strategy: MergeStrategy;
  options?: {
    /** parallel-item-pack-merge 默认仅在无 quote 依赖时启用 */
    allowQuotedItemsInParallelPack?: boolean;
  };
}

export interface SceneMergeResult {
  ok: boolean;
  scenes: VideoScene[];
  appliedRuleId?: MergeRuleId;
  mergedSceneIds: string[];
  message: string;
}

export interface MergeRuleMatch {
  confidence: number;
  reason: string;
}

export interface MergeExecutionContext {
  scenes: VideoScene[];
  selectedSceneIds: string[];
  primarySceneId: string;
  options: Required<NonNullable<SceneMergeInput['options']>>;
}

export interface RuleApplyResult {
  changed: boolean;
  scenes: VideoScene[];
  mergedSceneIds: string[];
  reason: string;
}

export interface SceneMergeRule {
  id: MergeRuleId;
  name: string;
  priority: number;
  canApply: (ctx: MergeExecutionContext) => MergeRuleMatch | null;
  apply: (ctx: MergeExecutionContext) => RuleApplyResult;
}
