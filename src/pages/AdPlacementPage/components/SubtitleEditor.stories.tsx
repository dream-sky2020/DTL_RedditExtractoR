import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DEFAULT_AD_SUBTITLE_SETTINGS } from '@/utils/adSubtitleSettings';
import { SubtitleEditor } from './SubtitleEditor';

function SubtitleExample({ text, fontSize, backgroundOpacity }: { text: string; fontSize: number; backgroundOpacity: number }) {
  const [settings, setSettings] = useState(DEFAULT_AD_SUBTITLE_SETTINGS);
  useEffect(() => setSettings({
    ...DEFAULT_AD_SUBTITLE_SETTINGS,
    style: { ...DEFAULT_AD_SUBTITLE_SETTINGS.style, fontSize, backgroundOpacity },
    cues: [{ id: 'demo', start: 0, end: 2, text }],
  }), [text, fontSize, backgroundOpacity]);
  return <SubtitleEditor
    subtitleSettings={settings} setSubtitleSettings={setSettings}
    guideAudioUrl="" guideDuration={3} subtitlePreviewText={settings.cues[0]?.text || text}
    importSrt={async () => {}} exportSrt={() => {}}
    getGuideCurrentTime={() => 0} seekGuideAudio={() => {}}
    updateSubtitleCue={(id, patch) => setSettings(current => ({ ...current, cues: current.cues.map(cue => cue.id === id ? { ...cue, ...patch } : cue) }))}
    addSubtitleCue={() => setSettings(current => ({ ...current, cues: [...current.cues, { id: 'demo-' + current.cues.length, start: 0, end: 2, text: '新字幕' }] }))}
  />;
}

const meta = {
  title: 'Pages/AdPlacement/SubtitleEditor',
  component: SubtitleExample,
  parameters: { layout: 'padded' },
  args: { text: '这是一条示范字幕', fontSize: 42, backgroundOpacity: 0 },
  argTypes: {
    fontSize: { control: { type: 'range', min: 12, max: 160, step: 1 } },
    backgroundOpacity: { control: { type: 'range', min: 0, max: 1, step: 0.05 } },
  },
} satisfies Meta<typeof SubtitleExample>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { name: '默认字幕' };
export const Multiline: Story = { name: '多行长字幕', args: { text: '这是一段比较长的广告引导字幕，用来检查换行与字体布局。\n第二行字幕也应清晰可读。', backgroundOpacity: 0.6 } };
