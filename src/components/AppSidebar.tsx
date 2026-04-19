import React from 'react';
import { Layout, Menu, Button } from 'antd';
import {
  AppstoreOutlined,
  LinkOutlined,
  CodeOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  VideoCameraOutlined,
  EditOutlined,
  FileImageOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  SoundOutlined,
} from '@ant-design/icons';
import { ToolKey } from '../types';

const { Sider } = Layout;

interface AppSidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  activeTool: ToolKey;
  onMenuSelect: (info: { key: string }) => void;
  headerHidden: boolean;
  setHeaderHidden: (hidden: boolean | ((prev: boolean) => boolean)) => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  collapsed,
  setCollapsed,
  activeTool,
  onMenuSelect,
  headerHidden,
  setHeaderHidden,
}) => {
  return (
    <Sider
      collapsed={collapsed}
      collapsible
      trigger={null}
      width={240}
      className="admin-sider"
    >
      <div className="brand-wrap">
        {!collapsed && (
          <div className="brand-text">
            <div className="brand-title">RedditExtractor</div>
            <div className="brand-subtitle">Video Creator</div>
          </div>
        )}
      </div>

      <Menu
        theme="dark"
        mode="inline"
        className="sider-menu"
        selectedKeys={[activeTool === 'studio_scene' ? 'studio' : activeTool]}
        onSelect={(item) => onMenuSelect({ key: item.key })}
        items={[
          {
            key: 'extract',
            icon: <LinkOutlined />,
            label: 'Reddit 链接提取',
          },
          {
            key: 'editor',
            icon: <EditOutlined />,
            label: '视频脚本编辑',
          },
          {
            key: 'preview',
            icon: <VideoCameraOutlined />,
            label: '视频预览与导出',
          },
          {
            key: 'studio',
            icon: <AppstoreOutlined />,
            label: '视频编辑画板',
          },
          {
            key: 'component_test',
            icon: <AppstoreOutlined />,
            label: '组件测试',
          },
          {
            key: 'audio_preview',
            icon: <SoundOutlined />,
            label: '音频预览',
          },
          {
            key: 'data_view',
            label: '数据查看',
            icon: <CodeOutlined />,
            children: [
              {
                key: 'filtered_data',
                icon: <CodeOutlined />,
                label: '过滤后 JSON',
              },
              {
                key: 'raw_data',
                icon: <CodeOutlined />,
                label: '未处理 JSON',
              },
              {
                key: 'script_data',
                icon: <CodeOutlined />,
                label: '视频脚本 JSON',
              },
            ],
          },
          {
            key: 'deprecated',
            label: '废弃页面',
            icon: <EyeInvisibleOutlined />,
            children: [
              {
                key: 'editor',
                icon: <EditOutlined />,
                label: '视频脚本编辑',
              },
              {
                key: 'static_preview',
                icon: <FileImageOutlined />,
                label: '画面预览 (PPT)',
              },
              {
                key: 'frame_test',
                icon: <CodeOutlined />,
                label: '画面格测试',
              },
              {
                key: 'simulation',
                icon: <PlayCircleOutlined />,
                label: '模拟程序',
              },
            ],
          },
        ]}
      />

      <div className="sider-trigger-wrap">
        <Button
          type="text"
          className="sider-trigger-btn"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          {!collapsed && <span className="sider-trigger-text">收起导航</span>}
        </Button>
        <Button
          type="text"
          className="sider-trigger-btn"
          onClick={() => setHeaderHidden((prev: boolean) => !prev)}
        >
          {headerHidden ? <EyeOutlined /> : <EyeInvisibleOutlined />}
          {!collapsed && <span className="sider-trigger-text">{headerHidden ? '显示顶栏' : '隐藏顶栏'}</span>}
        </Button>
      </div>
    </Sider>
  );
};
