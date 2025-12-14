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
    },
    define: {
      // Inject API_KEY for Google GenAI SDK which relies on process.env
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});