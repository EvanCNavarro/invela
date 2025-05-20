/**
 * Production Server Entry Point for Replit Deployment
 *
 * This file ensures the server ONLY listens on port 8080 for Replit Autoscale deployment.
 */

// Force production environment
process.env.NODE_ENV = 'production';
// Force port 8080
process.env.PORT = '8080';

console.log('===========================================');
console.log('PRODUCTION SERVER STARTING');
console.log('===========================================');
console.log('Environment: production');
console.log('Port: 8080');
console.log('Host: 0.0.0.0');
console.log('===========================================');

// Import the server
import('./dist/server/index.js')
  .catch(err => {
    console.error('Error starting production server:', err);
    process.exit(1);
  });