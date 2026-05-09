import React from 'react';
import { Card, Button, Space, Typography, Tooltip, Popconfirm } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, SoundOutlined, DeleteOutlined } from '@ant-design/icons';

const { Text } = Typography;

export interface TtsCacheEntry {
  digest: string;
  filename?: string;
  text?: string;
  language?: string;
  speaker?: string;
  instruct?: string;
  modelId?: string;
  sampleRate?: number;
  bytes?: number;
  createdAt?: string;
  updatedAt?: string;
  unknownMeta?: boolean;
}

interface TtsCacheCardProps {
  entry: TtsCacheEntry;
  isPlaying: boolean;
  durationLabel: string;
  onPlay: () => void;
  onStop: () => void;
  onDelete: () => void | Promise<void>;
  deleteLoading?: boolean;
}

export const TtsCacheCard = React.memo(({
  entry,
  isPlaying,
  durationLabel,
  onPlay,
  onStop,
  onDelete,
  deleteLoading,
}: TtsCacheCardProps) => {
  const fn = entry.filename || `${entry.digest.slice(0, 8)}…`;
  const titleText = entry.unknownMeta
    ? '（元数据待补全）'
    : (entry.text?.trim() || fn);

  const subLines = [
    entry.language || '—',
    entry.speaker || '—',
    entry.sampleRate ? `${entry.sampleRate} Hz` : '—',
    durationLabel,
  ].join(' · ');

  return (
    <Card
      hoverable
      size="small"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        borderColor: isPlaying ? '#1890ff' : undefined,
        backgroundColor: isPlaying ? '#e6f7ff' : undefined,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <Tooltip title={entry.unknownMeta ? entry.filename || entry.digest : entry.text || fn}>
          <div
            style={{
              marginBottom: '12px',
              fontWeight: 'bold',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {titleText.length > 48 ? `${titleText.slice(0, 48)}…` : titleText}
          </div>
        </Tooltip>
        <Text type="secondary" style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }} ellipsis={{ tooltip: fn }}>
          {fn}
        </Text>
        <Text type="secondary" style={{ display: 'block', marginBottom: '12px', fontSize: '12px' }}>
          {subLines}
        </Text>
        {entry.instruct ? (
          <Text type="secondary" style={{ display: 'block', marginBottom: '12px', fontSize: '11px' }} ellipsis={{ tooltip: entry.instruct }}>
            instruct：{entry.instruct}
          </Text>
        ) : null}
        <Space wrap size="small">
          {isPlaying ? (
            <Button type="primary" shape="circle" icon={<PauseCircleOutlined />} onClick={onStop} />
          ) : (
            <Button type="default" shape="circle" icon={<PlayCircleOutlined />} onClick={onPlay} />
          )}
          <Button type="text" shape="circle" icon={<SoundOutlined />} onClick={onPlay} />
          <Popconfirm
            title="删除这条缓存？"
            description="将永久删除 WAV 文件并从索引中移除。"
            okText="删除"
            okButtonProps={{ danger: true }}
            cancelText="取消"
            onConfirm={() => void onDelete()}
          >
            <Button
              type="text"
              danger
              shape="circle"
              icon={<DeleteOutlined />}
              loading={deleteLoading}
              aria-label="删除缓存"
            />
          </Popconfirm>
        </Space>
      </div>
    </Card>
  );
});

TtsCacheCard.displayName = 'TtsCacheCard';
