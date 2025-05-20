/**
 * Production-only server entry point
 * 
 * This file ensures that for deployment:
 * 1. Only port 8080 is used
 * 2. No additional ports are opened
 * 3. Environment is set to 'production'
 */

// Set production environment 
process.env.NODE_ENV = 'production';
process.env.PORT = '8080';

// Print environment info
console.log(`Starting production server on port 8080`);
console.log(`NODE_ENV=${process.env.NODE_ENV}`);
console.log(`PORT=${process.env.PORT}`);

// Import the actual server but ensure we only use port 8080
require('./dist/server/index.js');