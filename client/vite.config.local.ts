import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// This is a local override that doesn't modify your existing code
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    hmr: {
      clientPort: 443,
      protocol: 'wss'
    },
    cors: true,
    strictPort: false,
    allowedHosts: 'all'
  }
});