import type { Meta, StoryObj } from "@storybook/react-vite";
import { AdPlacementView } from "./AdPlacementView";
import {
  emptyAdPlacementState,
  readyAdPlacementState,
  useAdPlacementStoryModel,
} from "./AdPlacementView.fixtures";

function PreviewPage({
  state,
}: Pick<React.ComponentProps<typeof AdPlacementView>, "state">) {
  const model = useAdPlacementStoryModel(state);
  return <AdPlacementView {...model} />;
}

const meta = {
  title: "Pages/AdPlacement/Page",
  component: PreviewPage,
  parameters: {
    docs: {
      description: {
        component:
          "广告页显示层。使用内存示范数据，文件选择与合成不会访问 Flask，提交只显示示范任务号。播放器可查看素材，联动预览请使用真实应用验证。",
      },
    },
  },
  args: { state: emptyAdPlacementState },
} satisfies Meta<typeof PreviewPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = { name: "没有素材" };
export const Loading: Story = {
  name: "正在读取素材",
  args: { state: { ...emptyAdPlacementState, loading: true } },
};
export const ChromaKey: Story = {
  name: "绿幕广告",
  args: { state: readyAdPlacementState },
};
export const Voiceover: Story = {
  name: "普通广告与总配音",
  args: {
    state: {
      ...readyAdPlacementState,
      mode: "plain-overlay",
      guideAudio: "/demo-guide.wav",
      guideDuration: 3,
      guideMode: "voiceover",
      adVideoDelay: 1,
    },
  },
};
export const Portrait: Story = {
  name: "竖屏与超大广告",
  args: {
    state: {
      ...readyAdPlacementState,
      sourceSize: { width: 180, height: 320 },
      previewMaxWidth: 293,
      width: 5,
      autoCenterPlacement: true,
    },
  },
};
