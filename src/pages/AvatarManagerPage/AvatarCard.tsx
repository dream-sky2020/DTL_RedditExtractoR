import React from 'react';
import { Card, Switch, Tag, Tooltip, Typography, Checkbox } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, TagsOutlined } from '@ant-design/icons';
import { AvatarManifestItem } from '@/store/useAvatarStore';

const { Text } = Typography;

interface AvatarCardProps {
  item: AvatarManifestItem;
  onToggleEnabled: (path: string, enabled: boolean) => void;
  isSelectMode: boolean;
  isSelected: boolean;
  onSelect: (path: string, selected: boolean) => void;
}

const getAvatarUrl = (avatarPath: string) => {
  if (avatarPath.startsWith('http')) return avatarPath;
  if (avatarPath.startsWith('public/')) return `/${avatarPath.replace('public/', '')}`;
  return `/${avatarPath}`;
};

export const AvatarCard: React.FC<AvatarCardProps> = React.memo(({ 
  item, 
  onToggleEnabled, 
  isSelectMode, 
  isSelected, 
  onSelect 
}) => {
  const fileName = item.path.split('/').pop() || '';

  const handleClick = () => {
    if (isSelectMode) {
      onSelect(item.path, !isSelected);
    }
  };

  return (
    <Card
      hoverable
      size="small"
      style={{ 
        height: '100%', 
        border: isSelected ? '2px solid var(--ant-primary-color)' : undefined,
        position: 'relative',
        opacity: item.enabled ? 1 : 0.7
      }}
      onClick={handleClick}
      cover={
        <div style={{ padding: '12px', textAlign: 'center', background: 'var(--panel-bg-darker)', position: 'relative' }}>
          {isSelectMode && (
            <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 10 }}>
              <Checkbox checked={isSelected} />
            </div>
          )}
          <img
            src={getAvatarUrl(item.path)}
            alt={fileName}
            loading="lazy"
            style={{ 
              width: 80, 
              height: 80, 
              borderRadius: '8px', 
              objectFit: 'cover', 
              border: '1px solid var(--brand-border)',
              filter: item.enabled ? 'none' : 'grayscale(80%)'
            }}
          />
        </div>
      }
      actions={!isSelectMode ? [
        <Tooltip title={item.enabled ? "禁用 (不加入随机池)" : "启用 (加入随机池)"}>
          <Switch 
            size="small" 
            checked={item.enabled} 
            onChange={(checked) => onToggleEnabled(item.path, checked)} 
          />
        </Tooltip>,
        <Tooltip title="编辑标签 (暂未实现)">
          <TagsOutlined key="tags" />
        </Tooltip>
      ] : []}
    >
      <Card.Meta
        title={<Text ellipsis={{ tooltip: fileName }} style={{ fontSize: 12 }}>{fileName}</Text>}
        description={
          <div style={{ marginTop: 4 }}>
            {item.enabled ? 
              <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontSize: '10px' }}>已启用</Tag> : 
              <Tag color="default" icon={<CloseCircleOutlined />} style={{ fontSize: '10px' }}>已禁用</Tag>
            }
          </div>
        }
      />
    </Card>
  );
});
