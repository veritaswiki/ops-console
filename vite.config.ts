import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  root: path.resolve(__dirname, 'web'),
  base: '/',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: path.resolve(__dirname, 'public'),
    emptyOutDir: false,
    cssCodeSplit: false,
    rollupOptions: {
      input: path.resolve(__dirname, 'web/index.html'),
      output: {
        entryFileNames: 'assets/app-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@xyflow/')) return 'vendor-flow';
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
          if (id.includes('motion') || id.includes('framer-motion')) return 'vendor-motion';
          if (
            id.includes('lucide-react') ||
            id.includes('cmdk') ||
            id.includes('vaul') ||
            id.includes('@ui-sdk/') ||
            id.includes('sonner') ||
            id.includes('@number-flow/')
          ) {
            return 'vendor-ui';
          }
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('scheduler')) {
            return 'vendor-react';
          }
          return undefined;
        },
        assetFileNames: (assetInfo) => {
          const name = assetInfo.names?.[0] || assetInfo.name || '';
          if (name.endsWith('.css')) {
            return 'styles.css';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
});
