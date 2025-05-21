/**
 * Deployment Cleanup Script
 * 
 * This script performs aggressive cleanup operations to reduce Docker image
 * size before deployment by removing unnecessary files and directories.
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';

const exec = promisify(execCallback);

// Configure logger with timestamps for better debugging
class Logger {
  static log(message) {
    console.log(`[${new Date().toISOString()}] [INFO] ${message}`);
  }
  
  static success(message) {
    console.log(`[${new Date().toISOString()}] [SUCCESS] ${message}`);
  }
  
  static error(message, error = null) {
    console.error(`[${new Date().toISOString()}] [ERROR] ${message}`);
    if (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] Details: ${error.message || error}`);
    }
  }
  
  static warning(message) {
    console.warn(`[${new Date().toISOString()}] [WARNING] ${message}`);
  }
}

// Get directory size in MB (useful for debugging)
async function getDirSizeMB(dirPath) {
  try {
    const { stdout } = await exec(`du -sm "${dirPath}"`);
    const size = parseFloat(stdout.split('\t')[0]);
    return size;
  } catch (error) {
    Logger.error(`Failed to get size of ${dirPath}`, error);
    return 0;
  }
}

// Clean up node_modules to reduce size
async function cleanNodeModules() {
  Logger.log('Cleaning node_modules...');
  const startSize = await getDirSizeMB('node_modules');
  
  try {
    // Remove cache directories
    await exec('rm -rf node_modules/.cache node_modules/.vite');
    Logger.success('Removed cache directories');
    
    // Remove test directories
    await exec('find node_modules -type d -name "test" -o -name "tests" | xargs rm -rf 2>/dev/null || true');
    Logger.success('Removed test directories');
    
    // Remove documentation
    await exec('find node_modules -type d -name "docs" -o -name "doc" | xargs rm -rf 2>/dev/null || true');
    Logger.success('Removed documentation directories');
    
    // Remove unnecessary files
    await exec('find node_modules -name "*.md" -o -name "*.ts" -not -name "*.d.ts" | xargs rm -f 2>/dev/null || true');
    Logger.success('Removed unnecessary files');
    
    const endSize = await getDirSizeMB('node_modules');
    Logger.success(`Reduced node_modules size from ${startSize}MB to ${endSize}MB (saved ${(startSize - endSize).toFixed(2)}MB)`);
  } catch (error) {
    Logger.error('Error cleaning node_modules', error);
  }
}

// Remove large asset directories
async function removeLargeDirectories() {
  Logger.log('Cleaning large asset directories...');
  
  // Create excluded directory if it doesn't exist
  if (!fs.existsSync('deployment-excluded')) {
    fs.mkdirSync('deployment-excluded', { recursive: true });
  }
  
  const directories = [
    'attached_assets',
    'backup_assets',
    'backup_text',
    'uploads'
  ];
  
  for (const dir of directories) {
    try {
      if (fs.existsSync(dir)) {
        const startSize = await getDirSizeMB(dir);
        
        // Move files to excluded directory
        await exec(`find ${dir} -type f -not -name ".placeholder" | xargs -I{} mv {} deployment-excluded/ 2>/dev/null || true`);
        
        // Create placeholder
        fs.writeFileSync(`${dir}/.placeholder`, 'Directory cleaned for deployment');
        
        const endSize = await getDirSizeMB(dir);
        Logger.success(`Cleaned ${dir}: ${startSize}MB → ${endSize}MB (saved ${(startSize - endSize).toFixed(2)}MB)`);
      }
    } catch (error) {
      Logger.error(`Error cleaning ${dir}`, error);
    }
  }
}

// Remove utility scripts that aren't needed in production
async function removeUtilityScripts() {
  Logger.log('Removing utility scripts...');
  
  try {
    await exec('mkdir -p deployment-excluded/scripts');
    
    // Move utility scripts to excluded directory
    const patterns = [
      'cleanup-*.js',
      'cleanup-*.sh',
      'populate-*.js',
      'import-*.ts',
      'force-*.js',
      'fix_*.js',
      'add-*.cjs',
      'create-*.cjs'
    ];
    
    for (const pattern of patterns) {
      await exec(`find . -maxdepth 1 -name "${pattern}" | xargs -I{} mv {} deployment-excluded/scripts/ 2>/dev/null || true`);
    }
    
    Logger.success('Removed utility scripts');
  } catch (error) {
    Logger.error('Error removing utility scripts', error);
  }
}

// Clean the dist directory if it exists
async function cleanDistDirectory() {
  Logger.log('Cleaning dist directory...');
  
  try {
    if (fs.existsSync('dist')) {
      // Remove any cache files
      await exec('find dist -name ".cache" | xargs rm -rf 2>/dev/null || true');
      
      // Remove source maps
      await exec('find dist -name "*.map" | xargs rm -f 2>/dev/null || true');
      
      Logger.success('Cleaned dist directory');
    } else {
      Logger.log('Dist directory does not exist yet, skipping');
    }
  } catch (error) {
    Logger.error('Error cleaning dist directory', error);
  }
}

// Main function to execute all cleanup tasks
async function main() {
  Logger.log('Starting deployment cleanup...');
  
  const startTime = Date.now();
  
  try {
    // Get initial size
    const initialSize = await getDirSizeMB('.');
    Logger.log(`Initial project size: ${initialSize}MB`);
    
    // Run cleanup tasks
    await removeLargeDirectories();
    await cleanNodeModules();
    await removeUtilityScripts();
    await cleanDistDirectory();
    
    // Get final size
    const finalSize = await getDirSizeMB('.');
    const savedSize = initialSize - finalSize;
    
    // Log results
    Logger.success(`Cleanup completed in ${((Date.now() - startTime) / 1000).toFixed(1)} seconds`);
    Logger.success(`Final project size: ${finalSize}MB (saved ${savedSize.toFixed(2)}MB, ${(savedSize / initialSize * 100).toFixed(1)}% reduction)`);
  } catch (error) {
    Logger.error('Cleanup failed', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  Logger.error('Unhandled error in cleanup script', error);
  process.exit(1);
});