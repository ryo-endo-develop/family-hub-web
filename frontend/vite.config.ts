import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // 環境変数をロード
  const env = loadEnv(mode, process.cwd(), '');
  
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
    minify: 'terser',
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
