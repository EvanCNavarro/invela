/**
 * Preview Fix: Custom server starter with host allowance
 * 
 * This file sets environment variables to allow the Replit domain
 * and then imports the main server entry point.
 */

// Set environment variables to fix Vite host restrictions
process.env.VITE_FORCE_ALLOW_HOSTS = 'true';
process.env.VITE_ALLOWED_HOSTS = 'all';
process.env.VITE_DEV_SERVER_HOST = '0.0.0.0';

// Log the fix being applied
console.log('🔧 Applying Replit preview domain fix...');
console.log('🌐 Setting VITE_ALLOWED_HOSTS=all to accept all domains');

// Start the server by importing the main entry point
import('./server/index.ts').catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});