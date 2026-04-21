import { useState } from 'react';
import { message } from 'antd';
import { VideoConfig } from '../types';

export const useVideoRender = (videoConfig: VideoConfig) => {
  const [isAutoRendering, setIsAutoRendering] = useState(false);
  const [autoRenderStatus, setAutoRenderStatus] = useState<any>(null);
  const [renderProgress, setRenderProgress] = useState<{ percent: number, task: string, detail?: string } | null>(null);

  const startAutoRender = async () => {
    setIsAutoRendering(true);
    setAutoRenderStatus(null);
    setRenderProgress({ percent: 0, task: '🚀 正在初始化渲染...' });
    
    try {
      const response = await fetch('http://localhost:5000/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(videoConfig)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '服务器响应异常' }));
        throw new Error(errorData.message || `HTTP 错误: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('无法建立数据流连接');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.type === 'progress') {
              setRenderProgress({
                percent: data.percent,
                task: data.task,
                detail: data.detail
              });
            } else if (data.type === 'success') {
              setRenderProgress({ percent: 100, task: '✅ 渲染完成！' });
              setAutoRenderStatus({ 
                type: 'success', 
                message: `视频导出成功！位置：${data.path}` 
              });
              message.success('渲染成功！');
            } else if (data.type === 'error') {
              setAutoRenderStatus({ type: 'error', message: data.message });
              message.error(data.message);
            }
          } catch (e) {
            console.warn('解析 JSON 行失败:', line);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setAutoRenderStatus({ 
        type: 'error', 
        message: `错误: ${err.message || '连接本地 Python 服务失败。'}` 
      });
    } finally {
      setIsAutoRendering(false);
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
    autoRenderStatus,
    renderProgress,
    startAutoRender,
    downloadVideoConfig
  };
};
