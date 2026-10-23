import type { AdRenderRequest, VideoItem } from './types';

const API_BASE = 'http://localhost:5000';

interface ApiResponse {
  success: boolean;
  message?: string;
}

interface MediaListResponse extends ApiResponse {
  rendered?: VideoItem[];
  adVideos?: VideoItem[];
  greenScreens?: VideoItem[];
  guideAudios?: VideoItem[];
}

interface PickMediaResponse extends ApiResponse {
  path: string;
  item: VideoItem | null;
}

async function request<T extends ApiResponse>(
  path: string,
  fallback: string | ((status: number) => string),
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init);
  const payload = await response.json().catch(() => ({})) as T;
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || (typeof fallback === 'function' ? fallback(response.status) : fallback));
  }
  return payload;
}

export const getVideoUrl = (path?: string) =>
  path ? `${API_BASE}/proxy_local_video?path=${encodeURIComponent(path)}` : '';
export const getAudioUrl = (path?: string) =>
  path ? `${API_BASE}/proxy_local_audio?path=${encodeURIComponent(path)}` : '';
export const isGeneratedAdComposite = (path: string) => /-ad-[0-9a-f]{8}/i.test(path);

export async function listAdMedia() {
  const payload = await request<MediaListResponse>('/ad/videos', (status) =>
    `广告素材接口返回 HTTP ${status}。请停止旧服务并重新启动本项目的 scripts/server.py。`);
  return {
    rendered: (Array.isArray(payload.rendered) ? payload.rendered : [])
      .filter((item) => !isGeneratedAdComposite(item.path)),
    adVideos: Array.isArray(payload.adVideos) ? payload.adVideos
      : Array.isArray(payload.greenScreens) ? payload.greenScreens : [],
    guideAudios: Array.isArray(payload.guideAudios) ? payload.guideAudios : [],
  };
}

export const pickVideoFile = () => request<PickMediaResponse>('/pick_video_file', (status) =>
  `文件选择接口返回 HTTP ${status}。请停止旧服务并重新启动本项目的 scripts/server.py。`);

export const pickAudioFile = () => request<PickMediaResponse>('/pick_audio_file', (status) =>
  `音频文件选择接口返回 HTTP ${status}`);

export const pickSubtitleFile = () => request<ApiResponse & { path: string; content: string }>(
  '/pick_srt_file', '读取 SRT 字幕失败');

export const createAdRenderTask = (config: AdRenderRequest) =>
  request<ApiResponse & { task?: { id: string } }>('/ad/render', '创建广告合成任务失败', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
