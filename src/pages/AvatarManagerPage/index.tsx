import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Button, Input, Space, Typography, Empty, Row, Col, Spin, Switch, Tag, Tooltip, Modal, Pagination, Checkbox, Divider } from 'antd';
import { SearchOutlined, ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, TagsOutlined, SelectOutlined, CheckSquareOutlined, BorderOutlined } from '@ant-design/icons';
import { useAvatarStore, AvatarManifestItem } from '@/store/useAvatarStore';
import { toast } from '@components/Toast';
import { AvatarCard } from './AvatarCard';

const { Title, Text } = Typography;

export const AvatarManagerPage: React.FC = () => {
  const { items, loading, fetchAvatars, updateAvatarMeta, batchUpdateAvatars } = useAvatarStore();
  const [searchText, setSearchText] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);

  // Multi-select state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAvatars();
  }, []);

  const filteredItems = useMemo(() => {
    const filtered = items.filter(item => {
      const fileName = item.path.split('/').pop() || '';
      return fileName.toLowerCase().includes(searchText.toLowerCase()) || 
             item.tags.some(tag => tag.toLowerCase().includes(searchText.toLowerCase()));
    });
    return filtered;
  }, [items, searchText]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText]);

  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const handleToggleEnabled = useCallback((path: string, enabled: boolean) => {
    updateAvatarMeta(path, { enabled });
  }, [updateAvatarMeta]);

  const handleSelect = useCallback((path: string, selected: boolean) => {
    setSelectedPaths(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(path);
      } else {
        next.delete(path);
      }
      return next;
    });
  }, []);

  const handleSelectAll = () => {
    if (selectedPaths.size === filteredItems.length) {
      setSelectedPaths(new Set());
    } else {
      setSelectedPaths(new Set(filteredItems.map(i => i.path)));
    }
  };

  const handleBatchToggle = (enabled: boolean) => {
    const pathsToUpdate = isSelectMode ? Array.from(selectedPaths) : filteredItems.map(i => i.path);
    
    if (pathsToUpdate.length === 0) {
      toast.info('请先选择头像');
      return;
    }

    const updates: Record<string, Partial<AvatarManifestItem>> = {};
    pathsToUpdate.forEach(path => {
      updates[path] = { enabled };
    });
    
    batchUpdateAvatars(updates).then(() => {
      if (isSelectMode) {
        setIsSelectMode(false);
        setSelectedPaths(new Set());
      }
    });
  };

  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    setSelectedPaths(new Set());
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <Title level={2} style={{ marginBottom: 0 }}>头像库管理</Title>
          <Text type="secondary">
            {loading ? '正在扫描头像文件...' : `共发现 ${items.length} 个头像文件。已启用 ${items.filter(i => i.enabled).length} 个。`}
            {filteredItems.length !== items.length && ` (搜索结果: ${filteredItems.length})`}
          </Text>
        </div>
        <Space direction="vertical" align="end">
          <Space wrap>
            <Input
              placeholder="搜索文件名或标签..."
              prefix={<SearchOutlined />}
              style={{ width: 250 }}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              allowClear
            />
            <Button icon={<ReloadOutlined />} onClick={() => fetchAvatars()} loading={loading}>
              刷新
            </Button>
            <Button 
              type={isSelectMode ? "primary" : "default"} 
              icon={<SelectOutlined />} 
              onClick={toggleSelectMode}
            >
              {isSelectMode ? "退出多选" : "多选模式"}
            </Button>
          </Space>
          
          {isSelectMode && (
            <Space>
              <Text strong>{selectedPaths.size} 个已选择</Text>
              <Button size="small" onClick={handleSelectAll}>
                {selectedPaths.size === filteredItems.length ? "取消全选" : "全选结果"}
              </Button>
              <Divider type="vertical" />
              <Button size="small" type="primary" onClick={() => handleBatchToggle(true)} disabled={selectedPaths.size === 0}>
                批量启用
              </Button>
              <Button size="small" danger onClick={() => handleBatchToggle(false)} disabled={selectedPaths.size === 0}>
                批量禁用
              </Button>
            </Space>
          )}
          
          {!isSelectMode && (
            <Space>
              <Button size="small" onClick={() => handleBatchToggle(true)}>全部启用</Button>
              <Button size="small" onClick={() => handleBatchToggle(false)}>全部禁用</Button>
            </Space>
          )}
        </Space>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px' }}>
          <Spin size="large" tip="正在加载头像列表..." />
        </div>
      ) : filteredItems.length > 0 ? (
        <>
          <Row gutter={[16, 16]}>
            {pagedItems.map(item => (
              <Col xs={24} sm={12} md={8} lg={6} xl={4} key={item.path}>
                <AvatarCard 
                  item={item}
                  onToggleEnabled={handleToggleEnabled}
                  isSelectMode={isSelectMode}
                  isSelected={selectedPaths.has(item.path)}
                  onSelect={handleSelect}
                />
              </Col>
            ))}
          </Row>
          <div style={{ marginTop: '24px', textAlign: 'right' }}>
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={filteredItems.length}
              onChange={(page, size) => {
                setCurrentPage(page);
                setPageSize(size);
              }}
              showSizeChanger
              pageSizeOptions={['12', '24', '48', '96']}
              showTotal={(total) => `共 ${total} 个头像`}
            />
          </div>
        </>
      ) : (
        <Empty description="未找到匹配的头像文件" />
      )}
    </div>
  );
};
