/**
 * Custom Build Script for Replit Deployment
 * 
 * This script runs after the normal build process to optimize the deployment
 * by reducing the image size and ensuring only necessary files are included.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Logging helper
function log(message) {
  console.log(`[${new Date().toISOString()}] [BUILD] ${message}`);
}

// Success logging helper
function success(message) {
  console.log(`[${new Date().toISOString()}] [BUILD-SUCCESS] ${message}`);
}

// Error logging helper
function error(message, err = null) {
  console.error(`[${new Date().toISOString()}] [BUILD-ERROR] ${message}`);
  if (err) console.error(err);
}

// Get size of directory in MB
async function getDirSizeMB(dirPath) {
  try {
    // Use du command to get directory size
    const stdout = execSync(`du -sm "${dirPath}"`, { encoding: 'utf8' });
    const size = parseFloat(stdout.split(/\s+/)[0]);
    return size;
  } catch (err) {
    error(`Failed to get size of ${dirPath}`, err);
    return 0;
  }
}

// Clean up the node_modules directory
async function cleanNodeModules() {
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  
  try {
    log(`Cleaning up node_modules directory...`);
    const initialSize = await getDirSizeMB(nodeModulesPath);
    log(`Initial node_modules size: ${initialSize.toFixed(2)} MB`);
    
    // Delete test directories
    execSync('find node_modules -type d -name "test" -o -name "tests" | xargs rm -rf', { stdio: 'inherit' });
    log('Removed test directories');
    
    // Delete documentation
    execSync('find node_modules -type d -name "docs" -o -name "doc" -o -name "documentation" | xargs rm -rf', { stdio: 'inherit' });
    log('Removed documentation directories');
    
    // Delete source maps
    execSync('find node_modules -name "*.map" -type f -delete', { stdio: 'inherit' });
    log('Removed source maps');
    
    // Delete examples
    execSync('find node_modules -type d -name "example" -o -name "examples" | xargs rm -rf', { stdio: 'inherit' });
    log('Removed example directories');
    
    // Remove specific large packages
    const largePackages = [
      'typescript',
      '@types',
      'esbuild',
      'vite',
      'tailwindcss',
      'postcss',
      'autoprefixer',
      'plotly.js-dist',
      'plotly.js-dist-min',
      'canvas-confetti',
      'pdf-parse',
      'pdf.js-extract',
      'recharts'
    ];
    
    for (const pkg of largePackages) {
      const pkgPath = path.join(nodeModulesPath, pkg);
      if (fs.existsSync(pkgPath)) {
        execSync(`rm -rf "${pkgPath}"`, { stdio: 'inherit' });
        log(`Removed large package: ${pkg}`);
      }
    }
    
    const finalSize = await getDirSizeMB(nodeModulesPath);
    log(`Final node_modules size: ${finalSize.toFixed(2)} MB`);
    success(`Reduced node_modules size by ${(initialSize - finalSize).toFixed(2)} MB`);
    
  } catch (err) {
    error('Error cleaning node_modules', err);
  }
}

// Remove source maps from dist directory
async function cleanDistDirectory() {
  const distPath = path.join(process.cwd(), 'dist');
  
  try {
    log(`Cleaning up dist directory...`);
    const initialSize = await getDirSizeMB(distPath);
    log(`Initial dist size: ${initialSize.toFixed(2)} MB`);
    
    // Delete source maps from dist
    execSync('find dist -name "*.map" -type f -delete', { stdio: 'inherit' });
    log('Removed source maps from dist');
    
    const finalSize = await getDirSizeMB(distPath);
    log(`Final dist size: ${finalSize.toFixed(2)} MB`);
    success(`Reduced dist size by ${(initialSize - finalSize).toFixed(2)} MB`);
    
  } catch (err) {
    error('Error cleaning dist directory', err);
  }
}

// Copy deployment server to proper location
function copyDeploymentServer() {
  try {
    const sourcePath = path.join(process.cwd(), 'server', 'deployment-server.js');
    
    if (fs.existsSync(sourcePath)) {
      log('Deployment server exists at correct location');
      return true;
    } else {
      error('Deployment server not found at expected location: ' + sourcePath);
      return false;
    }
  } catch (err) {
    error('Error checking deployment server', err);
    return false;
  }
}

// Main function
async function main() {
  try {
    log('Starting build optimization for deployment...');
    
    // Get initial project size
    const initialSize = await getDirSizeMB(process.cwd());
    log(`Initial project size: ${initialSize.toFixed(2)} MB`);
    
    // Clean up node_modules
    await cleanNodeModules();
    
    // Clean up dist directory
    await cleanDistDirectory();
    
    // Verify deployment server
    copyDeploymentServer();
    
    // Get final project size
    const finalSize = await getDirSizeMB(process.cwd());
    log(`Final project size: ${finalSize.toFixed(2)} MB`);
    
    success(`Total size reduction: ${(initialSize - finalSize).toFixed(2)} MB`);
    success('Build optimization completed successfully');
    
    if (finalSize > 7000) {
      log('WARNING: Project is still quite large. Additional cleanup may be required for deployment.');
    } else {
      success('Project size should be within Replit deployment limits.');
    }
    
  } catch (err) {
    error('Build optimization failed', err);
    process.exit(1);
  }
}

// Run the main function
main();