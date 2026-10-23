import type { Preview } from "@storybook/react-vite";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import "antd/dist/reset.css";
import "../src/style/colors.css";
import "../src/style/style.css";
import "../src/style/tables.css";
import "./preview.css";

const preview: Preview = {
  decorators: [
    (Story) => (
      <ConfigProvider locale={zhCN}>
        <Story />
      </ConfigProvider>
    ),
  ],
  parameters: {
    layout: "fullscreen",
    controls: { expanded: true },
  },
};

export default preview;
