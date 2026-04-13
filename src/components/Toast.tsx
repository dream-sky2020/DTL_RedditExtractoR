import { message, notification } from 'antd';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  duration?: number;
  description?: string;
  placement?: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
}

/**
 * 统一的 Toast 弹窗组件
 * 集成了 antd 的 message (轻量提示) 和 notification (重要通知)
 */
export const toast = {
  success: (content: string, options?: ToastOptions) => {
    if (options?.description) {
      notification.success({
        message: content,
        description: options.description,
        duration: options.duration,
        placement: options.placement || 'topRight',
      });
    } else {
      message.success(content, options?.duration);
    }
  },
  
  error: (content: string, options?: ToastOptions) => {
    if (options?.description) {
      notification.error({
        message: content,
        description: options.description,
        duration: options.duration || 0, // 错误默认不自动关闭
        placement: options.placement || 'topRight',
      });
    } else {
      message.error(content, options?.duration || 4);
    }
  },
  
  info: (content: string, options?: ToastOptions) => {
    if (options?.description) {
      notification.info({
        message: content,
        description: options.description,
        duration: options.duration,
        placement: options.placement || 'topRight',
      });
    } else {
      message.info(content, options?.duration);
    }
  },
  
  warning: (content: string, options?: ToastOptions) => {
    if (options?.description) {
      notification.warning({
        message: content,
        description: options.description,
        duration: options.duration,
        placement: options.placement || 'topRight',
      });
    } else {
      message.warning(content, options?.duration);
    }
  }
};
