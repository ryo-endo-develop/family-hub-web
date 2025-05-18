import { resolve } from 'path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
    build: {
      // 本番ビルドの最適化
      minify: mode === 'production' ? 'terser' : 'esbuild', // Terserが利用できない場合の代替手段として
      terserOptions: {
        compress: {
          drop_console: mode === 'production', // 本番環境ではconsoleを削除
          drop_debugger: mode === 'production',
        },
      },
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            material: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
            redux: ['react-redux', '@reduxjs/toolkit', 'redux-persist'],
          },
        },
      },
    },
  };
});
