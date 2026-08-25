import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  ColorPicker,
  Empty,
  Input,
  Row,
  Slider,
  Space,
  Tag,
  Typography,
} from 'antd';
import { FileImageOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { toast } from '@components/Toast';
import { loadAdChromaTestSettings, saveAdChromaTestSettings } from '@/utils/adChromaSettings';

const { Paragraph, Text, Title } = Typography;
const API_BASE = 'http://localhost:5000';

const getImageUrl = (path: string) => (
  path ? `${API_BASE}/proxy_local_file?path=${encodeURIComponent(path)}` : ''
);

const hexToRgb = (value: string) => {
  const normalized = value.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return { r: 0, g: 255, b: 0 };
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
};

const drawCover = (
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
) => {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
};

export const ChromaKeyTestPage: React.FC = () => {
  const [initialSettings] = useState(loadAdChromaTestSettings);
  const [backgroundImage, setBackgroundImage] = useState(initialSettings.backgroundImage);
  const [adImage, setAdImage] = useState(initialSettings.adImage);
  const [keyColor, setKeyColor] = useState(initialSettings.keyColor);
  const [similarity, setSimilarity] = useState(initialSettings.similarity);
  const [blend, setBlend] = useState(initialSettings.blend);
  const [adWidth, setAdWidth] = useState(initialSettings.adWidth);
  const [loadedVersion, setLoadedVersion] = useState(0);
  const backgroundRef = useRef<HTMLImageElement | null>(null);
  const adRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    saveAdChromaTestSettings({ backgroundImage, adImage, keyColor, similarity, blend, adWidth });
  }, [backgroundImage, adImage, keyColor, similarity, blend, adWidth]);

  const pickImage = async (kind: 'background' | 'ad') => {
    try {
      const response = await fetch(`${API_BASE}/pick_file`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || `图片选择接口返回 HTTP ${response.status}`);
      }
      if (!payload.path) return;
      if (kind === 'background') setBackgroundImage(payload.path);
      else setAdImage(payload.path);
    } catch (error: any) {
      toast.error(error.message || '选择图片失败，请确认 scripts/server.py 已启动');
    }
  };

  useEffect(() => {
    const background = backgroundRef.current;
    const ad = adRef.current;
    const canvas = canvasRef.current;
    if (!background || !ad || !canvas || !background.complete || !ad.complete) return;
    if (!background.naturalWidth || !ad.naturalWidth) return;

    const maxPreviewDimension = 1280;
    const scale = Math.min(1, maxPreviewDimension / Math.max(background.naturalWidth, background.naturalHeight));
    canvas.width = Math.max(1, Math.round(background.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(background.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawCover(context, background, canvas.width, canvas.height);

    const targetWidth = Math.max(2, Math.round(canvas.width * adWidth));
    const targetHeight = Math.max(2, Math.round(targetWidth * ad.naturalHeight / ad.naturalWidth));
    const scratch = document.createElement('canvas');
    scratch.width = targetWidth;
    scratch.height = targetHeight;
    const scratchContext = scratch.getContext('2d', { willReadFrequently: true });
    if (!scratchContext) return;
    scratchContext.drawImage(ad, 0, 0, targetWidth, targetHeight);

    const frame = scratchContext.getImageData(0, 0, targetWidth, targetHeight);
    const pixels = frame.data;
    const key = hexToRgb(keyColor);
    const maxDistance = Math.sqrt(3 * 255 * 255);
    for (let index = 0; index < pixels.length; index += 4) {
      const distance = Math.sqrt(
        (pixels[index] - key.r) ** 2
        + (pixels[index + 1] - key.g) ** 2
        + (pixels[index + 2] - key.b) ** 2
      ) / maxDistance;
      if (distance <= similarity) {
        pixels[index + 3] = 0;
      } else if (blend > 0 && distance < similarity + blend) {
        pixels[index + 3] = Math.round(255 * (distance - similarity) / blend);
      }
    }
    scratchContext.putImageData(frame, 0, 0);
    context.drawImage(
      scratch,
      Math.round((canvas.width - targetWidth) / 2),
      Math.round((canvas.height - targetHeight) / 2),
    );
  }, [adImage, backgroundImage, keyColor, similarity, blend, adWidth, loadedVersion]);

  const bothImagesReady = Boolean(backgroundImage && adImage);

  return (
    <div style={{ padding: 24 }}>
      <Title level={3} style={{ marginTop: 0 }}>抠绿参数测试</Title>
      <Paragraph type="secondary">
        分别选择一张母片截图和一张绿幕广告截图，用静态画面检查绿幕颜色、颜色容差和边缘融合。这里不影响广告任务，确认参数后再填入“植入广告”页面。
      </Paragraph>
      <Tag color="success" style={{ marginBottom: 16 }}>图片路径和全部测试参数会自动保存，切换页面或刷新后仍会恢复</Tag>

      <Alert
        type="info"
        showIcon
        message="测试页与最终渲染现在使用相同的 RGB 抠色语义"
        description="浏览器 Canvas 和最终 FFmpeg colorkey 都按 RGB 颜色处理，并保持先缩放、再抠色的顺序；视频编码产生的细微边缘差异仍以最终成片为准。"
        style={{ marginBottom: 20 }}
      />

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={8}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Card title="1. 选择两张截图">
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Button block icon={<FolderOpenOutlined />} onClick={() => void pickImage('background')}>
                  选择视频／母片截图
                </Button>
                {backgroundImage ? (
                  <Text ellipsis={{ tooltip: backgroundImage }}><FileImageOutlined /> {backgroundImage}</Text>
                ) : <Text type="secondary">尚未选择母片截图</Text>}
                <Button block icon={<FolderOpenOutlined />} onClick={() => void pickImage('ad')}>
                  选择绿幕广告截图
                </Button>
                {adImage ? (
                  <Text ellipsis={{ tooltip: adImage }}><FileImageOutlined /> {adImage}</Text>
                ) : <Text type="secondary">尚未选择广告截图</Text>}
              </Space>
            </Card>

            <Card title="2. 调整参数">
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                  <Text>绿幕颜色</Text>
                  <Space.Compact style={{ width: '100%', marginTop: 8 }}>
                    <ColorPicker value={keyColor} onChange={(color) => setKeyColor(color.toHexString())} showText />
                    <Input value={keyColor} onChange={(event) => setKeyColor(event.target.value)} />
                  </Space.Compact>
                </div>
                <div>
                  <Text>颜色容差：{similarity.toFixed(2)}</Text>
                  <Slider min={0} max={1} step={0.01} value={similarity} onChange={setSimilarity} />
                </div>
                <div>
                  <Text>边缘融合：{blend.toFixed(2)}</Text>
                  <Slider min={0} max={0.5} step={0.01} value={blend} onChange={setBlend} />
                </div>
                <div>
                  <Text>广告截图宽度：{Math.round(adWidth * 100)}%</Text>
                  <Slider min={0.1} max={2} step={0.01} value={adWidth} onChange={setAdWidth} />
                </div>
                <Space wrap>
                  <Tag color="green">颜色 {keyColor}</Tag>
                  <Tag color="blue">容差 {similarity.toFixed(2)}</Tag>
                  <Tag color="purple">融合 {blend.toFixed(2)}</Tag>
                </Space>
              </Space>
            </Card>
          </Space>
        </Col>

        <Col xs={24} xl={16}>
          <Card title="合成效果预览">
            {bothImagesReady ? (
              <canvas
                ref={canvasRef}
                style={{
                  display: 'block',
                  width: '100%',
                  maxHeight: '75vh',
                  objectFit: 'contain',
                  background: '#111827',
                  borderRadius: 10,
                  boxShadow: '0 14px 40px rgba(0,0,0,.24)',
                }}
              />
            ) : (
              <Empty description="请选择母片截图和绿幕广告截图" />
            )}
          </Card>
        </Col>
      </Row>

      <img
        ref={backgroundRef}
        src={getImageUrl(backgroundImage)}
        crossOrigin="anonymous"
        alt=""
        style={{ display: 'none' }}
        onLoad={() => setLoadedVersion((value) => value + 1)}
      />
      <img
        ref={adRef}
        src={getImageUrl(adImage)}
        crossOrigin="anonymous"
        alt=""
        style={{ display: 'none' }}
        onLoad={() => setLoadedVersion((value) => value + 1)}
      />
    </div>
  );
};

export default ChromaKeyTestPage;
