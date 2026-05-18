import { create } from 'zustand';
import axios from 'axios';
import { toast } from '@components/Toast';

export interface AvatarManifestItem {
  path: string;
  enabled: boolean;
  tags: string[];
  exists?: boolean;
}

interface AvatarState {
  items: AvatarManifestItem[];
  loading: boolean;
  
  // Actions
  fetchAvatars: () => Promise<void>;
  updateAvatarMeta: (path: string, updates: Partial<AvatarManifestItem>) => Promise<void>;
  batchUpdateAvatars: (updates: Record<string, Partial<AvatarManifestItem>>) => Promise<void>;
  getEnabledAvatars: () => string[];
}

export const useAvatarStore = create<AvatarState>()((set, get) => ({
  items: [],
  loading: false,

  fetchAvatars: async () => {
    set({ loading: true });
    try {
      const response = await axios.get('http://localhost:5000/list_avatars');
      if (response.data.success) {
        set({ items: response.data.items });
      }
    } catch (err) {
      console.error('Failed to fetch avatars:', err);
      toast.error('获取头像列表失败');
    } finally {
      set({ loading: false });
    }
  },

  updateAvatarMeta: async (path, updates) => {
    const currentItem = get().items.find(item => item.path === path);
    if (!currentItem) return;

    const nextMeta = { ...currentItem, ...updates };
    // Remove exists from manifest
    const { exists, ...cleanMeta } = nextMeta;

    try {
      const response = await axios.post('http://localhost:5000/avatar_manifest', {
        items: { [path]: cleanMeta }
      });
      if (response.data.success) {
        set(state => ({
          items: state.items.map(item => item.path === path ? { ...item, ...updates } : item)
        }));
      }
    } catch (err) {
      console.error('Failed to update avatar meta:', err);
      toast.error('更新头像配置失败');
    }
  },

  batchUpdateAvatars: async (updates) => {
    const payload: Record<string, any> = {};
    Object.entries(updates).forEach(([path, meta]) => {
      const current = get().items.find(i => i.path === path);
      if (current) {
        const next = { ...current, ...meta };
        const { exists, ...cleanNext } = next;
        payload[path] = cleanNext;
      }
    });

    try {
      const response = await axios.post('http://localhost:5000/avatar_manifest', {
        items: payload
      });
      if (response.data.success) {
        set(state => ({
          items: state.items.map(item => updates[item.path] ? { ...item, ...updates[item.path] } : item)
        }));
        toast.success('批量更新成功');
      }
    } catch (err) {
      console.error('Failed to batch update avatars:', err);
      toast.error('批量更新失败');
    }
  },

  getEnabledAvatars: () => {
    return get().items
      .filter(item => item.enabled)
      .map(item => item.path);
  }
}));
