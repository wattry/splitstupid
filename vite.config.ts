import 'dotenv/config';
import type { PluginOption } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [react(), visualizer({ open: false, filename: 'dist/bundle-stats.html' }) as PluginOption],
  build: {
    outDir: './dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('react-dom') || id.includes('node_modules/react/')) return 'react-vendor';
          if (id.includes('posthog-js') || id.includes('@posthog/react')) return 'observability';
          if (id.includes('react-easy-crop') || id.includes('react-zoom-pan-pinch') || id.includes('tesseract.js')) return 'image-processing';
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: [],
    include: ['__tests__/**/*.{test,spec}.{ts,js}', 'tests/**/*.{test,spec}.{ts,js}'],
    setupFiles: ['tests/setup.ts'],
  },
});
