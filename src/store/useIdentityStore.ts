import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthorProfile } from '@/types';
import { GLOBAL_PROFILES_KEY } from '@/constants/storage';

interface IdentityState {
  globalProfiles: Record<string, AuthorProfile>;
  
  // Actions
  setGlobalProfile: (author: string, profile: AuthorProfile) => void;
  removeGlobalProfile: (author: string) => void;
  batchSetGlobalProfiles: (profiles: Record<string, AuthorProfile>) => void;
  clearGlobalLibrary: () => void;
}

export const useIdentityStore = create<IdentityState>()(
  persist(
    (set) => ({
      globalProfiles: {},

      setGlobalProfile: (author, profile) => set((state) => ({
        globalProfiles: {
          ...state.globalProfiles,
          [author]: {
            ...profile,
            updatedAt: Date.now()
          }
        }
      })),

      removeGlobalProfile: (author) => set((state) => {
        const next = { ...state.globalProfiles };
        delete next[author];
        return { globalProfiles: next };
      }),

      batchSetGlobalProfiles: (profiles) => set((state) => {
        const next = { ...state.globalProfiles };
        Object.entries(profiles).forEach(([author, profile]) => {
          next[author] = {
            ...profile,
            updatedAt: profile.updatedAt || Date.now()
          };
        });
        return { globalProfiles: next };
      }),

      clearGlobalLibrary: () => set({ globalProfiles: {} }),
    }),
    {
      name: GLOBAL_PROFILES_KEY,
    }
  )
);
