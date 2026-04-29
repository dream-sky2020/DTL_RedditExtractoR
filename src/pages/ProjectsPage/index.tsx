import React, { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Input,
  List,
  Popconfirm,
  Space,
  Tag,
  Typography,
} from 'antd';
import {
  CopyOutlined,
  DeleteOutlined,
  FolderAddOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { useProjectsStore } from '@/store';

const { Text } = Typography;

export const ProjectsPage: React.FC = () => {
  const {
    projects,
    currentProjectId,
    createProject,
    switchProject,
    renameProject,
    deleteProject,
  } = useProjectsStore();

  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [projects]
  );

  const startEdit = (projectId: string, projectName: string) => {
    setEditingId(projectId);
    setEditingName(projectName);
  };

  const submitEdit = () => {
    if (!editingId) {
      return;
    }
    renameProject(editingId, editingName);
    setEditingId(null);
    setEditingName('');
  };

  return (
    <Card className="panel-card" bordered={false}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Text strong>本地项目管理</Text>
          <Tag color="blue">当前项目: {projects.find((p) => p.id === currentProjectId)?.name || '-'}</Tag>
        </Space>

        <Space.Compact style={{ width: '100%' }}>
          <Input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="输入新项目名称"
            onPressEnter={() => void createProject(newName, false).then(() => setNewName(''))}
          />
          <Button
            icon={<FolderAddOutlined />}
            onClick={() => void createProject(newName, false).then(() => setNewName(''))}
          >
            新建空项目
          </Button>
          <Button
            icon={<CopyOutlined />}
            onClick={() => void createProject(newName || '复制项目', true).then(() => setNewName(''))}
          >
            复制当前项目
          </Button>
        </Space.Compact>

        <List
          bordered
          dataSource={sortedProjects}
          locale={{ emptyText: '暂无项目' }}
          renderItem={(project) => (
            <List.Item
              actions={[
                project.id !== currentProjectId ? (
                  <Button
                    key="switch"
                    size="small"
                    icon={<SwapOutlined />}
                    onClick={() => void switchProject(project.id)}
                  >
                    切换
                  </Button>
                ) : null,
                <Button
                  key="rename"
                  size="small"
                  onClick={() => startEdit(project.id, project.name)}
                >
                  重命名
                </Button>,
                <Popconfirm
                  key="delete"
                  title="确认删除该项目？"
                  description="会删除该项目本地缓存的脚本与抓取数据。"
                  onConfirm={() => void deleteProject(project.id)}
                  okText="删除"
                  cancelText="取消"
                >
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    disabled={project.id === currentProjectId && projects.length <= 1}
                  >
                    删除
                  </Button>
                </Popconfirm>,
              ].filter(Boolean)}
            >
              <Space direction="vertical" size={2} style={{ width: '100%' }}>
                <Space size="small">
                  <Text strong>{project.name}</Text>
                  {project.id === currentProjectId && <Tag color="green">当前</Tag>}
                </Space>
                <Text type="secondary">更新于: {new Date(project.updatedAt).toLocaleString()}</Text>
              </Space>
            </List.Item>
          )}
        />

        {editingId && (
          <Space.Compact style={{ width: '100%' }}>
            <Input
              value={editingName}
              onChange={(event) => setEditingName(event.target.value)}
              onPressEnter={submitEdit}
              placeholder="输入新的项目名称"
            />
            <Button type="primary" onClick={submitEdit}>保存</Button>
            <Button onClick={() => setEditingId(null)}>取消</Button>
          </Space.Compact>
        )}
      </Space>
    </Card>
  );
};
