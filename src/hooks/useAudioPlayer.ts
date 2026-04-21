import { useState, useCallback, useEffect } from 'react';
import { toast } from '@components/Toast';
import { AudioItem } from '@/types';
import { normalizePreviewVolume } from '@/utils/audio';

export const useAudioPlayer = (fetchAudioList: (auto: boolean) => void) => {
  const [playingPath, setPlayingPath] = useState<string | null>(null);
  const [audioInstance, setAudioInstance] = useState<HTMLAudioElement | null>(null);

  const stopAudio = useCallback(() => {
    if (audioInstance) {
      audioInstance.pause();
      audioInstance.src = '';
      audioInstance.load();
    }
    setPlayingPath(null);
    setAudioInstance(null);
  }, [audioInstance]);

  const playAudio = useCallback((item: AudioItem) => {
    if (audioInstance) {
      audioInstance.pause();
      audioInstance.src = '';
      audioInstance.load();
    }

    const audio = new Audio(item.url);
    audio.volume = normalizePreviewVolume(item.previewVolume);
    
    setPlayingPath(item.path);
    setAudioInstance(audio);

    audio.play().catch(err => {
      console.error('播放失败:', err);
      toast.error(`音频播放失败: ${item.name}`, {
        description: '文件可能已被移动或删除，正在尝试自动刷新列表。',
        duration: 4
      });
      fetchAudioList(true);
    });

    audio.onended = () => {
      setPlayingPath(null);
      setAudioInstance(null);
    };
  }, [audioInstance, fetchAudioList]);

  useEffect(() => {
    return () => {
      if (audioInstance) {
        audioInstance.pause();
      }
    };
  }, [audioInstance]);

  return {
    playingPath,
    audioInstance,
    playAudio,
    stopAudio
  };
};
