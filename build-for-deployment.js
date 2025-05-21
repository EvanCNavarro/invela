/**
 * Custom Build Script for Replit Deployment
 * 
 * This script runs after the normal build process to optimize the deployment
 * by reducing the image size and ensuring only necessary files are included.
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

// Setup __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function log(message) {
  console.log(`[Build] ${message}`);
}

function success(message) {
  console.log(`[Build] ✅ ${message}`);
}

function error(message, err = null) {
  console.error(`[Build] ❌ ${message}`);
  if (err) console.error(err);
}

async function executeCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

async function getDirSizeMB(dirPath) {
  try {
    const { stdout } = await executeCommand(`du -sm ${dirPath} | cut -f1`);
    return parseInt(stdout.trim(), 10);
  } catch (err) {
    error(`Failed to get size of ${dirPath}`, err);
    return 0;
  }
}

async function ensureDirectory(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    log(`Created directory: ${dir}`);
  }
}

async function copyFile(source, target) {
  try {
    fs.copyFileSync(source, target);
    log(`Copied ${source} to ${target}`);
    return true;
  } catch (err) {
    error(`Failed to copy ${source} to ${target}`, err);
    return false;
  }
}

async function writeFile(path, content) {
  try {
    fs.writeFileSync(path, content);
    log(`Created ${path}`);
    return true;
  } catch (err) {
    error(`Failed to write to ${path}`, err);
    return false;
  }
}

async function ensureServerFiles() {
  log('Ensuring server files are in the correct location...');
  
  // Make sure dist/server directory exists
  await ensureDirectory('dist/server');
  
  // Copy dist/index.js to dist/server/index.js if it exists
  if (fs.existsSync('dist/index.js')) {
    await copyFile('dist/index.js', 'dist/server/index.js');
  } else {
    error('dist/index.js not found, server might not start correctly');
  }
  
  // Create the deployment server
  const deploymentServerContent = `/**
 * Deployment Server for Replit Cloud Run
 * 
 * This is a minimalist server that binds to the port required by Replit.
 */

import http from 'http';

// Port configuration - explicitly using 8080 for deployment
const PORT = 8080; // Always use 8080 for deployment compatibility
const HOST = '0.0.0.0';

// Helper functions
const timestamp = () => new Date().toISOString();
const log = (message) => console.log(\`[\${timestamp()}] \${message}\`);

// Create server
const server = http.createServer((req, res) => {
  log(\`Request: \${req.method} \${req.url}\`);
  
  // Always respond with 200 OK for health checks
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.end(JSON.stringify({
    status: 'ok',
    message: 'Invela Platform API',
    timestamp: timestamp()
  }));
});

// Start server with explicit port binding for Replit
server.listen(PORT, HOST, () => {
  log(\`Server running at http://\${HOST}:\${PORT}\`);
  log(\`Environment: \${process.env.NODE_ENV || 'development'}\`);
});`;

  await writeFile('dist/server/deployment-server.js', deploymentServerContent);
}

async function createOptimizedDeployConfig() {
  log('Creating optimized .replit.deploy.json...');
  
  const deployConfig = {
    "run": "node dist/server/index.js",
    "entrypoint": "dist/server/index.js",
    "build": "npm run build && node build-for-deployment.js",
    "port": 8080,
    "exclude": [
      "node_modules/.cache",
      "node_modules/.pnpm",
      "node_modules/.vite",
      "attached_assets",
      "backup_assets",
      "backup_text",
      "cleanup-scripts",
      "cleanup-plan"
    ]
  };
  
  await writeFile('.replit.deploy.json', JSON.stringify(deployConfig, null, 2));
}

async function createOptimizedDockerIgnore() {
  log('Creating optimized .dockerignore...');
  
  const dockerIgnoreContent = `# Exclude everything by default
*
**/*

# Only include what's absolutely necessary for deployment
!package.json
!package-lock.json
!build-for-deployment.js
!dist/server/index.js
!dist/server/deployment-server.js
!dist/public/index.html
!dist/public/assets/**/*

# Exclude large cache directories
node_modules/.cache/**
node_modules/.vite/**
node_modules/.pnpm/**
node_modules/@types/**
node_modules/typescript/**
node_modules/esbuild/**
node_modules/@esbuild/**
node_modules/vite/**

# Exclude development and backup folders
attached_assets/**
backup_assets/**
backup_text/**
cleanup-scripts/**
cleanup-plan/**
deployment-excluded/**`;

  await writeFile('.dockerignore', dockerIgnoreContent);
}

async function cleanupNodeModules() {
  log('Cleaning up node_modules to reduce image size...');
  
  const sizeBefore = await getDirSizeMB('node_modules');
  log(`node_modules size before cleanup: ${sizeBefore} MB`);
  
  try {
    // Remove cache directories which take a lot of space
    await executeCommand('rm -rf node_modules/.cache node_modules/.vite node_modules/.pnpm');
    
    // Remove dev dependencies that aren't needed in production
    await executeCommand('rm -rf node_modules/@types node_modules/typescript node_modules/esbuild node_modules/@esbuild node_modules/vite');
    
    const sizeAfter = await getDirSizeMB('node_modules');
    log(`node_modules size after cleanup: ${sizeAfter} MB`);
    success(`Reduced node_modules size by ${sizeBefore - sizeAfter} MB`);
  } catch (err) {
    error('Failed to clean up node_modules', err);
  }
}

async function main() {
  try {
    log('Starting deployment preparation...');
    
    // Ensure server files are in the correct location
    await ensureServerFiles();
    
    // Create optimized deployment configuration
    await createOptimizedDeployConfig();
    
    // Create optimized .dockerignore
    await createOptimizedDockerIgnore();
    
    // Clean up node_modules to reduce image size
    await cleanupNodeModules();
    
    success('Deployment preparation complete! Ready to deploy.');
  } catch (err) {
    error('Deployment preparation failed!', err);
    process.exit(1);
  }
}

main();