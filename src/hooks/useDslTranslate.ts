import { useCallback } from 'react';
import { VideoScene } from '@/types';
import { sceneToDsl, parseSceneDsl } from '@/rendering/sceneDsl';

interface TranslationChunk {
  id: number;
  original: string;
}

export const useDslTranslate = () => {
  // 提取可翻译的文本块
  const extractChunks = useCallback((scenes: VideoScene[]) => {
    const uniqueChunks = new Set<string>();
    
    scenes.forEach(scene => {
      const dsl = sceneToDsl(scene);
      
      // 使用 <#text#> 标示提取内容
      const textRegex = /<#text#>([\s\S]*?)<\/#text#>/g;
      let match;
      while ((match = textRegex.exec(dsl)) !== null) {
        const text = match[1].trim();
        if (text && text.length > 0) {
          uniqueChunks.add(text);
        }
      }
    });

    const chunkList = Array.from(uniqueChunks).map((text, index) => ({
      id: index + 1,
      original: text
    }));
    
    const initialInput = chunkList.map(c => `[#${c.id}=<${c.original}>]`).join('\n');
    
    return {
      chunks: chunkList,
      initialValue: initialInput
    };
  }, []);

  const applyTranslations = useCallback((scenes: VideoScene[], translationText: string, chunks: TranslationChunk[]) => {
    // 解析用户的翻译输入 [#1=<翻译内容>]
    const translationMap = new Map<string, string>();
    const replaceRegex = /\[#(\d+)=<([\s\S]*?)>\]/g;
    let match;
    
    const inputMap = new Map<number, string>();
    while ((match = replaceRegex.exec(translationText)) !== null) {
      const id = parseInt(match[1], 10);
      const translated = match[2];
      inputMap.set(id, translated);
    }

    // 将 ID 映射回原始文本
    chunks.forEach(chunk => {
      if (inputMap.has(chunk.id)) {
        translationMap.set(chunk.original, inputMap.get(chunk.id)!);
      }
    });

    if (translationMap.size === 0) {
      return { ok: false, error: '未检测到有效的翻译内容，请确保格式正确：[#N=<翻译内容>]' };
    }

    const nextScenes: VideoScene[] = [];
    let totalReplacements = 0;

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      let dsl = sceneToDsl(scene);
      let changed = false;

      // 执行替换
      translationMap.forEach((translated, original) => {
        const escapedOriginal = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`<#text#>${escapedOriginal}<\/#text#>`, 'g');
        
        const count = (dsl.match(regex) || []).length;
        if (count > 0) {
          dsl = dsl.replace(regex, `<#text#>${translated}</#text#>`);
          totalReplacements += count;
          changed = true;
        }
      });

      if (changed) {
        const parsed = parseSceneDsl(dsl, scene);
        if (!parsed.ok) {
          return { ok: false, error: `场景 "${scene.title}" 在替换后解析失败：${parsed.error}` };
        }
        nextScenes.push(parsed.scene);
      } else {
        nextScenes.push(scene);
      }
    }

    return {
      ok: true,
      nextScenes,
      totalReplacements,
      affectedScenes: nextScenes.filter((s, i) => s !== scenes[i]).length
    };
  }, []);

  return {
    extractChunks,
    applyTranslations
  };
};
