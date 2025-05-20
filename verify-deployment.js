/**
 * Deployment Verification Script
 * 
 * This script verifies that all the necessary files and configurations
 * are in place for a successful deployment to Replit.
 */

import fs from 'fs';
import path from 'path';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Logger for deployment verification
class VerificationLogger {
  static log(message) {
    console.log(`${colors.blue}[VERIFY]${colors.reset} ${message}`);
  }
  
  static success(message) {
    console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`);
  }
  
  static warn(message) {
    console.log(`${colors.yellow}[WARNING]${colors.reset} ${message}`);
  }
  
  static error(message) {
    console.log(`${colors.red}[ERROR]${colors.reset} ${message}`);
  }
  
  static header(message) {
    console.log(`\n${colors.cyan}=======================================`);
    console.log(`${message}`);
    console.log(`=======================================${colors.reset}\n`);
  }
}

// Check if required files exist
function checkRequiredFiles() {
  VerificationLogger.header('Checking Required Files');
  
  const requiredFiles = [
    { path: '.replit.deploy', description: 'Deployment configuration' },
    { path: '.dockerignore', description: 'Docker build exclusions' },
    { path: 'server/deployment-server.js', description: 'Deployment server entry point' },
    { path: 'package.json', description: 'Project configuration' }
  ];
  
  let allFilesExist = true;
  
  for (const file of requiredFiles) {
    if (fs.existsSync(file.path)) {
      VerificationLogger.success(`Found ${file.path} (${file.description})`);
    } else {
      VerificationLogger.error(`Missing ${file.path} (${file.description})`);
      allFilesExist = false;
    }
  }
  
  return allFilesExist;
}

// Verify port configuration
function verifyPortConfiguration() {
  VerificationLogger.header('Verifying Port Configuration');
  
  try {
    const replitDeploy = fs.readFileSync('.replit.deploy', 'utf8');
    
    // Check for single port configuration
    const portMatches = replitDeploy.match(/\[\[ports\]\]/g);
    if (portMatches && portMatches.length === 1) {
      VerificationLogger.success('Found exactly one port configuration in .replit.deploy');
      
      // Check if it's using port 8080
      if (replitDeploy.includes('localPort = 8080') && replitDeploy.includes('externalPort = 8080')) {
        VerificationLogger.success('Port 8080 is correctly configured for Replit Cloud Run');
        return true;
      } else {
        VerificationLogger.error('Port configuration exists but is not set to 8080');
        return false;
      }
    } else {
      VerificationLogger.error(`Found ${portMatches ? portMatches.length : 0} port configurations, but exactly 1 is required`);
      return false;
    }
  } catch (err) {
    VerificationLogger.error(`Could not read .replit.deploy file: ${err.message}`);
    return false;
  }
}

// Verify docker ignore configuration
function verifyDockerIgnore() {
  VerificationLogger.header('Verifying Docker Exclusions');
  
  try {
    const dockerIgnore = fs.readFileSync('.dockerignore', 'utf8');
    const lines = dockerIgnore.split('\n').filter(line => 
      line.trim() && !line.startsWith('#')
    );
    
    VerificationLogger.log(`Found ${lines.length} exclusions in .dockerignore`);
    
    // Check for critical directories that should be excluded
    const criticalExclusions = [
      'node_modules/.cache',
      'attached_assets',
      'backup_assets',
      'uploads'
    ];
    
    let allCriticalExcluded = true;
    for (const exclusion of criticalExclusions) {
      if (dockerIgnore.includes(exclusion)) {
        VerificationLogger.success(`Directory '${exclusion}' is properly excluded`);
      } else {
        VerificationLogger.warn(`Large directory '${exclusion}' is not excluded, which may lead to size issues`);
        allCriticalExcluded = false;
      }
    }
    
    return allCriticalExcluded;
  } catch (err) {
    VerificationLogger.error(`Could not read .dockerignore file: ${err.message}`);
    return false;
  }
}

// Check if deployment server correctly configures port 8080
function verifyDeploymentServer() {
  VerificationLogger.header('Verifying Deployment Server Configuration');
  
  try {
    const deploymentServer = fs.readFileSync('server/deployment-server.js', 'utf8');
    
    // Check for essential deployment settings
    const checks = [
      { pattern: "process.env.NODE_ENV = 'production'", description: 'Production environment setting' },
      { pattern: "process.env.PORT = '8080'", description: 'Port 8080 configuration' },
      { pattern: "const PORT = 8080", description: 'PORT constant definition' },
      { pattern: "import('./index.js')", description: 'Proper server module import' }
    ];
    
    let allChecksPass = true;
    for (const check of checks) {
      if (deploymentServer.includes(check.pattern)) {
        VerificationLogger.success(`Found ${check.description}`);
      } else {
        VerificationLogger.error(`Missing ${check.description}`);
        allChecksPass = false;
      }
    }
    
    return allChecksPass;
  } catch (err) {
    VerificationLogger.error(`Could not read deployment server file: ${err.message}`);
    return false;
  }
}

// Main function
function main() {
  VerificationLogger.header('DEPLOYMENT VERIFICATION');
  console.log(`Starting verification at: ${new Date().toISOString()}`);
  
  // Run all verification checks
  const requiredFilesOk = checkRequiredFiles();
  const portConfigOk = verifyPortConfiguration();
  const dockerIgnoreOk = verifyDockerIgnore();
  const deploymentServerOk = verifyDeploymentServer();
  
  // Output final results
  VerificationLogger.header('VERIFICATION RESULTS');
  
  console.log(`Required files: ${requiredFilesOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Port configuration: ${portConfigOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Docker exclusions: ${dockerIgnoreOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Deployment server: ${deploymentServerOk ? '✅ PASS' : '❌ FAIL'}`);
  
  const overallStatus = requiredFilesOk && portConfigOk && dockerIgnoreOk && deploymentServerOk;
  
  VerificationLogger.header('DEPLOYMENT READINESS');
  if (overallStatus) {
    console.log(`${colors.green}✅ YOUR APPLICATION IS READY FOR DEPLOYMENT!${colors.reset}`);
    console.log(`\nTo deploy your application:`);
    console.log(`1. Run 'node prepare-deployment.js' to prepare files`);
    console.log(`2. Copy .replit.deploy to .replit (or follow Replit's deployment instructions)`);
    console.log(`3. Click the 'Deploy' button in Replit`);
  } else {
    console.log(`${colors.red}❌ YOUR APPLICATION IS NOT READY FOR DEPLOYMENT${colors.reset}`);
    console.log(`\nPlease fix the issues above before attempting to deploy.`);
  }
}

// Run the main function
main();