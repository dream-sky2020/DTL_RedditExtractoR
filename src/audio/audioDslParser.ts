import { VideoScene } from '../types';

const DEFAULT_AUDIO_DURATION_SECONDS = 2.5;

export interface AudioDslTag {
  src: string;
  start: number;
  volume: number;
  duration: number;
  loop: boolean;
  fadeOutSeconds: number;
  fadeOutEndVolume: number;
}

export interface ParsedAudioTrack {
  id: string;
  sceneId: string;
  itemId: string;
  src: string;
  startSeconds: number;
  durationSeconds: number;
  volume: number;
  loop: boolean;
  fadeOutSeconds: number;
  fadeOutEndVolume: number;
}

const parseInlineAttrs = (attrStr: string): Record<string, string> => {
  const attrs: Record<string, string> = {};
  const attrRegex = /([a-zA-Z_][\w-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s\]]+)))?/g;
  let attrMatch: RegExpExecArray | null;

  while ((attrMatch = attrRegex.exec(attrStr)) !== null) {
    const key = attrMatch[1].toLowerCase();
    const value = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? 'true';
    attrs[key] = value;
  }

  return attrs;
};

const parseNumberAttr = (value: string | undefined) => {
  if (value === undefined) return NaN;
  return Number.parseFloat(value);
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const parseBooleanAttr = (value: string | undefined) => {
  if (value === undefined) return false;
  return ['true', '1', 'yes', 'y', 'on'].includes(value.trim().toLowerCase());
};

const getFirstAttr = (attrs: Record<string, string>, keys: string[]) => {
  for (const key of keys) {
    const value = attrs[key];
    if (value !== undefined) return value;
  }
  return undefined;
};

export const parseAudioDslTags = (content: string): AudioDslTag[] => {
  if (!content) return [];

  const tags: AudioDslTag[] = [];
  const regex = /\[audio\s+([^\]]+)\]/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const attrs = parseInlineAttrs(match[1]);
    if (!attrs.src) continue;

    const parsedStart = parseNumberAttr(attrs.start ?? '0');
    const parsedVolume = parseNumberAttr(attrs.volume ?? '1');
    const parsedDuration = parseNumberAttr(attrs.duration ?? attrs.d);
    const parsedEnd = parseNumberAttr(attrs.end);
    const parsedFadeOut = parseNumberAttr(getFirstAttr(attrs, ['fadeout', 'fade-out', 'fade']));
    const parsedFadeOutEndVolume = parseNumberAttr(
      getFirstAttr(attrs, ['fadeto', 'fade-to', 'fadeoutto', 'fade-out-to', 'fadelevel', 'fade-level', 'fadevolume', 'fade-volume'])
    );
    const start = Number.isFinite(parsedStart) ? Math.max(0, parsedStart) : 0;
    const durationFromEnd = Number.isFinite(parsedEnd) ? parsedEnd - start : NaN;
    const rawDuration = Number.isFinite(parsedDuration) ? parsedDuration : durationFromEnd;
    const duration = Number.isFinite(rawDuration) && rawDuration > 0
      ? rawDuration
      : DEFAULT_AUDIO_DURATION_SECONDS;

    tags.push({
      src: attrs.src,
      start,
      volume: Number.isFinite(parsedVolume) ? Math.max(0, Math.min(1, parsedVolume)) : 1,
      duration,
      loop: parseBooleanAttr(attrs.loop ?? attrs.repeat),
      fadeOutSeconds: Number.isFinite(parsedFadeOut) && parsedFadeOut > 0
        ? Math.min(parsedFadeOut, duration)
        : 0,
      fadeOutEndVolume: Number.isFinite(parsedFadeOutEndVolume) ? clamp01(parsedFadeOutEndVolume) : 0,
    });
  }

  return tags;
};

export const parseSceneAudioTracks = (scenes: VideoScene[], focusedSceneId?: string): ParsedAudioTrack[] => {
  const tracks: ParsedAudioTrack[] = [];
  let sceneOffsetSeconds = 0;

  scenes.forEach((scene) => {
    const shouldIncludeScene = !focusedSceneId || scene.id === focusedSceneId;
    const baseOffset = focusedSceneId ? 0 : sceneOffsetSeconds;

    if (shouldIncludeScene) {
      scene.items.forEach((item) => {
        const enterAt = Math.max(0, Math.min(item.enterAt ?? 0, scene.duration));
        const itemTags = parseAudioDslTags(item.content);

        itemTags.forEach((tag, index) => {
          tracks.push({
            id: `${scene.id}-${item.id}-${index}`,
            sceneId: scene.id,
            itemId: item.id,
            src: tag.src,
            volume: tag.volume,
            startSeconds: baseOffset + enterAt + tag.start,
            durationSeconds: tag.duration,
            loop: tag.loop,
            fadeOutSeconds: tag.fadeOutSeconds,
            fadeOutEndVolume: tag.fadeOutEndVolume,
          });
        });
      });
    }

    sceneOffsetSeconds += scene.duration;
  });

  return tracks;
};

