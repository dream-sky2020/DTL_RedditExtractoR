import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { VideoScene } from '@/types';
import { DSL_SNAPSHOT_STORAGE_KEY } from '@/constants/storage';

interface SnapshotState {
  dslSnapshot: VideoScene[] | null;
  snapshotTime: string | null;
  
  // Actions
  saveSnapshot: (scenes: VideoScene[]) => void;
  loadSnapshot: () => VideoScene[] | null;
  clearSnapshot: () => void;
  hasSnapshot: () => boolean;
}

export const useSnapshotStore = create<SnapshotState>()(
  persist(
    (set, get) => ({
      dslSnapshot: null,
      snapshotTime: null,

      saveSnapshot: (scenes) => {
        set({
          dslSnapshot: JSON.parse(JSON.stringify(scenes)),
          snapshotTime: new Date().toLocaleString(),
        });
      },

      loadSnapshot: () => {
        return get().dslSnapshot;
      },

      clearSnapshot: () => {
        set({ dslSnapshot: null, snapshotTime: null });
      },

      hasSnapshot: () => {
        return get().dslSnapshot !== null;
      },
    }),
    {
      name: DSL_SNAPSHOT_STORAGE_KEY,
    }
  )
);
