import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Row,
  Select,
  Space,
  Spin,
  Tooltip,
  Typography,
} from 'antd';
import { SoundOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { toast } from '@components/Toast';
import { TtsCacheCard, type TtsCacheEntry } from './components/TtsCacheCard';

const { Title: AntTitle, Paragraph, Text } = Typography;
const { TextArea } = Input;

const API_BASE = 'http://localhost:5000';

const LANGUAGE_OPTIONS = [
  { value: 'Chinese', label: '中文 Chinese' },
  { value: 'English', label: 'English' },
  { value: 'Japanese', label: 'Japanese' },
  { value: 'Korean', label: 'Korean' },
];

/** CustomVoice 预设音色（与 Qwen3-TTS 文档一致） */
const SPEAKER_OPTIONS = [
  { value: 'Vivian', label: 'Vivian（中文）' },
  { value: 'Serena', label: 'Serena（中文）' },
  { value: 'Uncle_Fu', label: 'Uncle_Fu（中文）' },
  { value: 'Dylan', label: 'Dylan（中文）' },
  { value: 'Eric', label: 'Eric（中文）' },
  { value: 'Ryan', label: 'Ryan（English）' },
  { value: 'Aiden', label: 'Aiden（English）' },
  { value: 'Ono_Anna', label: 'Ono_Anna（Japanese）' },
  { value: 'Sohee', label: 'Sohee（Korean）' },
];

function playbackFilenameFromUrl(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/\/cache\/([^/?#]+)/);
  return m?.[1] ?? null;
}

/** 倍速档位：低速 + 常用档 + 最高 10×（音质仍依赖浏览器 preservesPitch） */
const PLAYBACK_RATE_VALUES = [
  0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9, 10,
] as const;

const PLAYBACK_RATE_OPTIONS: { value: number; label: string }[] = PLAYBACK_RATE_VALUES.map((value) => ({
  value,
  label: value === 1 ? '1×（正常）' : `${value}×`,
}));

const PLAYBACK_RATE_MAX = 10;
const PLAYBACK_RATE_MIN = 0.25;

function clampPlaybackRate(rate: number): number {
  return Math.min(PLAYBACK_RATE_MAX, Math.max(PLAYBACK_RATE_MIN, rate));
}

/** 尽量保持音高的加速（依赖浏览器；Chrome / Firefox / Edge 支持较好） */
function applyMediaPlaybackPreservePitch(el: HTMLAudioElement, rate: number): void {
  const r = clampPlaybackRate(rate);
  el.playbackRate = r;
  try {
    el.preservesPitch = true;
  } catch {
    /* ignore */
  }
  const legacy = el as HTMLAudioElement & { webkitPreservesPitch?: boolean };
  if (typeof legacy.webkitPreservesPitch === 'boolean') {
    legacy.webkitPreservesPitch = true;
  }
}

export const QwenTtsTryPage: React.FC = () => {
  const [text, setText] = useState('你好，这是 Qwen3-TTS 试听示例。');
  const [language, setLanguage] = useState('Chinese');
  const [speaker, setSpeaker] = useState('Vivian');
  const [instruct, setInstruct] = useState('');
  const [loading, setLoading] = useState(false);
  const [depsOk, setDepsOk] = useState<boolean | null>(null);
  const [depMessage, setDepMessage] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackRateRef = useRef(playbackRate);
  playbackRateRef.current = playbackRate;
  const [audioPlaying, setAudioPlaying] = useState(false);

  const [indexEntries, setIndexEntries] = useState<TtsCacheEntry[]>([]);
  const [indexLoading, setIndexLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [durationMap, setDurationMap] = useState<Record<string, number | null>>({});
  const [deletingDigest, setDeletingDigest] = useState<string | null>(null);

  const refreshIndex = useCallback(async () => {
    setIndexLoading(true);
    try {
      const res = await fetch(`${API_BASE}/qwen_tts/index`);
      const data = await res.json();
      if (data.success && Array.isArray(data.entries)) {
        setIndexEntries(data.entries);
      } else {
        setIndexEntries([]);
      }
    } catch {
      setIndexEntries([]);
    } finally {
      setIndexLoading(false);
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/qwen_tts/status`);
      const data = await res.json();
      if (data.success) {
        setDepsOk(Boolean(data.dependencies_ok));
        setDepMessage(data.dependency_error || null);
      } else {
        setDepsOk(false);
        setDepMessage(data.message || '无法连接后端');
      }
    } catch {
      setDepsOk(false);
      setDepMessage('无法连接 http://localhost:5000，请先启动 scripts/server.py');
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
    void refreshIndex();
  }, [refreshStatus, refreshIndex]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const sync = () => setAudioPlaying(!el.paused);
    el.addEventListener('play', sync);
    el.addEventListener('pause', sync);
    el.addEventListener('ended', sync);
    return () => {
      el.removeEventListener('play', sync);
      el.removeEventListener('pause', sync);
      el.removeEventListener('ended', sync);
    };
  }, []);

  useEffect(() => {
    if (!audioUrl) return;
    const el = audioRef.current;
    if (!el) return;
    el.pause();
    el.src = audioUrl;
    el.load();
    applyMediaPlaybackPreservePitch(el, playbackRateRef.current);
    const onMeta = () => applyMediaPlaybackPreservePitch(el, playbackRateRef.current);
    el.addEventListener('loadedmetadata', onMeta);
    void el.play().catch(() => {
      toast.warning('无法自动播放', { description: '请点击播放器上的播放按钮。' });
    });
    return () => {
      el.removeEventListener('loadedmetadata', onMeta);
    };
  }, [audioUrl]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !audioUrl) return;
    applyMediaPlaybackPreservePitch(el, playbackRate);
  }, [playbackRate, audioUrl]);

  const getAudioDuration = (url: string): Promise<number | null> =>
    new Promise((resolve) => {
      const audio = new Audio();
      audio.preload = 'metadata';
      audio.src = url;
      const finalize = (value: number | null) => {
        audio.removeAttribute('src');
        audio.load();
        resolve(value);
      };
      audio.onloadedmetadata = () => finalize(Number.isFinite(audio.duration) ? audio.duration : null);
      audio.onerror = () => finalize(null);
    });

  useEffect(() => {
    const withFile = indexEntries.filter((e) => e.filename && e.digest);
    const pending = withFile.filter((e) => durationMap[e.digest] === undefined);
    if (pending.length === 0) return;

    let cancelled = false;
    const load = async () => {
      const batchSize = 5;
      for (let i = 0; i < pending.length; i += batchSize) {
        if (cancelled) break;
        const batch = pending.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map(async (e) => ({
            digest: e.digest,
            duration: await getAudioDuration(`${API_BASE}/cache/${e.filename}`),
          }))
        );
        if (!cancelled) {
          setDurationMap((prev) => {
            const next = { ...prev };
            results.forEach((r) => {
              next[r.digest] = r.duration;
            });
            return next;
          });
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [indexEntries]);

  const formatDuration = useCallback((seconds: number | null | undefined) => {
    if (seconds === undefined) return '读取中…';
    if (seconds === null || Number.isNaN(seconds) || !Number.isFinite(seconds)) return '--:--';
    const total = Math.max(0, Math.round(seconds));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, []);

  const filteredEntries = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return indexEntries;
    return indexEntries.filter((e) => {
      const blob = [
        e.text,
        e.filename,
        e.digest,
        e.language,
        e.speaker,
        e.instruct,
        e.modelId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [indexEntries, searchText]);

  const playbackFilename = playbackFilenameFromUrl(audioUrl);

  const handleSpeak = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.warning('请输入要朗读的文本');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/qwen_tts/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: trimmed,
          language,
          speaker,
          instruct: instruct.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error('合成失败', { description: String(data.message || res.status) });
        return;
      }
      const url = `${API_BASE}${data.url as string}`;
      setAudioUrl(url);
      const cached = Boolean(data.cached);
      toast.success(cached ? '缓存命中（秒开）' : '合成完成', {
        description: `${cached ? '本地索引匹配，未加载模型。' : ''}采样率 ${data.sample_rate ?? '—'} Hz · digest ${String(data.digest || '').slice(0, 8)}…`,
      });
      void refreshIndex();
    } catch (e) {
      toast.error('请求失败', { description: String(e) });
    } finally {
      setLoading(false);
    }
  };

  const playEntry = (filename: string | undefined) => {
    if (!filename) return;
    setAudioUrl(`${API_BASE}/cache/${filename}`);
  };

  const stopPlayback = () => {
    audioRef.current?.pause();
  };

  const cardIsPlaying = (entry: TtsCacheEntry) =>
    Boolean(entry.filename && playbackFilename === entry.filename && audioPlaying);

  const deleteCacheEntry = async (entry: TtsCacheEntry) => {
    const d = entry.digest?.trim();
    if (!d) return;
    setDeletingDigest(d);
    try {
      const res = await fetch(`${API_BASE}/qwen_tts/cache/${encodeURIComponent(d)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!data.success) {
        toast.error('删除失败', { description: String(data.message || res.status) });
        return;
      }
      if (entry.filename && playbackFilename === entry.filename) {
        audioRef.current?.pause();
        setAudioUrl(null);
      }
      setDurationMap((prev) => {
        const next = { ...prev };
        delete next[d];
        return next;
      });
      toast.success('已删除', { description: String(data.message || '') });
      void refreshIndex();
    } catch (e) {
      toast.error('删除请求失败', { description: String(e) });
    } finally {
      setDeletingDigest(null);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <AntTitle level={2}>Qwen3-TTS 试听</AntTitle>
      <Paragraph type="secondary">
        文本发送至本地 Flask（<Text code>scripts/server.py</Text>）。缓存键由{' '}
        <Text strong>模型 ID + 语言 + 音色 + instruct + 全文</Text> 推导（见{' '}
        <Text code>qwen_tts_wrapper.cache_digest</Text>
        ）；命中 <Text code>public/cache/qwen_tts_*.wav</Text> 时直接回放并维护{' '}
        <Text code>qwen-tts-manifest.json</Text>
        ，无需加载 Qwen 模型。
      </Paragraph>

      {depsOk === false && (
        <Alert
          style={{ marginBottom: 16 }}
          type="warning"
          showIcon
          message="依赖未就绪时仍可播放已缓存音频"
          description={
            <span>
              {depMessage || '请安装：'}{' '}
              {!depMessage?.includes('连接') && (
                <Text code>pip install -r scripts/requirements-qwen-tts.txt</Text>
              )}
              <br />
              全新文本的合成仍需要上述依赖；仅回放缓存 WAV 时不必加载 PyTorch。
            </span>
          }
        />
      )}
      {depsOk === true && (
        <Alert style={{ marginBottom: 16 }} type="success" showIcon message="Python 依赖已检测到（模型仍需首次加载）" />
      )}

      <Card bordered={false} className="panel-card" style={{ marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <TextArea
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="输入要合成的文本…"
            maxLength={4000}
            showCount
          />
          <Space wrap>
            <span>
              <Text type="secondary">语言 </Text>
              <Select style={{ width: 200 }} options={LANGUAGE_OPTIONS} value={language} onChange={setLanguage} />
            </span>
            <span>
              <Text type="secondary">音色 </Text>
              <Select style={{ width: 220 }} options={SPEAKER_OPTIONS} value={speaker} onChange={setSpeaker} />
            </span>
          </Space>
          <div>
            <Text type="secondary">指令 instruct（可选，部分模型支持情感描述）</Text>
            <Input
              style={{ marginTop: 8 }}
              value={instruct}
              onChange={(e) => setInstruct(e.target.value)}
              placeholder="例如：非常开心、语气轻快（可与文档示例对齐）"
            />
          </div>
          <Space wrap>
            <Button type="primary" icon={<SoundOutlined />} loading={loading} onClick={() => void handleSpeak()}>
              朗读（合成并播放）
            </Button>
            <Button onClick={() => void refreshStatus()}>刷新依赖状态</Button>
          </Space>
          <div>
            <Space wrap align="center">
              <Tooltip
                title={
                  <>
                    使用浏览器自带的「变速不变调」（<Text code>playbackRate</Text> +{' '}
                    <Text code>preservesPitch</Text>
                    ）。Chrome / Edge / Firefox 通常效果较好；Safari 可能略有差异。可选最高约{' '}
                    <Text code>{PLAYBACK_RATE_MAX}×</Text>
                    ，极高倍速下音质可能下降；若无法生效多半是浏览器对 <Text code>playbackRate</Text>{' '}
                    的上限较低。
                  </>
                }
              >
                <Text type="secondary">播放倍速</Text>
              </Tooltip>
              <Select<number>
                style={{ width: 140 }}
                value={playbackRate}
                options={PLAYBACK_RATE_OPTIONS}
                onChange={setPlaybackRate}
              />
            </Space>
          </div>
          <audio ref={audioRef} controls style={{ width: '100%' }} />
        </Space>
      </Card>

      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <AntTitle level={2}>TTS 缓存索引</AntTitle>
          <Text type="secondary">
            {indexLoading ? '正在加载索引…' : `共 ${indexEntries.length} 条缓存，当前显示 ${filteredEntries.length} 条。`}
          </Text>
        </div>
        <Space>
          <Input
            placeholder="搜索文本 / 文件名 / 音色…"
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
          <Button icon={<ReloadOutlined />} loading={indexLoading} onClick={() => void refreshIndex()}>
            刷新列表
          </Button>
        </Space>
      </div>

      {indexLoading ? (
        <div style={{ textAlign: 'center', padding: '100px' }}>
          <Spin size="large" tip="正在加载 TTS 缓存索引…" />
        </div>
      ) : filteredEntries.length > 0 ? (
        <Row gutter={[16, 16]}>
          {filteredEntries.map((entry) => (
            <Col xs={24} sm={12} md={8} lg={6} xl={4} key={entry.digest}>
              <TtsCacheCard
                entry={entry}
                isPlaying={cardIsPlaying(entry)}
                durationLabel={formatDuration(durationMap[entry.digest])}
                onPlay={() => playEntry(entry.filename)}
                onStop={stopPlayback}
                onDelete={() => void deleteCacheEntry(entry)}
                deleteLoading={deletingDigest === entry.digest}
              />
            </Col>
          ))}
        </Row>
      ) : (
        <Empty description={indexEntries.length === 0 ? '暂无 TTS 缓存' : '未找到匹配的缓存条目'} />
      )}
    </div>
  );
};
