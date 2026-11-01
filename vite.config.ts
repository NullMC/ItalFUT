import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          mui: ['@mui/material', '@emotion/react', '@emotion/styled'],
          supabase: ['@supabase/supabase-js'],
          motion: ['motion/react'],
        },
      },
    },
  },
  esbuild: { drop: ['debugger'], pure: ['console.log', 'console.debug', 'console.info'] },
});
