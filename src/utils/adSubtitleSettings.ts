export interface AdSubtitleCue {
  id: string;
  start: number;
  end: number;
  text: string;
}

export type AdSubtitlePosition = 'top' | 'center' | 'bottom';

export interface AdSubtitleStyle {
  fontFamily: string;
  fontSize: number;
  color: string;
  outlineColor: string;
  outlineWidth: number;
  backgroundColor: string;
  backgroundOpacity: number;
  position: AdSubtitlePosition;
  verticalMargin: number;
}

export interface AdSubtitleSettings {
  enabled: boolean;
  cues: AdSubtitleCue[];
  style: AdSubtitleStyle;
}

const STORAGE_KEY = 'redditextractor:ad-lead-subtitles:v1';

export const DEFAULT_AD_SUBTITLE_STYLE: AdSubtitleStyle = {
  fontFamily: 'Microsoft YaHei',
  fontSize: 42,
  color: '#ffffff',
  outlineColor: '#000000',
  outlineWidth: 3,
  backgroundColor: '#000000',
  backgroundOpacity: 0,
  position: 'bottom',
  verticalMargin: 8,
};

export const DEFAULT_AD_SUBTITLE_SETTINGS: AdSubtitleSettings = {
  enabled: true,
  cues: [],
  style: DEFAULT_AD_SUBTITLE_STYLE,
};

const createCueId = () => `subtitle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normalizeCue = (cue: Partial<AdSubtitleCue>, index: number): AdSubtitleCue | null => {
  const start = clamp(Number(cue.start) || 0, 0, 36000);
  const end = clamp(Number(cue.end) || start + 1, start + 0.01, 36000);
  const text = String(cue.text || '').replace(/\r\n/g, '\n').slice(0, 1000);
  if (!text.trim()) return null;
  return { id: String(cue.id || `${createCueId()}-${index}`), start, end, text };
};

export const normalizeAdSubtitleSettings = (value?: Partial<AdSubtitleSettings> | null): AdSubtitleSettings => {
  const style = value?.style || {} as Partial<AdSubtitleStyle>;
  const position = style.position === 'top' || style.position === 'center' ? style.position : 'bottom';
  return {
    enabled: value?.enabled !== false,
    cues: Array.isArray(value?.cues)
      ? value.cues.map(normalizeCue).filter((cue): cue is AdSubtitleCue => Boolean(cue)).slice(0, 500)
      : [],
    style: {
      fontFamily: String(style.fontFamily || DEFAULT_AD_SUBTITLE_STYLE.fontFamily).slice(0, 100),
      fontSize: clamp(Number(style.fontSize) || DEFAULT_AD_SUBTITLE_STYLE.fontSize, 12, 160),
      color: /^#[0-9a-f]{6}$/i.test(String(style.color)) ? String(style.color) : DEFAULT_AD_SUBTITLE_STYLE.color,
      outlineColor: /^#[0-9a-f]{6}$/i.test(String(style.outlineColor)) ? String(style.outlineColor) : DEFAULT_AD_SUBTITLE_STYLE.outlineColor,
      outlineWidth: clamp(Number(style.outlineWidth) || 0, 0, 12),
      backgroundColor: /^#[0-9a-f]{6}$/i.test(String(style.backgroundColor)) ? String(style.backgroundColor) : DEFAULT_AD_SUBTITLE_STYLE.backgroundColor,
      backgroundOpacity: clamp(Number(style.backgroundOpacity) || 0, 0, 1),
      position,
      verticalMargin: clamp(Number(style.verticalMargin) || 0, 0, 45),
    },
  };
};

export const loadAdSubtitleSettings = (): AdSubtitleSettings => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeAdSubtitleSettings(JSON.parse(raw)) : normalizeAdSubtitleSettings(DEFAULT_AD_SUBTITLE_SETTINGS);
  } catch {
    return normalizeAdSubtitleSettings(DEFAULT_AD_SUBTITLE_SETTINGS);
  }
};

export const saveAdSubtitleSettings = (settings: AdSubtitleSettings) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeAdSubtitleSettings(settings)));
};

const parseTimestamp = (value: string) => {
  const match = value.trim().match(/^(\d{1,3}):(\d{2}):(\d{2})[,.](\d{3})$/);
  if (!match) return null;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000;
};

export const parseSrt = (content: string): AdSubtitleCue[] => {
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
  if (!normalized) return [];
  const cues: AdSubtitleCue[] = [];
  for (const block of normalized.split(/\n{2,}/)) {
    const lines = block.split('\n');
    const timingIndex = lines.findIndex((line) => line.includes('-->'));
    if (timingIndex < 0) continue;
    const timing = lines[timingIndex].split('-->');
    const start = parseTimestamp(timing[0]);
    const end = parseTimestamp(timing[1].trim().split(/\s+/)[0]);
    const text = lines.slice(timingIndex + 1).join('\n').trim();
    if (start === null || end === null || end <= start || !text) continue;
    cues.push({ id: createCueId(), start, end, text: text.slice(0, 1000) });
  }
  return cues.slice(0, 500);
};

const formatTimestamp = (seconds: number) => {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const secs = Math.floor((totalMs % 60_000) / 1000);
  const millis = totalMs % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
};

export const serializeSrt = (cues: AdSubtitleCue[]) => cues
  .filter((cue) => cue.text.trim() && cue.end > cue.start)
  .sort((left, right) => left.start - right.start)
  .map((cue, index) => `${index + 1}\n${formatTimestamp(cue.start)} --> ${formatTimestamp(cue.end)}\n${cue.text.trim()}`)
  .join('\n\n') + '\n';

export const createAdSubtitleCue = (start = 0, end = start + 2): AdSubtitleCue => ({
  id: createCueId(),
  start,
  end: Math.max(start + 0.01, end),
  text: '',
});
