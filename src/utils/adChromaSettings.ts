export interface AdChromaTestSettings {
  backgroundImage: string;
  adImage: string;
  keyColor: string;
  similarity: number;
  blend: number;
  adWidth: number;
}

export const DEFAULT_AD_CHROMA_TEST_SETTINGS: AdChromaTestSettings = {
  backgroundImage: '',
  adImage: '',
  keyColor: '#00ff00',
  similarity: 0.3,
  blend: 0.08,
  adWidth: 0.7,
};

const STORAGE_KEY = 'redditextractor:ad-chroma-test-settings:v1';
const clamp = (value: unknown, min: number, max: number, fallback: number) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.min(max, Math.max(min, numberValue)) : fallback;
};

export const loadAdChromaTestSettings = (): AdChromaTestSettings => {
  if (typeof window === 'undefined') return DEFAULT_AD_CHROMA_TEST_SETTINGS;
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      backgroundImage: typeof saved.backgroundImage === 'string' ? saved.backgroundImage : '',
      adImage: typeof saved.adImage === 'string' ? saved.adImage : '',
      keyColor: typeof saved.keyColor === 'string' ? saved.keyColor : DEFAULT_AD_CHROMA_TEST_SETTINGS.keyColor,
      similarity: clamp(saved.similarity, 0, 1, DEFAULT_AD_CHROMA_TEST_SETTINGS.similarity),
      blend: clamp(saved.blend, 0, 0.5, DEFAULT_AD_CHROMA_TEST_SETTINGS.blend),
      adWidth: clamp(saved.adWidth, 0.1, 2, DEFAULT_AD_CHROMA_TEST_SETTINGS.adWidth),
    };
  } catch {
    return DEFAULT_AD_CHROMA_TEST_SETTINGS;
  }
};

export const saveAdChromaTestSettings = (settings: AdChromaTestSettings) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};
