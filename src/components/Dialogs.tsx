import React from 'react';
import { Modal, Button } from 'antd';
import { 
  ExclamationCircleOutlined, 
  QuestionCircleOutlined, 
  InfoCircleOutlined, 
  CheckCircleOutlined,
  CloseCircleOutlined 
} from '@ant-design/icons';

type DialogType = 'confirm' | 'info' | 'success' | 'error' | 'warning';

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

/**
 * 统一的 Dialogs 弹窗工具类
 * 为整个项目提供重要操作的确认、提示和反馈
 */
export const dialogs = {
  /**
   * 确认弹窗：用于删除、重置等危险或重要操作
   */
  confirm: (options: DialogOptions) => {
    Modal.confirm({
      title: options.title,
      icon: <QuestionCircleOutlined style={{ color: '#1890ff' }} />,
      content: options.content,
      okText: options.okText || '确定',
      cancelText: options.cancelText || '取消',
      okType: options.okType === 'danger' ? 'danger' : 'primary',
      centered: options.centered ?? true,
      width: options.width,
      onOk: options.onOk,
      onCancel: options.onCancel,
    });
  },

  /**
   * 警告弹窗：用于提示潜在风险
   */
  warning: (options: DialogOptions) => {
    Modal.warning({
      title: options.title,
      icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
      content: options.content,
      okText: options.okText || '知道了',
      centered: options.centered ?? true,
      width: options.width,
      onOk: options.onOk,
    });
  },

  /**
   * 成功提示弹窗
   */
  success: (options: DialogOptions) => {
    Modal.success({
      title: options.title,
      icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      content: options.content,
      okText: options.okText || '确定',
      centered: options.centered ?? true,
      width: options.width,
      onOk: options.onOk,
    });
  },

  /**
   * 错误提示弹窗
   */
  error: (options: DialogOptions) => {
    Modal.error({
      title: options.title,
      icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
      content: options.content,
      okText: options.okText || '确定',
      centered: options.centered ?? true,
      width: options.width,
      onOk: options.onOk,
    });
  },

  /**
   * 普通信息弹窗
   */
  info: (options: DialogOptions) => {
    Modal.info({
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
