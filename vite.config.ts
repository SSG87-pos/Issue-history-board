import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  base: mode === 'github-pages' ? './' : '/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
}));
