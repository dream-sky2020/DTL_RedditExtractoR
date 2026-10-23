import { Button, Empty, Select, Space } from 'antd';
import { FolderOpenOutlined } from '@ant-design/icons';
import type { VideoItem } from '../types';

interface MediaFileSelectProps {
  items: VideoItem[];
  value: string;
  placeholder: string;
  onChange: (path: string) => void;
  onPick: () => Promise<void>;
  pickLabel: string;
  allowClear?: boolean;
  emptyDescription?: string;
}

const formatBytes = (size: number) => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = size;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
};

/** Page-private picker; media playback and metadata remain outside this control. */
export function MediaFileSelect({
  items, value, placeholder, onChange, onPick, pickLabel, allowClear, emptyDescription,
}: MediaFileSelectProps) {
  return (
    <Space.Compact style={{ width: '100%' }}>
      <Select
        allowClear={allowClear}
        showSearch
        value={value || undefined}
        placeholder={placeholder}
        style={{ flex: 1 }}
        optionFilterProp="label"
        onChange={(path) => onChange(path || '')}
        options={items.map((item) => ({
          value: item.path,
          label: `${item.name}${item.size ? ` · ${formatBytes(item.size)}` : ''}`,
        }))}
        {...(emptyDescription ? {
          notFoundContent: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyDescription} />,
        } : {})}
      />
      <Button icon={<FolderOpenOutlined />} onClick={() => void onPick()}>{pickLabel}</Button>
    </Space.Compact>
  );
}
