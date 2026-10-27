import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    // This project is deployed as a project site from the ux-cleanup branch.
    // Keep asset URLs under /CloudPilot/ for GitHub Pages.
    base: process.env.GITHUB_PAGES === 'true' ? '/CloudPilot/' : '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled per environment constraints to prevent reverse proxy WebSocket errors
      hmr: false,
    },
  };
});
