import 'dotenv/config';
import type { PluginOption } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [react(), visualizer() as PluginOption],
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: [],
    include: ['__tests__/**/*.{test,spec}.{ts,js}', 'tests/**/*.{test,spec}.{ts,js}']
  },
});
