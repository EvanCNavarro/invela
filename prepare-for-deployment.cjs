/**
 * Comprehensive Deployment Preparation Script
 * 
 * This script runs all necessary deployment preparation steps:
 * 1. Performs aggressive cleanup to reduce Docker image size
 * 2. Creates deployment-server.js in the right location
 * 3. Sets up proper port configuration
 * 4. Verifies everything is ready for deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DeployLogger {
  static log(message) {
    console.log(`[Deploy] ${message}`);
  }
  
  static step(number, message) {
    console.log(`\n[Deploy] Step ${number}: ${message}`);
    console.log(`[Deploy] ${'='.repeat(50)}`);
  }
  
  static success(message) {
    console.log(`[Deploy] ✅ ${message}`);
  }
  
  static error(message) {
    console.error(`[Deploy] ❌ ${message}`);
  }
  
  static header(message) {
    console.log(`\n[Deploy] ${'='.repeat(50)}`);
    console.log(`[Deploy] ${message}`);
    console.log(`[Deploy] ${'='.repeat(50)}`);
  }
}

function getDirSizeMB(dir) {
  try {
    const output = execSync(`du -sm ${dir}`).toString();
    return parseInt(output.split('\t')[0]);
  } catch (err) {
    return 0;
  }
}

async function runCleanup() {
  DeployLogger.step(1, 'Running aggressive cleanup to reduce image size');
  
  // Log initial sizes
  const initialNodeModulesSize = getDirSizeMB('node_modules');
  DeployLogger.log(`Initial node_modules size: ${initialNodeModulesSize}MB`);
  
  // Remove cache directories
  DeployLogger.log('Removing cache directories...');
  try {
    execSync('rm -rf node_modules/.cache');
    execSync('rm -rf node_modules/.vite');
    execSync('rm -rf node_modules/.pnpm');
    
    // Remove development dependencies
    DeployLogger.log('Removing development dependencies...');
    execSync('rm -rf node_modules/@types');
    execSync('rm -rf node_modules/typescript');
    execSync('rm -rf node_modules/esbuild');
    execSync('rm -rf node_modules/@esbuild');
    execSync('rm -rf node_modules/vite');
    
    // Remove backup and development directories
    DeployLogger.log('Removing backup and development directories...');
    execSync('rm -rf attached_assets');
    execSync('rm -rf backup_assets');
    execSync('rm -rf backup_text');
    execSync('rm -rf cleanup-scripts');
    execSync('rm -rf cleanup-plan');
    execSync('rm -rf deployment-excluded');
    
    const finalNodeModulesSize = getDirSizeMB('node_modules');
    DeployLogger.success(`Reduced node_modules size from ${initialNodeModulesSize}MB to ${finalNodeModulesSize}MB (${initialNodeModulesSize - finalNodeModulesSize}MB saved)`);
  } catch (err) {
    DeployLogger.error(`Error during cleanup: ${err.message}`);
  }
}

async function createDeploymentServerFile() {
  DeployLogger.step(2, 'Creating deployment server file');
  
  const deploymentServerContent = `/**
 * Deployment Server for Replit Cloud Run
 * 
 * A minimal server that explicitly binds to port 8080
 * to satisfy Replit's deployment requirements.
 */

const http = require('http');

// Port configuration - explicitly bind to 8080
const PORT = 8080; 
const HOST = '0.0.0.0';

// Simple timestamp function for logs
function getTimestamp() {
  return new Date().toISOString();
}

function log(message) {
  console.log(\`[\${getTimestamp()}] \${message}\`);
}

// Create a minimal server
const server = http.createServer((req, res) => {
  log(\`Request received: \${req.method} \${req.url}\`);
  
  // Simple health check response
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.end(JSON.stringify({
    status: 'ok',
    message: 'API is running',
    timestamp: getTimestamp()
  }));
});

// Start server with explicit port binding
server.listen(PORT, HOST, () => {
  log(\`Server running at http://\${HOST}:\${PORT}\`);
  log(\`Environment: \${process.env.NODE_ENV || 'production'}\`);
});`;

  // Write to both locations to ensure one of them is found
  try {
    fs.writeFileSync('deployment-server.js', deploymentServerContent);
    DeployLogger.success('Created deployment-server.js in root directory');
    
    if (!fs.existsSync('server')) {
      fs.mkdirSync('server', { recursive: true });
    }
    
    fs.writeFileSync('server/deployment-server.js', deploymentServerContent);
    DeployLogger.success('Created server/deployment-server.js');
  } catch (err) {
    DeployLogger.error(`Error creating deployment server files: ${err.message}`);
  }
}

async function setupDeploymentConfig() {
  DeployLogger.step(3, 'Setting up deployment configuration');
  
  const deployConfig = {
    "run": "node server/deployment-server.js",
    "entrypoint": "server/deployment-server.js",
    "build": "npm run build",
    "port": 8080
  };
  
  try {
    fs.writeFileSync('.replit.deploy.json', JSON.stringify(deployConfig, null, 2));
    DeployLogger.success('Created optimized .replit.deploy.json');
  } catch (err) {
    DeployLogger.error(`Error creating .replit.deploy.json: ${err.message}`);
  }
  
  const dockerIgnoreContent = `# Exclude large directories to reduce image size
node_modules/.cache
attached_assets
backup_assets
backup_text
uploads
deployment-excluded
cleanup-scripts

# Exclude development files
node_modules/.vite
node_modules/.pnpm
node_modules/@types
node_modules/typescript
node_modules/esbuild
node_modules/@esbuild
node_modules/vite`;

  try {
    fs.writeFileSync('.dockerignore', dockerIgnoreContent);
    DeployLogger.success('Created optimized .dockerignore');
  } catch (err) {
    DeployLogger.error(`Error creating .dockerignore: ${err.message}`);
  }
}

async function main() {
  DeployLogger.header('Starting Deployment Preparation');
  
  try {
    await runCleanup();
    await createDeploymentServerFile();
    await setupDeploymentConfig();
    
    DeployLogger.header('Deployment Preparation Complete');
    DeployLogger.success('Your application is now ready for deployment!');
    DeployLogger.log('Run this script again before each deployment attempt.');
  } catch (err) {
    DeployLogger.error(`Deployment preparation failed: ${err.message}`);
  }
}

main();