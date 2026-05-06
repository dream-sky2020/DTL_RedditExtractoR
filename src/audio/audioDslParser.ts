import { VideoScene } from '../types';

const DEFAULT_AUDIO_DURATION_SECONDS = 2.5;

export interface AudioDslTag {
  src: string;
  start: number;
  volume: number;
  duration: number;
}

export interface ParsedAudioTrack {
  id: string;
  sceneId: string;
  itemId: string;
  src: string;
  startSeconds: number;
  durationSeconds: number;
  volume: number;
}

const parseInlineAttrs = (attrStr: string): Record<string, string> => {
  const attrs: Record<string, string> = {};
  const attrRegex = /([a-zA-Z_][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s\]]+))/g;
  let attrMatch: RegExpExecArray | null;

  while ((attrMatch = attrRegex.exec(attrStr)) !== null) {
    const key = attrMatch[1].toLowerCase();
    const value = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';
    attrs[key] = value;
  }

  return attrs;
};

export const parseAudioDslTags = (content: string): AudioDslTag[] => {
  if (!content) return [];

  const tags: AudioDslTag[] = [];
  const regex = /\[audio\s+([^\]]+)\]/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const attrs = parseInlineAttrs(match[1]);
    if (!attrs.src) continue;

    const parsedStart = Number.parseFloat(attrs.start ?? '0');
    const parsedVolume = Number.parseFloat(attrs.volume ?? '1');
    const parsedDuration = Number.parseFloat(attrs.duration ?? attrs.d ?? '');
    const parsedEnd = Number.parseFloat(attrs.end ?? '');
    const start = Number.isFinite(parsedStart) ? Math.max(0, parsedStart) : 0;
    const durationFromEnd = Number.isFinite(parsedEnd) ? parsedEnd - start : NaN;
    const rawDuration = Number.isFinite(parsedDuration) ? parsedDuration : durationFromEnd;

    tags.push({
      src: attrs.src,
      start,
      volume: Number.isFinite(parsedVolume) ? Math.max(0, Math.min(1, parsedVolume)) : 1,
      duration: Number.isFinite(rawDuration) && rawDuration > 0
        ? rawDuration
        : DEFAULT_AUDIO_DURATION_SECONDS,
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
          });
        });
      });
    }

    sceneOffsetSeconds += scene.duration;
  });

  return tracks;
};

