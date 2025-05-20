/**
 * Comprehensive Deployment Preparation Script
 * 
 * This script runs all necessary deployment preparation steps:
 * 1. Performs aggressive cleanup to reduce Docker image size
 * 2. Creates deployment-server.js in the right location
 * 3. Sets up proper port configuration
 * 4. Verifies everything is ready for deployment
 */

import fs from 'fs/promises';
import { execSync } from 'child_process';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

// Logger for deployment preparation
class DeployLogger {
  static log(message) {
    console.log(`${colors.blue}[DEPLOY-PREP]${colors.reset} ${message}`);
  }
  
  static step(number, message) {
    console.log(`\n${colors.yellow}[STEP ${number}]${colors.reset} ${colors.bold}${message}${colors.reset}`);
  }
  
  static success(message) {
    console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`);
  }
  
  static error(message) {
    console.log(`${colors.red}[ERROR]${colors.reset} ${message}`);
  }
  
  static header(message) {
    console.log(`\n${colors.bold}${colors.blue}=======================================`);
    console.log(message);
    console.log(`=======================================${colors.reset}\n`);
  }
}

// Run deployment cleanup script
async function runCleanup() {
  DeployLogger.step(1, 'Running aggressive cleanup to reduce image size');
  
  try {
    DeployLogger.log('Executing deployment-cleanup.js...');
    execSync('node deployment-cleanup.js', { stdio: 'inherit' });
    DeployLogger.success('Cleanup completed successfully');
    return true;
  } catch (err) {
    DeployLogger.error(`Cleanup failed: ${err.message}`);
    return false;
  }
}

// Create deployment server file
async function createDeploymentServerFile() {
  DeployLogger.step(2, 'Creating deployment server file');
  
  try {
    // Ensure dist/server directory exists
    await fs.mkdir('dist/server', { recursive: true });
    
    const deploymentServerContent = `/**
 * Deployment Server
 * 
 * This file is specifically designed to address the deployment requirements:
 * 1. Only listen on port 8080
 * 2. Work in production mode
 */

// Force production environment
process.env.NODE_ENV = 'production';
process.env.PORT = '8080';

console.log('===========================================');
console.log('INVELA PLATFORM - DEPLOYMENT SERVER');
console.log(\`Starting at: \${new Date().toISOString()}\`);
console.log(\`PORT: \${process.env.PORT}\`);
console.log(\`NODE_ENV: \${process.env.NODE_ENV}\`);
console.log('===========================================');

// Import the built server code
import('./index.js')
  .then(() => {
    console.log('✅ Server started successfully');
  })
  .catch(err => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  });`;

    await fs.writeFile('dist/server/deployment-server.js', deploymentServerContent);
    DeployLogger.success('Created deployment server file at dist/server/deployment-server.js');
    return true;
  } catch (err) {
    DeployLogger.error(`Failed to create deployment server file: ${err.message}`);
    return false;
  }
}

// Set up single port configuration
async function setupPortConfiguration() {
  DeployLogger.step(3, 'Setting up single port configuration');
  
  try {
    const replitDeployContent = `modules = ["nodejs-20", "web", "postgresql-16"]
hidden = [".config", ".git", "generated-icon.png", "node_modules/.cache", "node_modules/.vite"]
run = "npm run dev"

[nix]
channel = "stable-24_05"

[deployment]
deploymentTarget = "cloudrun"
build = ["npm", "run", "build"]
run = ["sh", "-c", "node dist/server/deployment-server.js"]

# Only using a single port as required by Replit Cloud Run
[[ports]]
localPort = 8080
externalPort = 8080

[workflows]
runButton = "Project"`;

    await fs.writeFile('.replit.deploy', replitDeployContent);
    DeployLogger.success('Created .replit.deploy file with single port configuration');
    
    // Create a script to copy this file to .replit for deployment
    const copyScript = `#!/bin/bash
echo "Copying deployment configuration to .replit..."
cp .replit.deploy .replit
echo "Configuration copied. You can now deploy your application."`;

    await fs.writeFile('copy-deploy-config.sh', copyScript);
    execSync('chmod +x copy-deploy-config.sh');
    DeployLogger.success('Created helper script to copy deployment configuration');
    
    return true;
  } catch (err) {
    DeployLogger.error(`Failed to set up port configuration: ${err.message}`);
    return false;
  }
}

// Verify deployment
async function verifyDeployment() {
  DeployLogger.step(4, 'Verifying deployment readiness');
  
  try {
    DeployLogger.log('Running verification script...');
    execSync('node verify-deployment.js', { stdio: 'inherit' });
    DeployLogger.success('Verification completed');
    return true;
  } catch (err) {
    DeployLogger.error(`Verification failed: ${err.message}`);
    return false;
  }
}

// Main function
async function main() {
  DeployLogger.header('DEPLOYMENT PREPARATION');
  console.log(`Starting at: ${new Date().toISOString()}`);
  
  // Run all preparation steps
  const cleanupOk = await runCleanup();
  const deploymentServerOk = await createDeploymentServerFile();
  const portConfigOk = await setupPortConfiguration();
  const verificationOk = await verifyDeployment();
  
  // Final summary
  DeployLogger.header('PREPARATION RESULTS');
  
  console.log(`Cleanup: ${cleanupOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Deployment server: ${deploymentServerOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Port configuration: ${portConfigOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Verification: ${verificationOk ? '✅ PASS' : '❌ FAIL'}`);
  
  const overallStatus = cleanupOk && deploymentServerOk && portConfigOk && verificationOk;
  
  DeployLogger.header('FINAL INSTRUCTIONS');
  if (overallStatus) {
    console.log(`${colors.green}${colors.bold}✅ YOUR APPLICATION IS READY FOR DEPLOYMENT!${colors.reset}`);
    console.log(`\nTo deploy your application:`);
    console.log(`1. Run './copy-deploy-config.sh' to copy the deployment configuration`);
    console.log(`2. Click the 'Deploy' button in Replit`);
  } else {
    console.log(`${colors.red}${colors.bold}❌ SOME PREPARATION STEPS FAILED${colors.reset}`);
    console.log(`\nPlease fix the issues above before attempting to deploy.`);
  }
}

// Run the main function
main();