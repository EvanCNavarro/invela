/**
 * Deployment Entry Point
 * 
 * This ensures the server only listens on port 8080 for Replit Autoscale.
 */

// Force production mode
process.env.NODE_ENV = 'production';
// Force port 8080
process.env.PORT = '8080';

console.log('=====================================================');
console.log('STARTING PRODUCTION SERVER');
console.log('-----------------------------------------------------');
console.log('Environment: production');
console.log('Port: 8080');
console.log('Host: 0.0.0.0');
console.log('=====================================================');

// Import server
import('./dist/server/index.js')
  .catch(err => {
    console.error('Error starting server:', err);
    process.exit(1);
  });
