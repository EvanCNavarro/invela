// Local vite.config.js override for preview access
import { loadEnv } from "vite";

// This file extends the TypeScript config and is loaded automatically by Vite
export default {
  server: {
    host: '0.0.0.0',
    hmr: {
      clientPort: 443,
      protocol: 'wss',
    },
    cors: true,
    strictPort: false,
    allowedHosts: 'all',
  },
};