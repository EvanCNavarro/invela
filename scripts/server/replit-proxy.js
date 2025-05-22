/**
 * Replit Domain Proxy Server
 * 
 * This script creates a lightweight proxy server that forwards requests
 * to the main application server running on port 5000. This bypasses
 * Vite's host validation by acting as an intermediary.
 */

import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import http from 'http';

// Create a simple Express server
const app = express();

// Log all requests for debugging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// Create proxy middleware targeting localhost:5000
const proxyMiddleware = createProxyMiddleware({
  target: 'http://localhost:5000',
  changeOrigin: true,
  ws: true, // Enable WebSocket proxying
  logLevel: 'debug',
  onProxyReq: (proxyReq, req, res) => {
    // Modify request headers if needed
    proxyReq.setHeader('X-Forwarded-Host', req.headers.host || '');
    proxyReq.setHeader('X-Replit-Proxy', 'true');
  }
});

// Apply the proxy middleware to all requests
app.use('/', proxyMiddleware);

// Choose a different port for the proxy
const PORT = 3500;
const server = http.createServer(app);

// Start the proxy server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Replit domain proxy running on port ${PORT}`);
  console.log(`🔄 Forwarding all requests to localhost:5000`);
  console.log(`✅ Use port ${PORT} in your Replit preview URL`);
});