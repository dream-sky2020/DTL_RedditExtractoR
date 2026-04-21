import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
  ],
  resolve: {
    alias: {
      'VideoSettingsSidebarComponent_panel_compont': path.resolve(__dirname, 'src/components/VideoSettingsSidebarComponent/index.tsx'),
      'hslToHex_color_calculate_tool': path.resolve(__dirname, 'src/utils/color/hslToHex.ts'),
      'pseudoRandom01_random_calculate_tool': path.resolve(__dirname, 'src/utils/random/pseudoRandom01.ts'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@config': path.resolve(__dirname, 'video-config.json'),
      '@': path.resolve(__dirname, 'src'),
    }
  }
})
