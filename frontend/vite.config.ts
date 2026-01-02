import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import type { Plugin } from 'vite';

// https://vitejs.dev/config/
const vscodeShim: Plugin = {
  name: 'vscode-shim',
  resolveId(id) {
    if (id === 'vscode') return id;
  },
  load(id) {
    if (id === 'vscode') {
      return 'export const window = {}; export default {};';
    }
  }
};

export default defineConfig({
  plugins: [
    react(),
    vscodeShim,
    nodePolyfills({
      // Enable polyfills for all Node.js globals and modules
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      // Polyfill specific modules needed by simple-peer
      include: ['events', 'util', 'buffer', 'process', 'stream'],
    }),
  ],
  resolve: {
    alias: {
      vscode: '/src/shims/vscode.ts',
    },
  },
  optimizeDeps: {
    exclude: ['vscode', 'monaco-languageclient', 'vscode-languageclient'],
  },
  build: {
    rollupOptions: {
      external: ['vscode', 'monaco-languageclient', 'vscode-languageclient'],
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
