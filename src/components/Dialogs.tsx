import React from 'react';
import { App } from 'antd';
import type { ModalFuncProps } from 'antd';
import { 
  ExclamationCircleOutlined, 
  QuestionCircleOutlined, 
  InfoCircleOutlined, 
  CheckCircleOutlined,
  CloseCircleOutlined 
} from '@ant-design/icons';

interface DialogOptions {
  title: string;
  content: React.ReactNode;
  onOk?: () => void | Promise<any>;
  onCancel?: () => void;
  okText?: string;
  cancelText?: string;
  okType?: 'primary' | 'danger' | 'default';
  width?: number | string;
  centered?: boolean;
}

// 这是一个单例引用，将在 App 组件初始化时被赋值
let modal: any = null;

/**
 * DialogsInit 组件：用于在 Ant Design 的 App 组件内部获取 modal 实例
 */
export const DialogsInit: React.FC = () => {
  const { modal: antdModal } = App.useApp();
  modal = antdModal;
  return null;
};

/**
 * 统一的 Dialogs 弹窗工具类
 * 为整个项目提供重要操作的确认、提示和反馈
 */
export const dialogs = {
  confirm: (options: DialogOptions) => {
    if (!modal) {
      console.error('Dialogs not initialized. Make sure <DialogsInit /> is inside <App />');
      return;
    }
    modal.confirm({
      title: options.title,
      icon: <QuestionCircleOutlined style={{ color: '#1890ff' }} />,
      content: options.content,
      okText: options.okText || '确定',
      cancelText: options.cancelText || '取消',
      okButtonProps: {
        danger: options.okType === 'danger'
      },
      centered: options.centered ?? true,
      width: options.width,
      onOk: options.onOk,
      onCancel: options.onCancel,
    });
  },

  warning: (options: DialogOptions) => {
    if (!modal) return;
    modal.warning({
      title: options.title,
      icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
      content: options.content,
      okText: options.okText || '知道了',
      centered: options.centered ?? true,
      width: options.width,
      onOk: options.onOk,
    });
  },

  success: (options: DialogOptions) => {
    if (!modal) return;
    modal.success({
      title: options.title,
      icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      content: options.content,
      okText: options.okText || '确定',
      centered: options.centered ?? true,
      width: options.width,
      onOk: options.onOk,
    });
  },

  error: (options: DialogOptions) => {
    if (!modal) return;
    modal.error({
      title: options.title,
      icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
      content: options.content,
      okText: options.okText || '确定',
      centered: options.centered ?? true,
      width: options.width,
      onOk: options.onOk,
    });
  },

  info: (options: DialogOptions) => {
    if (!modal) return;
    modal.info({
      title: options.title,
      icon: <InfoCircleOutlined style={{ color: '#1890ff' }} />,
      content: options.content,
      okText: options.okText || '确定',
      centered: options.centered ?? true,
      width: options.width,
      onOk: options.onOk,
    });
  }
};
