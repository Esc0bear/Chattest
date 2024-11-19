import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react']
  },
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      'simple-peer': 'simple-peer/simplepeer.min.js',
    },
  },
});