import { useEffect, useState } from 'react';
import { toast } from '@components/Toast';
import {
  createAdSubtitleCue, loadAdSubtitleSettings, parseSrt,
  saveAdSubtitleSettings, serializeSrt,
} from '@/utils/adSubtitleSettings';
import type { AdSubtitleCue, AdSubtitleSettings } from '@/utils/adSubtitleSettings';
import { pickSubtitleFile } from '../api';

interface SubtitleDraftOptions {
  guideDuration: number;
  getCurrentTime: () => number | undefined;
}

/** Owns subtitle persistence and SRT actions; does not control preview playback. */
export function useAdSubtitleDraft({ guideDuration, getCurrentTime }: SubtitleDraftOptions) {
  const [subtitleSettings, setSubtitleSettings] = useState<AdSubtitleSettings>(() => loadAdSubtitleSettings());

  useEffect(() => {
    saveAdSubtitleSettings(subtitleSettings);
  }, [subtitleSettings]);

  const updateSubtitleCue = (id: string, patch: Partial<AdSubtitleCue>) => {
    setSubtitleSettings((current) => ({
      ...current,
      cues: current.cues.map((cue) => cue.id === id ? { ...cue, ...patch } : cue),
    }));
  };

  const addSubtitleCue = () => {
    const start = Math.max(0, getCurrentTime() ?? 0);
    const end = guideDuration > 0 ? Math.min(guideDuration, start + 2) : start + 2;
    setSubtitleSettings((current) => ({
      ...current,
      cues: [...current.cues, createAdSubtitleCue(start, Math.max(start + 0.01, end))],
    }));
  };

  const importSrt = async () => {
    try {
      const payload = await pickSubtitleFile();
      if (!payload.path) return;
      const cues = parseSrt(String(payload.content || ''));
      if (!cues.length) throw new Error('没有识别到有效字幕段，请检查 SRT 时间格式');
      setSubtitleSettings((current) => ({ ...current, enabled: true, cues }));
      toast.success(`已导入 ${cues.length} 条字幕，可继续在面板中编辑`);
    } catch (error: any) {
      toast.warning(error.message || '导入 SRT 字幕失败');
    }
  };

  const exportSrt = () => {
    const validCues = subtitleSettings.cues.filter((cue) => cue.text.trim() && cue.end > cue.start);
    if (!validCues.length) {
      toast.warning('请先添加至少一条有效字幕');
      return;
    }
    const blob = new Blob([`\uFEFF${serializeSrt(validCues)}`], { type: 'application/x-subrip;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ad-guide-subtitles.srt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success('SRT 字幕已导出');
  };

  return { subtitleSettings, setSubtitleSettings, updateSubtitleCue, addSubtitleCue, importSrt, exportSrt };
}
