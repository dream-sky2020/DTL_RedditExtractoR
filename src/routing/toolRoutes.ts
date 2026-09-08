import type { ToolKey } from '@/types';

export interface ToolRouteState {
  tool: ToolKey;
  sceneIdx?: number;
}

export interface ToolNavigationOptions {
  sceneIdx?: number;
  replace?: boolean;
}

export type NavigateToTool = (tool: ToolKey, options?: ToolNavigationOptions) => void;

export const TOOL_PATHS: Record<ToolKey, string> = {
  extract: '/extract',
  projects: '/projects',
  raw_data: '/data/raw',
  filtered_data: '/data/filtered',
  script_data: '/data/script',
  editor: '/editor',
  preview: '/preview',
  render_tasks: '/render-tasks',
  ad_placement: '/ad-placement',
  chroma_key_test: '/chroma-key-test',
  background_video: '/background-video',
  bgm_settings: '/bgm-settings',
  static_preview: '/static-preview',
  studio: '/studio',
  studio_scene: '/studio/scene',
  frame_test: '/frame-test',
  simulation: '/simulation',
  audio_preview: '/audio-preview',
  component_test: '/component-test',
  qwen_tts_try: '/qwen-tts',
  identity: '/identity',
  history_manager: '/history',
  avatar_manager: '/avatars',
};

const PATH_TO_TOOL = new Map(
  Object.entries(TOOL_PATHS)
    .filter(([tool]) => tool !== 'studio_scene')
    .map(([tool, path]) => [path, tool as ToolKey]),
);

const normalizePathname = (pathname: string) => {
  const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return withLeadingSlash.length > 1 ? withLeadingSlash.replace(/\/+$/, '') : withLeadingSlash;
};

export const buildToolPath = (tool: ToolKey, sceneIdx = 0) => {
  if (tool === 'studio_scene') {
    return `${TOOL_PATHS.studio_scene}/${Math.max(0, Math.floor(sceneIdx))}`;
  }
  return TOOL_PATHS[tool];
};

export const parseToolPath = (pathname: string): ToolRouteState => {
  const normalized = normalizePathname(pathname);
  if (normalized === '/') return { tool: 'extract' };

  const sceneMatch = normalized.match(/^\/studio\/scene\/(\d+)$/);
  if (sceneMatch) {
    return { tool: 'studio_scene', sceneIdx: Number(sceneMatch[1]) };
  }
  if (normalized === TOOL_PATHS.studio_scene) {
    return { tool: 'studio_scene', sceneIdx: 0 };
  }

  return { tool: PATH_TO_TOOL.get(normalized) ?? 'extract' };
};

export const canonicalToolPath = (route: ToolRouteState) => (
  buildToolPath(route.tool, route.sceneIdx)
);
