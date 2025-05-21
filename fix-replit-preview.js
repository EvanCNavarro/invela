/**
 * Fix for Replit preview domain access
 * 
 * This script sets environment variables that tell Vite to accept
 * all hosts, then starts the server normally.
 */

// Set environment variables to allow all hosts
process.env.VITE_FORCE_ALLOW_HOSTS = 'true';
process.env.VITE_ALLOWED_HOSTS = 'all';
process.env.VITE_DEV_SERVER_HOST = '0.0.0.0';

// Import the server startup file
import('./server/index.ts').catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

console.log('🚀 Starting server with Replit preview domain access enabled...');