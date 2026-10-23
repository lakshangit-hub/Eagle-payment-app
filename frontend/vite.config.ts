import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import path from 'path';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    legacy({
      targets: ['chrome >= 53', 'android >= 7', 'defaults'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
    }),
  ],
  build: {
    outDir: path.resolve(__dirname, '../app/src/main/assets/public'),
    emptyOutDir: true,
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console in debug
      },
    },
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
});
