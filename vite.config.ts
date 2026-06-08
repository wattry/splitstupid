import 'dotenv/config';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: [],
    include: ['__tests__/**/*.{test,spec}.{ts,js}', 'tests/**/*.{test,spec}.{ts,js}']
  },
});
