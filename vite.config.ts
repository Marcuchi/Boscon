import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
      sourcemap: false
    },
    server: {
      port: 3000
    }
  };
});