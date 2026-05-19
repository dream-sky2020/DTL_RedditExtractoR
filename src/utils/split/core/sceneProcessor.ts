import { SceneInfo } from './types';

/**
 * 剥离并组装 Scene
 */
export const stripScene = (dsl: string): SceneInfo => {
  const sceneMatch = dsl.match(/^<scene\b([^>]*)>([\s\S]*)<\/scene>\s*$/i);
  if (!sceneMatch) {
    throw new Error('未找到完整的 <scene> 标签包围');
  }
  return {
    attributes: sceneMatch[1],
    content: sceneMatch[2].trim()
  };
};

export const wrapScene = (attributes: string, content: string): string => {
  return `<scene ${attributes.trim()}>\n${content}\n</scene>`;
};
