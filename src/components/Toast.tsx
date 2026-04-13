import { App } from 'antd';

interface ToastOptions {
  duration?: number;
  description?: string;
  placement?: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
}

// 单例引用
let messageApi: any = null;
let notificationApi: any = null;

/**
 * ToastInit 组件：用于在 Ant Design 的 App 组件内部获取 message 和 notification 实例
 */
export const ToastInit: React.FC = () => {
  const { message: antdMessage, notification: antdNotification } = App.useApp();
  messageApi = antdMessage;
  notificationApi = antdNotification;
  return null;
};

/**
 * 统一的 Toast 弹窗组件
 * 集成了 antd 的 message (轻量提示) 和 notification (重要通知)
 */
export const toast = {
  success: (content: string, options?: ToastOptions) => {
    if (options?.description) {
      notificationApi?.success({
        message: content,
        description: options.description,
        duration: options.duration,
        placement: options.placement || 'topRight',
      });
    } else {
      messageApi?.success(content, options?.duration);
    }
  },
  
  error: (content: string, options?: ToastOptions) => {
    if (options?.description) {
      notificationApi?.error({
        message: content,
        description: options.description,
        duration: options.duration || 0,
        placement: options.placement || 'topRight',
      });
    } else {
      messageApi?.error(content, options?.duration || 4);
    }
  },
  
  info: (content: string, options?: ToastOptions) => {
    if (options?.description) {
      notificationApi?.info({
        message: content,
        description: options.description,
        duration: options.duration,
        placement: options.placement || 'topRight',
      });
    } else {
      messageApi?.info(content, options?.duration);
    }
  },
  
  warning: (content: string, options?: ToastOptions) => {
    if (options?.description) {
      notificationApi?.warning({
        message: content,
        description: options.description,
        duration: options.duration,
        placement: options.placement || 'topRight',
      });
    } else {
      messageApi?.warning(content, options?.duration);
    }
  }
};
