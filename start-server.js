/**
 * Custom server starter with Replit domain allowance
 * 
 * This script sets the necessary environment variables to allow
 * all hosts in Vite before importing the main server file.
 */

// Set environment variables for Vite host configuration
// These will be read by the Vite server during startup
process.env.VITE_ALLOW_ORIGIN = '*';
process.env.VITE_SERVER_STRICTPORT = 'false';
process.env.VITE_SERVER_HOST = '0.0.0.0';
// This is the critical setting - force Vite to allow all hosts
process.env.VITE_SERVER_HMRHOST = 'all';
process.env.VITE_SERVER_HMRCORS = 'true';
process.env.VITE_SERVER_ALLOWED_HOSTS = 'all';
process.env.VITE_FORCE_ALLOW = 'true';
process.env.HOST = '0.0.0.0';
// The specific Replit domain from the error message
process.env.VITE_ALLOWED_HOST = '9606074c-a9ad-4fe1-8fe5-3d9c3eed0606-00-33ar2rv36ligj.picard.replit.dev';

// Log what we're doing
console.log('🛠️  Starting server with Vite host restrictions disabled');
console.log('🔓 Setting VITE_SERVER_ALLOWED_HOSTS=all');
console.log('🔓 Adding specific Replit domain to allowed hosts list');

// Import a module that will help us spawn processes
import { spawn } from 'child_process';

// Start the original server script with the environment variables set
// Use npx to run tsx directly
const server = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit', // Forward all IO to parent process
  env: process.env // Pass our modified environment
});

// Handle process events
server.on('error', (error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
  process.exit(code);
});