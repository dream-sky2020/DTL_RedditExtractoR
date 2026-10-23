import { useCallback, useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { toast } from '@components/Toast';
import { isGeneratedAdComposite, listAdMedia, pickAudioFile, pickVideoFile } from '../api';
import type { VideoItem } from '../types';

interface MediaLibraryOptions {
  setSourceVideo: Dispatch<SetStateAction<string>>;
  setGreenScreenVideo: Dispatch<SetStateAction<string>>;
  setGuideAudio: Dispatch<SetStateAction<string>>;
  setGuideDuration: Dispatch<SetStateAction<number>>;
}

export function useAdMediaLibrary({
  setSourceVideo, setGreenScreenVideo, setGuideAudio, setGuideDuration,
}: MediaLibraryOptions) {
  const [renderedVideos, setRenderedVideos] = useState<VideoItem[]>([]);
  const [greenScreenVideos, setGreenScreenVideos] = useState<VideoItem[]>([]);
  const [guideAudios, setGuideAudios] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadVideos = useCallback(async () => {
    setLoading(true);
    try {
      const { rendered, adVideos: greenScreens, guideAudios: audios } = await listAdMedia();
      setRenderedVideos(rendered);
      setGreenScreenVideos(greenScreens);
      setGuideAudios(audios);
      setSourceVideo((current) => current || rendered[0]?.path || '');
      setGreenScreenVideo((current) => current || greenScreens[0]?.path || '');
    } catch (error: any) {
      toast.warning(error.message || '无法连接本地渲染服务');
    } finally {
      setLoading(false);
    }
  }, [setSourceVideo, setGreenScreenVideo]);

  useEffect(() => {
    void loadVideos();
  }, [loadVideos]);

  const pickVideo = async (kind: 'source' | 'green') => {
    try {
      const payload = await pickVideoFile();
      if (!payload.path || !payload.item) return;
      const item = payload.item;
      if (kind === 'source') {
        if (isGeneratedAdComposite(item.path)) {
          toast.warning('这个文件已经是广告合成成片，不能再次作为无广告母版，否则预览和成片都会出现两个广告。');
          return;
        }
        setRenderedVideos((items) => [item, ...items.filter((entry) => entry.path !== item.path)]);
        setSourceVideo(payload.path);
      } else {
        setGreenScreenVideos((items) => [item, ...items.filter((entry) => entry.path !== item.path)]);
        setGreenScreenVideo(payload.path);
      }
    } catch (error: any) {
      toast.error(error.message || '选择视频失败');
    }
  };

  const pickGuideAudio = async () => {
    try {
      const payload = await pickAudioFile();
      if (!payload.path || !payload.item) return;
      const item = payload.item;
      setGuideAudios((items) => [item, ...items.filter((entry) => entry.path !== item.path)]);
      changeGuideAudio(payload.path);
    } catch (error: any) {
      toast.error(error.message || '选择引导音频失败');
    }
  };

  const changeGuideAudio = (path: string) => {
    setGuideAudio((current) => {
      if (current !== path) setGuideDuration(0);
      return path;
    });
  };

  return { renderedVideos, greenScreenVideos, guideAudios, loading, loadVideos, pickVideo, pickGuideAudio, changeGuideAudio };
}
