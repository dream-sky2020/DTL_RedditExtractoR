import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/pages/AdPlacementPage/**/*.stories.tsx"],
  addons: ["@storybook/addon-docs"],
  framework: "@storybook/react-vite",
  staticDirs: ["./public"],
  core: { disableTelemetry: true },
};

export default config;
