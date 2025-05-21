/**
 * Replit Domain Proxy (CommonJS version)
 * 
 * This script creates a proxy server that will forward requests 
 * to the main application without being blocked by Vite's domain validation.
 */

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const http = require('http');

// Create express app
const app = express();

// Log requests for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Create proxy to the main server
const proxy = createProxyMiddleware({
  target: 'http://localhost:5000',
  changeOrigin: true,
  ws: true, // Enable WebSocket forwarding
  onProxyReq: (proxyReq, req) => {
    // Some headers adjustments
    proxyReq.setHeader('X-Forwarded-Host', req.headers.host || '');
    proxyReq.setHeader('X-Forwarded-Proto', 'https');
  }
});

// Use proxy for all requests
app.use('/', proxy);

// Start the proxy server on a different port
const PORT = 3000;
const server = http.createServer(app);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Proxy server running on port ${PORT}`);
  console.log(`🔄 Forwarding all requests to the application on port 5000`);
  console.log(`📝 Try accessing your app through port ${PORT} in the Replit URL`);
});