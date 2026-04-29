import { useCallback, useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import { VideoConfig } from '@/types';

type TaskStatus = 'queued' | 'running' | 'success' | 'error' | 'cancelled';

export interface RenderTask {
  id: string;
  title: string;
  status: TaskStatus;
  progress?: { percent: number; task: string; detail?: string };
  message?: string;
  detail?: string;
  outputPath?: string | null;
  error?: string | null;
  createdAt: string;
  startedAt?: string | null;
  endedAt?: string | null;
  cancelRequested?: boolean;
}

const RENDER_API_BASE = 'http://localhost:5000';

export const useVideoRender = (videoConfig: VideoConfig) => {
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [autoRenderStatus, setAutoRenderStatus] = useState<any>(null);
  const [renderTasks, setRenderTasks] = useState<RenderTask[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [latestHandledTask, setLatestHandledTask] = useState<string | null>(null);

  const syncTasks = useCallback(async () => {
    const response = await fetch(`${RENDER_API_BASE}/render/tasks`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: '获取任务列表失败' }));
      throw new Error(errorData.message || `HTTP 错误: ${response.status}`);
    }
    const payload = await response.json();
    const tasks: RenderTask[] = Array.isArray(payload.tasks) ? payload.tasks : [];
    setRenderTasks(tasks);
    setActiveTaskId(payload.activeTaskId || null);
    return tasks;
  }, []);

  useEffect(() => {
    let disposed = false;
    let timer: number | null = null;

    const run = async () => {
      try {
        await syncTasks();
      } catch (err) {
        if (!disposed) {
          console.warn('拉取渲染任务失败:', err);
        }
      } finally {
        if (!disposed) {
          timer = window.setTimeout(run, 1500);
        }
      }
    };

    void run();
    return () => {
      disposed = true;
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [syncTasks]);

  const primaryTask = useMemo(() => {
    if (activeTaskId) {
      const byActiveId = renderTasks.find((task) => task.id === activeTaskId);
      if (byActiveId) {
        return byActiveId;
      }
    }
    return (
      renderTasks.find((task) => task.status === 'running') ||
      renderTasks.find((task) => task.status === 'queued') ||
      renderTasks[0] ||
      null
    );
  }, [activeTaskId, renderTasks]);

  useEffect(() => {
    const completedTask = renderTasks.find((task) =>
      ['success', 'error', 'cancelled'].includes(task.status)
    );
    if (!completedTask || completedTask.id === latestHandledTask) {
      return;
    }

    setLatestHandledTask(completedTask.id);
    if (completedTask.status === 'success') {
      message.success(`任务 ${completedTask.id} 渲染成功`);
    } else if (completedTask.status === 'error') {
      message.error(completedTask.message || '渲染失败');
    } else if (completedTask.status === 'cancelled') {
      message.info(`任务 ${completedTask.id} 已取消`);
    }
  }, [latestHandledTask, renderTasks]);

  const isAutoRendering = renderTasks.some((task) => task.status === 'running' || task.status === 'queued');
  const renderProgress = primaryTask?.progress || null;

  const startAutoRender = async () => {
    setAutoRenderStatus(null);
    setIsSubmittingTask(true);
    try {
      const response = await fetch(`${RENDER_API_BASE}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(videoConfig)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '服务器响应异常' }));
        throw new Error(errorData.message || `HTTP 错误: ${response.status}`);
      }

      const payload = await response.json();
      const taskId = payload?.task?.id as string | undefined;
      setAutoRenderStatus({
        type: 'success',
        message: taskId ? `任务已入队：${taskId}` : '渲染任务已加入队列'
      });
      await syncTasks();
    } catch (err: any) {
      console.error(err);
      setAutoRenderStatus({ 
        type: 'error', 
        message: `错误: ${err.message || '连接本地 Python 服务失败。'}` 
      });
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const cancelRenderTask = async (taskId: string) => {
    try {
      const response = await fetch(`${RENDER_API_BASE}/render/tasks/${taskId}/cancel`, {
        method: 'POST'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || `HTTP 错误: ${response.status}`);
      }
      message.info(payload.message || '已发送取消请求');
      await syncTasks();
    } catch (err: any) {
      message.error(err.message || '取消任务失败');
    }
  };

  const removeRenderTask = async (taskId: string) => {
    try {
      const response = await fetch(`${RENDER_API_BASE}/render/tasks/${taskId}`, {
        method: 'DELETE'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || `HTTP 错误: ${response.status}`);
      }
      message.success(payload.message || '任务已清除');
      await syncTasks();
    } catch (err: any) {
      message.error(err.message || '清除任务失败');
    }
  };

  const clearFinishedTasks = async (statuses: Array<'success' | 'error' | 'cancelled'> = ['success', 'error', 'cancelled']) => {
    try {
      const response = await fetch(`${RENDER_API_BASE}/render/tasks/cleanup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statuses })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || `HTTP 错误: ${response.status}`);
      }
      message.success(payload.message || '已清理任务');
      await syncTasks();
    } catch (err: any) {
      message.error(err.message || '批量清理失败');
    }
  };

  const downloadVideoConfig = () => {
    const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(videoConfig, null, 2))}`;
    const anchor = document.createElement('a');
    anchor.setAttribute('href', dataStr);
    anchor.setAttribute('download', `video-config.json`);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    message.success('配置文件已下载');
  };

  return {
    isAutoRendering,
    isSubmittingTask,
    autoRenderStatus,
    renderProgress,
    renderTasks,
    activeTaskId,
    startAutoRender,
    cancelRenderTask,
    removeRenderTask,
    clearFinishedTasks,
    refreshRenderTasks: syncTasks,
    downloadVideoConfig
  };
};
