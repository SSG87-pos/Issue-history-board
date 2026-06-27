import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  assetsInclude: ['**/*.glb'],
  base: mode === 'github-pages' ? '/Issue-history-board/' : '/',
  plugins: [react()],
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        warn(warning);
      },
      output: {
        manualChunks(id) {
          if (
            id.includes('/node_modules/@react-three/') ||
            id.includes('/node_modules/three/') ||
            id.includes('/node_modules/meshline/') ||
            id.includes('/node_modules/@dimforge/') ||
            id.includes('/node_modules/@mediapipe/') ||
            id.includes('/node_modules/@use-gesture/')
          ) return 'lanyard-vendor';
          if (id.includes('/node_modules/')) return 'vendor';
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    exclude: ['tests/e2e/**', 'tests/e2e-pages/**', 'tests/e2e-pages-live/**', 'tests/e2e-server/**', 'node_modules/**', 'dist/**'],
    globals: true,
  },
}));
