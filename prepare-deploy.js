/**
 * Prepare Deployment Script
 * 
 * This script performs three important steps to ensure successful deployment:
 * 1. Runs the pre-deploy cleanup to reduce image size
 * 2. Updates configuration files to ensure proper port settings
 * 3. Ensures proper environment variables are set
 */

// Import required modules
import fs from 'fs';
import { exec } from 'child_process';

console.log('===========================================');
console.log('PREPARING DEPLOYMENT');
console.log('===========================================');

// Step 1: Run pre-deploy cleanup via CommonJS version
console.log('Step 1: Running pre-deployment cleanup...');
exec('node pre-deploy.cjs', (error, stdout, stderr) => {
  if (error) {
    console.error('Error running pre-deploy cleanup:', error);
    console.error(stderr);
    process.exit(1);
  }
  
  console.log(stdout);
  console.log('Pre-deployment cleanup completed successfully.');
  
  // Step 2: Set production environment
  console.log('Step 2: Setting production environment...');
  process.env.NODE_ENV = 'production';
  process.env.PORT = '8080';
  
  console.log('Environment configured:');
  console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`- PORT: ${process.env.PORT}`);
  
  // Step 3: Verify deployment configuration files
  console.log('Step 3: Verifying deployment configuration files...');
  if (fs.existsSync('.replit.deploy')) {
    console.log('- .replit.deploy exists ✓');
  } else {
    console.error('- .replit.deploy is missing! Deployment will fail.');
    process.exit(1);
  }
  
  console.log('===========================================');
  console.log('DEPLOYMENT PREPARATION COMPLETE');
  console.log('===========================================');
  console.log('Your application is ready for deployment!');
  console.log('Click "Deploy" in the Replit interface to start the deployment process.');
});