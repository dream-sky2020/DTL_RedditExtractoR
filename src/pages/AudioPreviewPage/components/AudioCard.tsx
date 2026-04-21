import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Space, Typography, Tooltip, Dropdown, Slider } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, SoundOutlined, CopyOutlined } from '@ant-design/icons';
import { AudioItem } from '@/types';
import { normalizePreviewVolume } from '@/utils/audio';

const { Text } = Typography;

interface AudioCardProps {
  item: AudioItem;
  isPlaying: boolean;
  duration: number | null | undefined;
  isRenaming: boolean;
  onPlay: (item: AudioItem) => void;
  onStop: () => void;
  onRename: (item: AudioItem) => void;
  onCommitRename: (path: string, newAlias: string) => void;
  onCancelRename: () => void;
  onEditTags: (path: string) => void;
  onCopyTag: (item: AudioItem) => void;
  onPreviewVolumeChange: (path: string, nextVolume: number) => void;
  formatDuration: (seconds: number | null | undefined) => string;
}

export const AudioCard = React.memo(({ 
  item, 
  isPlaying, 
  duration, 
  isRenaming,
  onPlay, 
  onStop, 
  onRename, 
  onCommitRename, 
  onCancelRename, 
  onEditTags, 
  onCopyTag,
  onPreviewVolumeChange,
  formatDuration 
}: AudioCardProps) => {
  const [localRenameDraft, setLocalRenameDraft] = useState(item.alias || item.name);
  const [localPreviewVolume, setLocalPreviewVolume] = useState(item.previewVolume);

  // 当进入重命名模式时同步状态
  useEffect(() => {
    if (isRenaming) {
      setLocalRenameDraft(item.alias || item.name);
    }
  }, [isRenaming, item.alias, item.name]);

  useEffect(() => {
    setLocalPreviewVolume(item.previewVolume);
  }, [item.previewVolume]);

  return (
    <Dropdown
      trigger={['contextMenu']}
      menu={{
        items: [
          { key: 'rename', label: '重命名' },
          { key: 'tags', label: '标签' },
        ],
        onClick: ({ key }) => {
          if (key === 'rename') onRename(item);
          if (key === 'tags') onEditTags(item.path);
        },
      }}
    >
      <div>
        <Card
          hoverable
          size="small"
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            borderColor: isPlaying ? '#1890ff' : undefined,
            backgroundColor: isPlaying ? '#e6f7ff' : undefined
          }}
        >
          <div style={{ textAlign: 'center' }}>
            {isRenaming ? (
              <Input
                autoFocus
                size="small"
                placeholder="输入别名后回车"
                value={localRenameDraft}
                onChange={e => setLocalRenameDraft(e.target.value)}
                onPressEnter={() => onCommitRename(item.path, localRenameDraft)}
                onBlur={() => onCommitRename(item.path, localRenameDraft)}
                onKeyDown={e => {
                  if (e.key === 'Escape') onCancelRename();
                }}
                style={{ marginBottom: '12px' }}
              />
            ) : (
              <Tooltip title={item.name}>
                <div style={{
                  marginBottom: '12px',
                  fontWeight: 'bold',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {item.alias || item.name}
                </div>
              </Tooltip>
            )}
            <Text type="secondary" style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }} ellipsis={{ tooltip: item.name }}>
              {item.name}
            </Text>
            <Text type="secondary" style={{ display: 'block', marginBottom: '8px' }}>
              时长：{formatDuration(duration)}
            </Text>
            <div style={{ marginBottom: '10px', padding: '0 4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
                <span>预览音量</span>
                <span>{Math.round(localPreviewVolume * 100)}%</span>
              </div>
              <Slider
                min={0}
                max={100}
                value={Math.round(localPreviewVolume * 100)}
                onChange={(next) => {
                  const percent = Array.isArray(next) ? next[0] : next;
                  setLocalPreviewVolume(normalizePreviewVolume(percent / 100, item.previewVolume));
                }}
                onChangeComplete={(next) => {
                  const percent = Array.isArray(next) ? next[0] : next;
                  onPreviewVolumeChange(item.path, normalizePreviewVolume(percent / 100, item.previewVolume));
                }}
                tooltip={{ formatter: (value) => `${value ?? 0}%` }}
              />
            </div>
            <Space>
              {isPlaying ? (
                <Button
                  type="primary"
                  shape="circle"
                  icon={<PauseCircleOutlined />}
                  onClick={onStop}
                />
              ) : (
                <Button
                  type="default"
                  shape="circle"
                  icon={<PlayCircleOutlined />}
                  onClick={() => onPlay(item)}
                />
              )}
              <Button
                type="text"
                shape="circle"
                icon={<SoundOutlined />}
                onClick={() => onPlay(item)}
              />
              <Tooltip title="复制 [audio] 标签">
                <Button
                  type="text"
                  shape="circle"
                  icon={<CopyOutlined />}
                  onClick={() => onCopyTag(item)}
                />
              </Tooltip>
            </Space>
          </div>
        </Card>
      </div>
    </Dropdown>
  );
});

AudioCard.displayName = 'AudioCard';
