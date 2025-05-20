/**
 * Deployment Configuration
 * 
 * This file sets up a simplified deployment configuration that avoids
 * the need for complex file imports that are causing deployment failures.
 */

// Force production settings
process.env.NODE_ENV = 'production';
process.env.PORT = '8080';

console.log('======================================');
console.log('INVELA DEPLOYMENT STARTING');
console.log('- PORT: 8080');
console.log('- NODE_ENV: production');
console.log('- HOST: 0.0.0.0');
console.log('======================================');

// Direct import of the server module
import('./dist/server/index.js')
  .then(() => {
    console.log('Server started successfully');
  })
  .catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });