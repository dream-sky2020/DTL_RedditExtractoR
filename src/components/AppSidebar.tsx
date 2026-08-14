import React from 'react';
import { Layout, Menu, Button } from 'antd';
import {
  AppstoreOutlined,
  FolderOutlined,
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
  AudioOutlined,
  HistoryOutlined,
  CustomerServiceOutlined,
  BgColorsOutlined,
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
            key: 'history_manager',
            icon: <HistoryOutlined />,
            label: '浏览历史管理',
          },
          {
            key: 'projects',
            icon: <FolderOutlined />,
            label: '项目管理',
          },
          {
            key: 'editor',
            icon: <EditOutlined />,
            label: '视频脚本编辑',
          },
          {
            key: 'identity',
            icon: <EyeOutlined />,
            label: '身份与代号管理',
          },
          {
            key: 'avatar_manager',
            icon: <FileImageOutlined />,
            label: '头像库管理',
          },
          {
            key: 'preview',
            icon: <VideoCameraOutlined />,
            label: '视频预览',
          },
          {
            key: 'render_tasks',
            icon: <VideoCameraOutlined />,
            label: '导出与渲染队列',
          },
          {
            key: 'ad_placement',
            icon: <BgColorsOutlined />,
            label: '植入广告',
          },
          {
            key: 'chroma_key_test',
            icon: <FileImageOutlined />,
            label: '抠绿参数测试',
          },
          {
            key: 'background_video',
            icon: <PlayCircleOutlined />,
            label: '背景视频轨道',
          },
          {
            key: 'bgm_settings',
            icon: <CustomerServiceOutlined />,
            label: '全局背景音乐',
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
            key: 'qwen_tts_try',
            icon: <AudioOutlined />,
            label: 'Qwen3-TTS 试听',
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
