import { useCallback } from 'react';
import { parseSceneDsl, sceneToDsl } from '@/rendering/sceneDsl';
import { VideoScene } from '@/types';

interface ReplaceStats {
  totalMatches: number;
  affectedSceneCount: number;
}

interface ApplyReplaceResult {
  ok: boolean;
  totalMatches: number;
  affectedSceneCount: number;
  warningCount: number;
  nextScenes?: VideoScene[];
  error?: string;
}

const countMatches = (text: string, keyword: string) => {
  if (!keyword) return 0;
  let count = 0;
  let cursor = 0;
  while (true) {
    const next = text.indexOf(keyword, cursor);
    if (next === -1) break;
    count += 1;
    cursor = next + keyword.length;
  }
  return count;
};

export const useDslGlobalReplace = () => {
  const getReplaceStats = useCallback((scenes: VideoScene[], findText: string): ReplaceStats => {
    if (!findText) {
      return { totalMatches: 0, affectedSceneCount: 0 };
    }

    let totalMatches = 0;
    let affectedSceneCount = 0;
    for (const scene of scenes) {
      const dsl = sceneToDsl(scene);
      const matches = countMatches(dsl, findText);
      if (matches > 0) {
        affectedSceneCount += 1;
        totalMatches += matches;
      }
    }
    return { totalMatches, affectedSceneCount };
  }, []);

  const applyGlobalReplace = useCallback(
    (scenes: VideoScene[], findText: string, replaceText: string): ApplyReplaceResult => {
      if (!findText) {
        return {
          ok: false,
          totalMatches: 0,
          affectedSceneCount: 0,
          warningCount: 0,
          error: '替换失败：查找内容不能为空。',
        };
      }

      let totalMatches = 0;
      let affectedSceneCount = 0;
      let warningCount = 0;
      const nextScenes: VideoScene[] = [];

      for (let idx = 0; idx < scenes.length; idx += 1) {
        const scene = scenes[idx];
        const dsl = sceneToDsl(scene);
        const matches = countMatches(dsl, findText);

        if (matches === 0) {
          nextScenes.push(scene);
          continue;
        }

        const updatedDsl = dsl.split(findText).join(replaceText);
        const parsed = parseSceneDsl(updatedDsl, scene);
        if (!parsed.ok) {
          return {
            ok: false,
            totalMatches,
            affectedSceneCount,
            warningCount,
            error: `第 ${idx + 1} 个场景替换后解析失败：${parsed.error}`,
          };
        }

        totalMatches += matches;
        affectedSceneCount += 1;
        warningCount += parsed.warnings.length;
        nextScenes.push(parsed.scene);
      }

      return {
        ok: true,
        totalMatches,
        affectedSceneCount,
        warningCount,
        nextScenes,
      };
    },
    [],
  );

  return {
    getReplaceStats,
    applyGlobalReplace,
  };
};
