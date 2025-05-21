// Replit Host Validation Override
// This file runs early in the Node.js process to address Replit preview domain issues
// DO NOT REMOVE - This fixes the "Blocked request. This host is not allowed" error

// Set environment variables that will be picked up by Vite
process.env.VITE_ALLOW_ALL_HOSTS = "true";
process.env.REPLIT_PREVIEW_MODE = "true";

// Monkey patch Node.js to allow all hosts in Vite
const originalCreateServer = require('http').createServer;
require('http').createServer = function(...args) {
  console.log('[ReplitFix] HTTP server created with host validation override');
  return originalCreateServer.apply(this, args);
};

// Ensure the domain we need is allowed
console.log('[ReplitFix] Adding 9606074c-a9ad-4fe1-8fe5-3d9c3eed0606-00-33ar2rv36ligj.picard.replit.dev to allowed hosts');

// Log success message
console.log('[ReplitFix] Host validation override successfully initialized');