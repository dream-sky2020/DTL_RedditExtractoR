import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { message } from 'antd';
import { PROJECTS_STORAGE_KEY } from '@/constants/storage';
import { VideoConfig, AuthorProfile, DEFAULT_GLOBAL_SETTINGS, ColorArrangementSettings } from '@/types';
import { createDefaultVideoCanvasConfig } from '@/rendering/videoCanvas';

interface ProjectMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectSnapshot {
  reddit: {
    redditUrl: string;
    result: any;
    rawResult: any;
    allAuthors: string[];
    authorProfiles: Record<string, AuthorProfile>;
    hasStoredRawData: boolean;
  };
  video: {
    videoConfig: VideoConfig;
  };
  settings: typeof DEFAULT_GLOBAL_SETTINGS & { colorArrangement: ColorArrangementSettings };
}

interface ProjectsState {
  projects: ProjectMeta[];
  currentProjectId: string | null;
  snapshots: Record<string, ProjectSnapshot>;
  initialized: boolean;
  initProjectSystem: () => Promise<void>;
  createProject: (name: string, cloneCurrent?: boolean) => Promise<void>;
  switchProject: (projectId: string) => Promise<void>;
  renameProject: (projectId: string, nextName: string) => void;
  deleteProject: (projectId: string) => Promise<void>;
  saveCurrentProjectSnapshot: () => Promise<void>;
}

const nowIso = () => new Date().toISOString();
const generateId = () => `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const DEFAULT_COLOR_ARRANGEMENT: ColorArrangementSettings = {
  mode: 'uniform',
  hueOffset: 0,
  hueStep: 137.508,
  saturation: 68,
  lightness: 52,
  seed: 20260402,
};
const deepClone = <T,>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

const buildDefaultRedditSnapshot = () => ({
  redditUrl: '',
  result: null,
  rawResult: null,
  allAuthors: [],
  authorProfiles: {} as Record<string, AuthorProfile>,
  hasStoredRawData: false,
});

const buildDefaultVideoSnapshot = (): { videoConfig: VideoConfig } => ({
  videoConfig: {
    title: '你的精彩标题',
    subreddit: 'interestingasfuck',
    canvas: createDefaultVideoCanvasConfig(),
    scenes: [
      {
        id: 'scene-main',
        type: 'post',
        title: '贴子正文',
        duration: 5,
        items: [
          {
            id: 'main-post',
            author: 'RedditUser',
            content: '这里是你的视频正文内容预览。你可以通过抓取 Reddit 链接自动填充，或者在这里手动修改。',
          }
        ]
      }
    ]
  }
});

const buildDefaultSettingsSnapshot = () => ({
  ...DEFAULT_GLOBAL_SETTINGS,
  colorArrangement: { ...DEFAULT_COLOR_ARRANGEMENT },
});

const buildSnapshotFromStores = async (): Promise<ProjectSnapshot> => {
  const { useRedditStore } = await import('./useRedditStore');
  const { useVideoStore } = await import('./useVideoStore');
  const { useSettingsStore } = await import('./useSettingsStore');
  const reddit = useRedditStore.getState().getProjectState();
  const video = useVideoStore.getState().getProjectState();
  const settings = useSettingsStore.getState().getProjectState();
  return deepClone({ reddit, video, settings });
};

const applySnapshotToStores = async (snapshot: ProjectSnapshot) => {
  const { useRedditStore } = await import('./useRedditStore');
  const { useVideoStore } = await import('./useVideoStore');
  const { useSettingsStore } = await import('./useSettingsStore');
  const safeSnapshot = deepClone(snapshot);
  useRedditStore.getState().applyProjectState(safeSnapshot.reddit);
  useVideoStore.getState().applyProjectState(safeSnapshot.video);
  useSettingsStore.getState().applyProjectState(safeSnapshot.settings || buildDefaultSettingsSnapshot());
};

export const useProjectsStore = create<ProjectsState>()(
  persist(
    (set, get) => ({
      projects: [],
      currentProjectId: null,
      snapshots: {},
      initialized: false,

      initProjectSystem: async () => {
        if (get().initialized) {
          return;
        }

        const { projects, currentProjectId, snapshots } = get();
        if (projects.length === 0) {
          const projectId = generateId();
          const snapshot = await buildSnapshotFromStores();
          const now = nowIso();
          set({
            projects: [{
              id: projectId,
              name: '默认项目',
              createdAt: now,
              updatedAt: now,
            }],
            currentProjectId: projectId,
            snapshots: { [projectId]: snapshot },
            initialized: true,
          });
          return;
        }

        const fallbackId = projects[0].id;
        const activeId = (currentProjectId && snapshots[currentProjectId]) ? currentProjectId : fallbackId;
        const snapshot = snapshots[activeId];
        if (snapshot) {
          await applySnapshotToStores(snapshot);
        }
        set({ currentProjectId: activeId, initialized: true });
      },

      createProject: async (name, cloneCurrent = false) => {
        const trimmed = name.trim();
        if (!trimmed) {
          message.warning('项目名不能为空');
          return;
        }

        await get().saveCurrentProjectSnapshot();
        const snapshot = cloneCurrent
          ? await buildSnapshotFromStores()
          : deepClone({
              reddit: buildDefaultRedditSnapshot(),
              video: buildDefaultVideoSnapshot(),
              settings: buildDefaultSettingsSnapshot(),
            });

        const projectId = generateId();
        const now = nowIso();
        set((state) => ({
          projects: [{
            id: projectId,
            name: trimmed,
            createdAt: now,
            updatedAt: now,
          }, ...state.projects],
          currentProjectId: projectId,
          snapshots: {
            ...state.snapshots,
            [projectId]: snapshot,
          },
        }));
        await applySnapshotToStores(snapshot);
        message.success('项目已创建');
      },

      switchProject: async (projectId) => {
        const { snapshots, projects } = get();
        if (!projects.some((p) => p.id === projectId)) {
          message.error('项目不存在');
          return;
        }
        await get().saveCurrentProjectSnapshot();
        const snapshot = snapshots[projectId];
        if (!snapshot) {
          message.error('项目数据损坏，无法切换');
          return;
        }
        await applySnapshotToStores(snapshot);
        set({ currentProjectId: projectId });
        message.success('已切换项目');
      },

      renameProject: (projectId, nextName) => {
        const trimmed = nextName.trim();
        if (!trimmed) {
          message.warning('项目名不能为空');
          return;
        }
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === projectId
              ? { ...project, name: trimmed, updatedAt: nowIso() }
              : project
          ),
        }));
      },

      deleteProject: async (projectId) => {
        const { projects, currentProjectId } = get();
        if (!projects.some((p) => p.id === projectId)) {
          return;
        }
        if (projects.length === 1) {
          message.warning('至少保留一个项目');
          return;
        }

        const remain = projects.filter((project) => project.id !== projectId);
        const nextCurrentId = currentProjectId === projectId ? remain[0].id : currentProjectId;
        set((state) => {
          const nextSnapshots = { ...state.snapshots };
          delete nextSnapshots[projectId];
          return {
            projects: remain,
            currentProjectId: nextCurrentId || null,
            snapshots: nextSnapshots,
          };
        });

        if (currentProjectId === projectId && nextCurrentId) {
          const nextSnapshot = get().snapshots[nextCurrentId];
          if (nextSnapshot) {
            await applySnapshotToStores(nextSnapshot);
          }
        }
        message.success('项目已删除');
      },

      saveCurrentProjectSnapshot: async () => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) {
          return;
        }
        if (!projects.some((project) => project.id === currentProjectId)) {
          return;
        }
        const snapshot = await buildSnapshotFromStores();
        set((state) => ({
          snapshots: {
            ...state.snapshots,
            [currentProjectId]: snapshot,
          },
          projects: state.projects.map((project) =>
            project.id === currentProjectId
              ? { ...project, updatedAt: nowIso() }
              : project
          ),
        }));
      },
    }),
    {
      name: PROJECTS_STORAGE_KEY,
      partialize: (state) => ({
        projects: state.projects,
        currentProjectId: state.currentProjectId,
        snapshots: state.snapshots,
      }),
    }
  )
);
