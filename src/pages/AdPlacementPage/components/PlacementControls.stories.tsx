import type { Meta, StoryObj } from "@storybook/react-vite";
import { useArgs } from "storybook/preview-api";
import { PlacementControls } from "./PlacementControls";

const meta = {
  title: "Pages/AdPlacement/PlacementControls",
  component: PlacementControls,
  parameters: { layout: "padded" },
  args: {
    x: 0.375,
    y: 0.278,
    width: 0.25,
    adNormalizedHeight: 0.444,
    autoCenterPlacement: false,
    setAutoCenterPlacement: () => {},
    setX: () => {},
    setY: () => {},
    updateWidthKeepingCenter: () => {},
    applyPreset: () => {},
  },
  argTypes: {
    x: { control: { type: "range", min: -5, max: 1, step: 0.01 } },
    y: { control: { type: "range", min: -5, max: 1, step: 0.01 } },
    width: { control: { type: "range", min: 0.02, max: 5, step: 0.01 } },
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs();
    const x = args.autoCenterPlacement ? (1 - args.width) / 2 : args.x;
    const y = args.autoCenterPlacement ? (1 - args.adNormalizedHeight) / 2 : args.y;
    return (
      <PlacementControls
        {...args}
        x={x}
        y={y}
        setX={(x) => updateArgs({ x })}
        setY={(y) => updateArgs({ y })}
        setAutoCenterPlacement={(autoCenterPlacement) =>
          updateArgs({ autoCenterPlacement })
        }
        updateWidthKeepingCenter={(width) =>
          updateArgs({
            width,
            adNormalizedHeight: (width * 16) / 9,
            x: x - (width - args.width) / 2,
            y: y - ((width * 16) / 9 - args.adNormalizedHeight) / 2,
          })
        }
        applyPreset={(preset) =>
          updateArgs({
            autoCenterPlacement: false,
            x: preset.endsWith("left") ? 0.04 : 1 - 0.04 - args.width,
            y: preset.startsWith("top") ? 0.04 : 1 - 0.04 - args.adNormalizedHeight,
          })
        }
      />
    );
  },
} satisfies Meta<typeof PlacementControls>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Manual: Story = { name: "手动定位" };
export const AutoCenter: Story = {
  name: "自动居中",
  args: { autoCenterPlacement: true },
};
export const Oversized: Story = {
  name: "500% 放大",
  args: {
    width: 5,
    adNormalizedHeight: 8.889,
    x: -2,
    y: -3.944,
    autoCenterPlacement: true,
  },
};
