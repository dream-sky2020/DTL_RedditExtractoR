import type { Dispatch, SetStateAction } from 'react';
import { Alert, Button, Card, Col, ColorPicker, Empty, Form, Input, InputNumber, Row, Select, Slider, Space, Switch, Tag, Typography } from 'antd';
import type { AdSubtitleCue, AdSubtitleSettings } from '@/utils/adSubtitleSettings';

const { Text } = Typography;

interface SubtitleEditorProps {
  subtitleSettings: AdSubtitleSettings;
  setSubtitleSettings: Dispatch<SetStateAction<AdSubtitleSettings>>;
  guideAudioUrl: string;
  guideDuration: number;
  subtitlePreviewText: string;
  importSrt: () => Promise<void>;
  exportSrt: () => void;
  addSubtitleCue: () => void;
  updateSubtitleCue: (id: string, patch: Partial<AdSubtitleCue>) => void;
  getGuideCurrentTime: () => number | undefined;
  seekGuideAudio: (time: number) => void;
}

export function SubtitleEditor({
  subtitleSettings, setSubtitleSettings, guideAudioUrl, guideDuration, subtitlePreviewText,
  importSrt, exportSrt, addSubtitleCue, updateSubtitleCue, getGuideCurrentTime, seekGuideAudio,
}: SubtitleEditorProps) {
  return (
    <>
      <Alert
        type="info"
        showIcon
        message="字幕时间以引导音频的原始时间为准"
        description="调整引导音频速度后，预览和最终成片会自动换算时间并保持同步。字幕草稿与样式会自动保存，刷新或切换页面后仍会保留。"
      />
      <Space wrap>
        <Text>启用引导字幕</Text>
        <Switch
          checked={subtitleSettings.enabled}
          onChange={(enabled) => setSubtitleSettings((current) => ({ ...current, enabled }))}
        />
        <Button onClick={() => void importSrt()}>导入 .srt</Button>
        <Button onClick={addSubtitleCue}>手动添加字幕段</Button>
        <Button onClick={exportSrt}>导出保存 .srt</Button>
        <Tag color="blue">已自动保存 {subtitleSettings.cues.length} 条</Tag>
      </Space>

      <Row gutter={20}>
        <Col xs={24} xl={14}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {!subtitleSettings.cues.length && (
              <Empty description="可导入 SRT，或手动添加第一条字幕" />
            )}
            {subtitleSettings.cues.map((cue, index) => (
              <Card
                key={cue.id}
                size="small"
                title={`字幕 ${index + 1}`}
                extra={(
                  <Space>
                    <Button
                      size="small"
                      disabled={!guideAudioUrl}
                      onClick={() => {
                        seekGuideAudio(cue.start);
                      }}
                    >
                      跳转试听
                    </Button>
                    <Button
                      size="small"
                      danger
                      onClick={() => setSubtitleSettings((current) => ({
                        ...current,
                        cues: current.cues.filter((item) => item.id !== cue.id),
                      }))}
                    >
                      删除
                    </Button>
                  </Space>
                )}
              >
                <Row gutter={12}>
                  <Col xs={24} md={12}>
                    <Text type="secondary">开始（秒）</Text>
                    <Space.Compact style={{ width: '100%', marginTop: 6 }}>
                      <InputNumber
                        min={0}
                        max={Math.max(0, cue.end - 0.01)}
                        step={0.1}
                        precision={2}
                        value={cue.start}
                        onChange={(value) => updateSubtitleCue(cue.id, { start: Math.max(0, Math.min(value ?? 0, cue.end - 0.01)) })}
                        style={{ flex: 1 }}
                      />
                      <Button onClick={() => updateSubtitleCue(cue.id, {
                        start: Math.max(0, Math.min(getGuideCurrentTime() ?? 0, cue.end - 0.01)),
                      })}>
                        取当前时间
                      </Button>
                    </Space.Compact>
                  </Col>
                  <Col xs={24} md={12}>
                    <Text type="secondary">结束（秒）</Text>
                    <Space.Compact style={{ width: '100%', marginTop: 6 }}>
                      <InputNumber
                        min={cue.start + 0.01}
                        max={guideDuration || undefined}
                        step={0.1}
                        precision={2}
                        value={cue.end}
                        onChange={(value) => updateSubtitleCue(cue.id, { end: Math.max(cue.start + 0.01, value ?? cue.start + 2) })}
                        style={{ flex: 1 }}
                      />
                      <Button onClick={() => updateSubtitleCue(cue.id, {
                        end: Math.max(cue.start + 0.01, getGuideCurrentTime() ?? cue.start + 2),
                      })}>
                        取当前时间
                      </Button>
                    </Space.Compact>
                  </Col>
                  <Col span={24} style={{ marginTop: 12 }}>
                    <Input.TextArea
                      autoSize={{ minRows: 2, maxRows: 5 }}
                      value={cue.text}
                      placeholder="输入这一时间段显示的字幕，可换行"
                      maxLength={1000}
                      showCount
                      onChange={(event) => updateSubtitleCue(cue.id, { text: event.target.value })}
                    />
                  </Col>
                </Row>
              </Card>
            ))}
          </Space>
        </Col>

        <Col xs={24} xl={10}>
          <Card size="small" title="字体效果预览">
            <div
              style={{
                position: 'relative',
                height: 220,
                overflow: 'hidden',
                borderRadius: 8,
                background: 'linear-gradient(135deg, #234 0%, #7a8b91 48%, #182126 100%)',
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '5%',
                  right: '5%',
                  top: subtitleSettings.style.position === 'top'
                    ? `${subtitleSettings.style.verticalMargin}%`
                    : subtitleSettings.style.position === 'center' ? '50%' : undefined,
                  bottom: subtitleSettings.style.position === 'bottom'
                    ? `${subtitleSettings.style.verticalMargin}%`
                    : undefined,
                  transform: subtitleSettings.style.position === 'center' ? 'translateY(-50%)' : undefined,
                  textAlign: 'center',
                  whiteSpace: 'pre-line',
                  fontFamily: subtitleSettings.style.fontFamily,
                  fontSize: subtitleSettings.style.fontSize,
                  lineHeight: 1.28,
                  color: subtitleSettings.style.color,
                  WebkitTextStroke: `${subtitleSettings.style.outlineWidth}px ${subtitleSettings.style.outlineColor}`,
                  paintOrder: 'stroke fill',
                }}
              >
                <span style={{
                  padding: subtitleSettings.style.backgroundOpacity > 0 ? '4px 10px' : 0,
                  borderRadius: 4,
                  background: subtitleSettings.style.backgroundOpacity > 0
                    ? `${subtitleSettings.style.backgroundColor}${Math.round(subtitleSettings.style.backgroundOpacity * 255).toString(16).padStart(2, '0')}`
                    : 'transparent',
                }}>
                  {subtitlePreviewText}
                </span>
              </div>
            </div>
            <Form layout="vertical">
              <Row gutter={12}>
                <Col xs={24} md={14}>
                  <Form.Item label="字体">
                    <Select
                      showSearch
                      value={subtitleSettings.style.fontFamily}
                      options={[
                        'Microsoft YaHei', 'SimHei', 'SimSun', 'KaiTi',
                        'Arial', 'Arial Black', 'Times New Roman',
                      ].map((font) => ({ value: font, label: font }))}
                      onChange={(fontFamily) => setSubtitleSettings((current) => ({
                        ...current, style: { ...current.style, fontFamily },
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={10}>
                  <Form.Item label="字号">
                    <InputNumber
                      min={12}
                      max={160}
                      value={subtitleSettings.style.fontSize}
                      onChange={(fontSize) => setSubtitleSettings((current) => ({
                        ...current, style: { ...current.style, fontSize: fontSize ?? 42 },
                      }))}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={12} md={8}>
                  <Form.Item label="文字颜色">
                    <ColorPicker
                      value={subtitleSettings.style.color}
                      onChange={(color) => setSubtitleSettings((current) => ({
                        ...current, style: { ...current.style, color: color.toHexString() },
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={12} md={8}>
                  <Form.Item label="描边颜色">
                    <ColorPicker
                      value={subtitleSettings.style.outlineColor}
                      onChange={(color) => setSubtitleSettings((current) => ({
                        ...current, style: { ...current.style, outlineColor: color.toHexString() },
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={12} md={8}>
                  <Form.Item label="描边宽度">
                    <InputNumber
                      min={0}
                      max={12}
                      value={subtitleSettings.style.outlineWidth}
                      onChange={(outlineWidth) => setSubtitleSettings((current) => ({
                        ...current, style: { ...current.style, outlineWidth: outlineWidth ?? 0 },
                      }))}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={12} md={8}>
                  <Form.Item label="底色">
                    <ColorPicker
                      value={subtitleSettings.style.backgroundColor}
                      onChange={(color) => setSubtitleSettings((current) => ({
                        ...current, style: { ...current.style, backgroundColor: color.toHexString() },
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={12} md={8}>
                  <Form.Item label="底色透明度">
                    <InputNumber
                      min={0}
                      max={100}
                      formatter={(value) => `${value ?? 0}%`}
                      parser={(value) => Number((value || '0').replace('%', ''))}
                      value={Math.round(subtitleSettings.style.backgroundOpacity * 100)}
                      onChange={(value) => setSubtitleSettings((current) => ({
                        ...current, style: { ...current.style, backgroundOpacity: (value ?? 0) / 100 },
                      }))}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item label="画面位置">
                    <Select
                      value={subtitleSettings.style.position}
                      options={[
                        { value: 'top', label: '顶部' },
                        { value: 'center', label: '居中' },
                        { value: 'bottom', label: '底部' },
                      ]}
                      onChange={(position) => setSubtitleSettings((current) => ({
                        ...current, style: { ...current.style, position },
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item label={`距画面边缘：${subtitleSettings.style.verticalMargin}%`}>
                    <Slider
                      disabled={subtitleSettings.style.position === 'center'}
                      min={0}
                      max={45}
                      value={subtitleSettings.style.verticalMargin}
                      onChange={(verticalMargin) => setSubtitleSettings((current) => ({
                        ...current, style: { ...current.style, verticalMargin },
                      }))}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
        </Col>
      </Row>
    </>
  );
}
