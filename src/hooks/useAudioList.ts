import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from '@components/Toast';
import { AUDIO_ITEMS_STORAGE_KEY } from '@/constants/storage';
import { AudioItem } from '@/types';
import { normalizePreviewVolume } from '@/utils/audio';

export const useAudioList = () => {
  const [audioItems, setAudioItems] = useState<AudioItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [durationMap, setDurationMap] = useState<Record<string, number | null>>({});

  const normalizeAudioItem = (item: Partial<AudioItem> & { path: string; name?: string; url?: string }): AudioItem => {
    const path = item.path;
    const fileName = path.split('/').pop() || path;
    const fallbackName = item.name || fileName.replace(/\.[^/.]+$/, '');
    return {
      name: fallbackName,
      path,
      url: item.url || '/' + path.replace(/^public\//, ''),
      alias: (item.alias || '').trim(),
      tags: Array.isArray(item.tags) ? item.tags.map(tag => String(tag).trim()).filter(Boolean) : [],
      category: item.category || '',
      previewVolume: normalizePreviewVolume(item.previewVolume),
    };
  };

  const persistAudioItems = (items: AudioItem[]) => {
    try {
      localStorage.setItem(AUDIO_ITEMS_STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      console.warn('保存音频列表到 localStorage 失败:', err);
    }
  };

  const fetchAudioList = async (isAutoRefresh = false) => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/list_audio');
      if (response.data.success) {
        const backendItems = Array.isArray(response.data.items) ? response.data.items : [];
        const files: string[] = Array.isArray(response.data.files) ? response.data.files : [];

        let items: AudioItem[] = [];
        if (backendItems.length > 0) {
          items = backendItems
            .filter((item: any) => item && typeof item.path === 'string' && item.exists !== false)
            .map((item: any) =>
              normalizeAudioItem({
                path: item.path,
                name: item.path.split('/').pop()?.replace(/\.[^/.]+$/, '') || item.path,
                alias: item.alias || '',
                tags: item.tags || [],
                category: item.category || '',
                previewVolume: item.previewVolume,
              })
            );
        } else {
          items = files.map(path => normalizeAudioItem({ path }));
        }

        setAudioItems(items);
        setDurationMap({});
        persistAudioItems(items);
        if (!isAutoRefresh) {
          toast.success('音频列表已更新');
        }
      } else {
        toast.error('获取音频列表失败: ' + response.data.message);
      }
    } catch (err) {
      console.error('获取音频列表出错:', err);
      toast.error('无法连接到后端服务', {
        description: '请确保 scripts/server.py 正在运行'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cached = localStorage.getItem(AUDIO_ITEMS_STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const items = parsed
            .filter(item => item && typeof item.path === 'string')
            .map(item => normalizeAudioItem(item));
          setAudioItems(items);
          return;
        }
      } catch (e) {
        console.warn('解析缓存音频列表失败');
      }
    }
    fetchAudioList(true);
  }, []);

  const filteredItems = useMemo(() => audioItems.filter(item => 
    item.name.toLowerCase().includes(searchText.toLowerCase()) ||
    item.alias.toLowerCase().includes(searchText.toLowerCase()) ||
    item.tags.join(' ').toLowerCase().includes(searchText.toLowerCase())
  ), [audioItems, searchText]);

  const saveSingleAudioMetadata = async (
    path: string,
    metadata: { alias: string; tags: string[]; category: string; previewVolume: number }
  ) => {
    const response = await axios.post('http://localhost:5000/audio_manifest', {
      items: { [path]: metadata }
    }).catch(err => {
      console.error('自动保存元数据失败:', err);
      return { data: { success: false, message: '网络错误' } };
    });
    return Boolean(response?.data?.success);
  };

  const updateItemMetadata = async (path: string, nextData: Partial<AudioItem>) => {
    const target = audioItems.find(item => item.path === path);
    if (!target) return false;

    const oldData = { ...target };
    const newData = { ...target, ...nextData };

    // 乐观更新
    setAudioItems(prev => {
      const next = prev.map(item => (item.path === path ? newData : item));
      persistAudioItems(next);
      return next;
    });

    const success = await saveSingleAudioMetadata(path, {
      alias: newData.alias,
      tags: newData.tags,
      category: newData.category || '',
      previewVolume: newData.previewVolume,
    });

    if (!success) {
      // 回滚
      setAudioItems(prev => {
        const next = prev.map(item => (item.path === path ? oldData : item));
        persistAudioItems(next);
        return next;
      });
      return false;
    }
    return true;
  };

  return {
    audioItems,
    filteredItems,
    loading,
    searchText,
    setSearchText,
    durationMap,
    setDurationMap,
    fetchAudioList,
    updateItemMetadata
  };
};
