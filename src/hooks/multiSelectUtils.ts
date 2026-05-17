import { VideoScene } from '../types';

/** 1-based 正序 / 负序索引，不允许 0；清空时回到 1；经 0 步进时在 ±1 之间跳过 */
export function applyItemIndexChange(val: number | null, prev: number, set: (n: number) => void) {
  if (val == null) {
    set(1);
    return;
  }
  if (val === 0) {
    set(prev > 0 ? -1 : 1);
    return;
  }
  set(val);
}

export function createUniqueRandomId(existingIds: Set<string>, prefix = '') {
  let nextId = '';
  do {
    nextId = `${prefix}${Math.random().toString(36).slice(2, 9)}`;
  } while (existingIds.has(nextId));
  existingIds.add(nextId);
  return nextId;
}

export interface WeightedInsertTextOption {
  text: string;
  weight: number;
}

export function parseWeightedInsertTextOptions(source: string): { options: WeightedInsertTextOption[]; error?: string } {
  const lines = source.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const options: WeightedInsertTextOption[] = [];

  for (const line of lines) {
    const separatorIndex = line.lastIndexOf('|');
    if (separatorIndex === -1) {
      return { options: [], error: '随机插入配置请使用“文本 | 权重”的格式' };
    }

    const text = line.slice(0, separatorIndex).trim();
    const weight = Number(line.slice(separatorIndex + 1).trim());
    if (!text) {
      return { options: [], error: '随机插入配置中存在空文本' };
    }
    if (!Number.isFinite(weight) || weight <= 0) {
      return { options: [], error: '随机插入权重必须是大于 0 的数字' };
    }
    options.push({ text, weight });
  }

  if (options.length === 0) {
    return { options: [], error: '请先填写随机插入文本和权重' };
  }
  return { options };
}

export function pickWeightedInsertText(options: WeightedInsertTextOption[]) {
  const totalWeight = options.reduce((sum, option) => sum + option.weight, 0);
  let cursor = Math.random() * totalWeight;
  for (const option of options) {
    cursor -= option.weight;
    if (cursor <= 0) {
      return option.text;
    }
  }
  return options[options.length - 1]?.text ?? '';
}
