import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Form,
  InputNumber,
  List,
  Row,
  Space,
  Switch,
  Tag,
  Typography,
} from 'antd';
import { toast } from '@components/Toast';
import { ReloadOutlined, CustomerServiceOutlined } from '@ant-design/icons';
import { BgmConfig } from '@/types';
import { useVideoStore } from '@/store';

const { Text, Title } = Typography;

const RENDER_API_BASE = 'http://localhost:5000';
const DEFAULT_BGM_CONFIG: BgmConfig = {
  enabled: false,
  src: '',
  volume: 0.75,
  loop: true,
  fadeOutDuration: 3,
};

interface BgmItem {
  name: string;
  path: string;
  url: string;
}

const getPreviewUrl = (src?: string): string => {
  const normalized = (src || '').trim().replace(/^\/+/, '');
  return normalized ? `/${normalized}` : '';
};

export const BgmSettingsPage: React.FC = () => {
  const { videoConfig, setVideoConfig } = useVideoStore();
  const bgm = useMemo(
    () => ({ ...DEFAULT_BGM_CONFIG, ...(videoConfig.bgm || {}) }),
    [videoConfig.bgm]
  );
  const [items, setItems] = useState<BgmItem[]>([]);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const updateBgm = (updates: Partial<BgmConfig>) => {
    setVideoConfig({
      ...videoConfig,
      bgm: {
        ...bgm,
        ...updates,
      },
    });
  };

  const fetchBgmFiles = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${RENDER_API_BASE}/list_bgm`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'BGM 列表读取失败');
      }
      setItems(Array.isArray(payload.files) ? payload.files : []);
    } catch (err: any) {
      toast.warning(err.message || '无法连接本地服务，请确认 Python 服务已启动');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchBgmFiles();
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = Math.max(0, Math.min(1, bgm.volume ?? 0.75));
  }, [bgm.volume]);

  const selectedUrl = getPreviewUrl(bgm.src);

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2}>全局背景音乐 (BGM)</Title>
          <Text type="secondary">
            背景音乐仅在最终导出阶段由后端 FFmpeg 合成，前端预览和场景编辑时不会加载音频以节省内存。
          </Text>
        </div>

        <Alert
          type="info"
          showIcon
          message="本地 BGM 目录"
          description="请把素材放入 public/audio/bgm/，然后点击刷新。配置保存的是 audio/bgm/xxx.mp3 这样的相对路径。"
        />

        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <Card
              title="选择背景音乐"
              extra={(
                <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void fetchBgmFiles()}>
                  刷新
                </Button>
              )}
            >
              <List
                loading={loading}
                dataSource={items}
                locale={{ emptyText: <Empty description="未发现 BGM 文件" /> }}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Button
                        key="select"
                        type={bgm.src === item.path ? 'primary' : 'default'}
                        onClick={() => updateBgm({ enabled: true, src: item.path })}
                      >
                        {bgm.src === item.path ? '已选择' : '选择'}
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<CustomerServiceOutlined style={{ fontSize: 22 }} />}
                      title={item.name}
                      description={<Text code>{item.path}</Text>}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="BGM 预览与设置">
              {selectedUrl ? (
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <div style={{ background: 'var(--card-bg)', padding: 16, borderRadius: 8 }}>
                    <audio
                      ref={audioRef}
                      src={selectedUrl}
                      controls
                      loop={bgm.loop}
                      style={{ width: '100%' }}
                    />
                  </div>
                  
                  <Form layout="vertical">
                    <Form.Item label="启用背景音乐 (仅限最终导出)">
                      <Switch
                        checked={Boolean(bgm.enabled)}
                        onChange={(enabled) => updateBgm({ enabled })}
                      />
                    </Form.Item>

                    <Form.Item label="背景音乐音量">
                      <InputNumber<number>
                        min={0}
                        max={100}
                        step={5}
                        style={{ width: '100%' }}
                        value={Math.round((bgm.volume ?? 0.75) * 100)}
                        formatter={(value) => `${value}%`}
                        parser={(value) => {
                          const parsed = Number((value || '').replace(/[^\d.]/g, ''));
                          return Number.isFinite(parsed) ? parsed : 0;
                        }}
                        onChange={(value) => updateBgm({ volume: (value ?? 75) / 100 })}
                      />
                    </Form.Item>

                    <Form.Item label="循环播放">
                      <Switch
                        checked={Boolean(bgm.loop)}
                        onChange={(loop) => updateBgm({ loop })}
                      />
                    </Form.Item>

                    <Form.Item label="淡出时长 (秒)">
                      <InputNumber
                        min={0}
                        max={20}
                        step={0.5}
                        style={{ width: '100%' }}
                        value={bgm.fadeOutDuration}
                        onChange={(val) => updateBgm({ fadeOutDuration: val ?? 0 })}
                      />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        在视频结束前多少秒开始逐渐减小音量。设置为 0 则不淡出。
                      </Text>
                    </Form.Item>
                  </Form>

                  <Space wrap>
                    <Tag color={bgm.enabled ? 'success' : 'default'}>
                      {bgm.enabled ? '最终导出启用' : '最终导出未启用'}
                    </Tag>
                    <Tag color="blue">
                      当前文件: {bgm.src}
                    </Tag>
                  </Space>
                </Space>
              ) : (
                <Empty description="请选择一个 BGM 文件进行设置" />
              )}
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
};

export default BgmSettingsPage;
