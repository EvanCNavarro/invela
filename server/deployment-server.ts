/**
 * DEPLOYMENT-SPECIFIC SERVER CONFIGURATION
 */

// Force production environment
process.env.NODE_ENV = 'production';
process.env.PORT = '8080';

const HOST = '0.0.0.0';
const PORT = 8080;

// Import the main server module
import('./index.js').then(() => {
  console.log(`Server running on ${HOST}:${PORT} (Autoscale compatible)`);
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// Force production environment for deployment
process.env.NODE_ENV = 'production';

// Force port 8080 for Replit Autoscale
process.env.PORT = '8080';

// Import the main server module to execute it with our environment settings
import './index.js';