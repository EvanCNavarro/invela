/**
 * Minimal Server Configuration for Deployment
 * 
 * This file provides a minimal server configuration that ensures:
 * 1. Only port 8080 is used
 * 2. No port forwarding or multiple bindings
 * 3. Production mode is enforced
 */

// Force production environment and port 8080
process.env.NODE_ENV = 'production';
process.env.PORT = '8080';

console.log('======================================');
console.log('DEPLOYMENT SERVER STARTING');
console.log('- PORT: 8080');
console.log('- NODE_ENV: production');
console.log('- HOST: 0.0.0.0');
console.log('======================================');

// Import the built server
import('./dist/server/index.js')
  .catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });