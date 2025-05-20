/**
 * Deployment Entry Point
 * 
 * This file is designed to be the entry point for Replit Autoscale deployment.
 * It ensures proper port configuration and environment settings.
 */

// Force production environment
process.env.NODE_ENV = 'production';
// Force port 8080 for Autoscale
process.env.PORT = '8080';

console.log('Starting deployment with:');
console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`- PORT: ${process.env.PORT}`);

// Import server (will use ESM import since package.json has type: module)
import('./dist/server/index.js')
  .then(() => {
    console.log('Server started successfully');
  })
  .catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });