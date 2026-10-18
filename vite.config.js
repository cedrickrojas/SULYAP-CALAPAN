import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { createQrDownloadHandler } from './server/qr-download.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const handler = createQrDownloadHandler({ siteUrl: env.VITE_PUBLIC_SITE_URL });
  const downloads = {
    name: 'qr-downloads',
    configureServer(server) { server.middlewares.use('/api/qr-download', handler); },
    configurePreviewServer(server) { server.middlewares.use('/api/qr-download', handler); },
  };
  return { plugins: [react(), tailwindcss(), downloads] };
});
