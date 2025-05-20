/**
 * Simple Deployment Cleanup Script (ES Module version)
 * 
 * This script performs basic cleanup operations to reduce Docker image size
 * by removing unnecessary files and directories.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// Logger
function log(message) {
  console.log(`${colors.blue}[CLEANUP]${colors.reset} ${message}`);
}

function success(message) {
  console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`);
}

function error(message) {
  console.error(`${colors.red}[ERROR]${colors.reset} ${message}`);
}

// Get directory size in MB
function getDirSizeMB(dirPath) {
  try {
    const result = execSync(`du -sm "${dirPath}" | cut -f1`, { encoding: 'utf8' });
    return parseInt(result.trim(), 10);
  } catch (err) {
    return 0;
  }
}

// Main function
function main() {
  console.log('\n========== DEPLOYMENT CLEANUP ==========');
  console.log(`Starting at: ${new Date().toISOString()}`);
  
  // Get initial size information
  const initialSize = getDirSizeMB('.');
  log(`Initial project size: ${initialSize}MB`);
  
  // 1. Clean development directories in node_modules
  log('Cleaning development dependencies...');
  try {
    // Remove dev-only directories
    execSync('rm -rf node_modules/.cache node_modules/.vite', { stdio: 'inherit' });
    success('Removed cache directories');
    
    // Remove documentation and test files
    execSync('find node_modules -type d -name "docs" -o -name "doc" -o -name "example" -o -name "examples" -o -name "test" -o -name "tests" -o -name "__tests__" | xargs rm -rf', { stdio: 'inherit' });
    success('Removed documentation and test directories');
    
    // Remove markdown and license files
    execSync('find node_modules -type f -name "*.md" -o -name "LICENSE*" | xargs rm -f', { stdio: 'inherit' });
    success('Removed markdown and license files');
  } catch (err) {
    error(`Error cleaning node_modules: ${err.message}`);
  }
  
  // 2. Clean large directories
  log('Cleaning large directories...');
  const largeDirs = [
    'attached_assets',
    'backup_assets',
    'backup_text',
    'uploads',
    'cleanup-scripts'
  ];
  
  // Create deployment-excluded directory
  try {
    execSync('mkdir -p deployment-excluded');
    
    for (const dir of largeDirs) {
      try {
        if (fs.existsSync(dir)) {
          const sizeBefore = getDirSizeMB(dir);
          log(`Processing ${dir} (${sizeBefore}MB)...`);
          
          // Move to excluded directory
          execSync(`mv ${dir}/* deployment-excluded/ 2>/dev/null || true`);
          
          // Create placeholder
          execSync(`echo "This directory was cleaned for deployment" > ${dir}/.placeholder`);
          
          success(`Cleaned ${dir} directory (saved ~${sizeBefore}MB)`);
        }
      } catch (err) {
        error(`Failed to process ${dir}: ${err.message}`);
      }
    }
  } catch (err) {
    error(`Error processing large directories: ${err.message}`);
  }
  
  // 3. Clean utility scripts
  log('Cleaning utility scripts...');
  try {
    execSync('mkdir -p deployment-excluded/scripts');
    execSync('find . -maxdepth 1 -type f -name "*.js" -not -name "index.js" -not -name "cleanup.js" -not -name "deployment-server.js" | xargs -I{} cp {} deployment-excluded/scripts/ 2>/dev/null || true');
    execSync('find . -maxdepth 1 -type f -name "add-*.js" -o -name "check-*.js" -o -name "create-*.js" -o -name "demo-*.js" -o -name "fix-*.js" -o -name "import-*.js" -o -name "parse-*.js" -o -name "setup-*.js" | xargs -I{} rm {} 2>/dev/null || true');
    success('Cleaned utility scripts');
  } catch (err) {
    error(`Error cleaning utility scripts: ${err.message}`);
  }
  
  // Get final size
  const finalSize = getDirSizeMB('.');
  const savedSize = initialSize - finalSize;
  
  console.log('\n========== CLEANUP COMPLETE ==========');
  success(`Initial size: ${initialSize}MB`);
  success(`Final size: ${finalSize}MB`);
  success(`Saved approximately ${savedSize}MB (${Math.round(savedSize/initialSize*100)}%)`);
  console.log('\nYour project is now ready for deployment!');
}

// Run the script
main();