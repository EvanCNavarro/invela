/**
 * Aggressive Deployment Cleanup Script
 * 
 * This script performs a thorough cleanup to dramatically reduce Docker image size
 * by removing unnecessary files and directories before deployment.
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

// Logger
class CleanupLogger {
  static log(message) {
    console.log(`[CLEANUP] ${message}`);
  }
  
  static success(message) {
    console.log(`[CLEANUP] ✅ ${message}`);
  }
  
  static error(message) {
    console.error(`[CLEANUP] ❌ ${message}`);
  }
}

// Get directory size in MB
async function getDirSizeMB(dirPath) {
  try {
    const result = execSync(`du -sm "${dirPath}" | cut -f1`, { encoding: 'utf8' });
    return parseInt(result.trim(), 10);
  } catch (err) {
    return 0;
  }
}

// Clean node_modules (remove dev dependencies and caches)
async function cleanNodeModules() {
  CleanupLogger.log('Cleaning node_modules...');
  
  try {
    // Remove development-only packages
    const devDirsToRemove = [
      'node_modules/.cache',
      'node_modules/.vite',
      'node_modules/@types',
      'node_modules/typescript',
      'node_modules/ts-node',
      'node_modules/eslint',
      'node_modules/jest',
      'node_modules/tailwindcss',
      'node_modules/postcss',
      'node_modules/autoprefixer',
      'node_modules/vite',
      'node_modules/@vitejs',
      'node_modules/esbuild',
      'node_modules/nodemon',
      'node_modules/concurrently',
    ];
    
    for (const dir of devDirsToRemove) {
      try {
        if (fs.existsSync(dir)) {
          const sizeBefore = await getDirSizeMB(dir);
          await fs.rm(dir, { recursive: true, force: true });
          CleanupLogger.success(`Removed ${dir} (${sizeBefore}MB)`);
        }
      } catch (err) {
        CleanupLogger.error(`Failed to remove ${dir}: ${err.message}`);
      }
    }
    
    // Remove documentation, examples, and tests from all packages
    CleanupLogger.log('Removing package documentation and tests...');
    try {
      execSync('find node_modules -type d -name "docs" -o -name "doc" -o -name "example" -o -name "examples" -o -name "test" -o -name "tests" -o -name "__tests__" | xargs rm -rf', { stdio: 'ignore' });
      CleanupLogger.success('Removed documentation and test directories');
    } catch (err) {
      CleanupLogger.error(`Failed to remove documentation: ${err.message}`);
    }
    
    // Remove .md files
    try {
      execSync('find node_modules -type f -name "*.md" -o -name "LICENSE*" -o -name "*.ts" -not -name "*.d.ts" | xargs rm -f', { stdio: 'ignore' });
      CleanupLogger.success('Removed markdown and license files');
    } catch (err) {
      CleanupLogger.error(`Failed to remove markdown files: ${err.message}`);
    }
    
    CleanupLogger.success('Cleaned node_modules directory');
  } catch (err) {
    CleanupLogger.error(`Error cleaning node_modules: ${err.message}`);
  }
}

// Remove large directories
async function removeLargeDirectories() {
  CleanupLogger.log('Removing large directories...');
  
  const dirsToRemove = [
    'attached_assets',
    'backup_assets',
    'backup_text',
    'uploads',
    'cleanup-scripts',
    '.git',
    '.github',
    'tests',
    'test',
    'docs',
    'scripts',
    'demo'
  ];
  
  // Create a backup directory for reference
  await fs.mkdir('deployment-excluded', { recursive: true });
  
  for (const dir of dirsToRemove) {
    try {
      if (fs.existsSync(dir)) {
        const sizeBefore = await getDirSizeMB(dir);
        
        // Create a placeholder
        const placeholderContent = `This directory (${dir}) was excluded during deployment to reduce image size.`;
        
        // Create a record in the excluded directory
        await fs.writeFile(
          path.join('deployment-excluded', `${dir}.excluded`),
          `Directory ${dir} (${sizeBefore}MB) was excluded from deployment.`
        );
        
        // Create a placeholder in the original location
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(
          path.join(dir, '.deployment-placeholder'),
          placeholderContent
        );
        
        CleanupLogger.success(`Processed ${dir} directory (${sizeBefore}MB)`);
      }
    } catch (err) {
      CleanupLogger.error(`Failed to process ${dir}: ${err.message}`);
    }
  }
}

// Remove large utility scripts
async function removeUtilityScripts() {
  CleanupLogger.log('Removing utility scripts...');
  
  // Common patterns for utility scripts
  const scriptPatterns = [
    /^direct-.*\.js$/,
    /^fix-.*\.js$/,
    /^add-.*\.js$/,
    /^check-.*\.js$/,
    /^create-.*\.js$/,
    /^demo-.*\.js$/,
    /^import-.*\.js$/,
    /^parse-.*\.js$/,
    /^setup-.*\.js$/
  ];
  
  try {
    const files = await fs.readdir('.');
    for (const file of files) {
      if (scriptPatterns.some(pattern => pattern.test(file))) {
        try {
          const stats = await fs.stat(file);
          if (stats.isFile()) {
            await fs.writeFile(
              path.join('deployment-excluded', file),
              `// Original script ${file} was excluded during deployment to reduce image size.`
            );
            
            await fs.writeFile(
              file,
              `// Original script was excluded during deployment to reduce image size.`
            );
            
            CleanupLogger.success(`Processed utility script: ${file}`);
          }
        } catch (err) {
          CleanupLogger.error(`Failed to process ${file}: ${err.message}`);
        }
      }
    }
  } catch (err) {
    CleanupLogger.error(`Failed to process utility scripts: ${err.message}`);
  }
}

// Clean dist directory before build
async function cleanDistDirectory() {
  CleanupLogger.log('Cleaning dist directory...');
  
  try {
    if (fs.existsSync('dist')) {
      await fs.rm('dist', { recursive: true, force: true });
      CleanupLogger.success('Removed dist directory for clean build');
    }
  } catch (err) {
    CleanupLogger.error(`Failed to clean dist directory: ${err.message}`);
  }
}

// Main function
async function main() {
  try {
    console.log('\n========== DEPLOYMENT CLEANUP ==========');
    console.log(`Starting at: ${new Date().toISOString()}`);
    
    // Get initial size information
    const initialSize = await getDirSizeMB('.');
    CleanupLogger.log(`Initial project size: ${initialSize}MB`);
    
    // Run cleanup operations
    await cleanDistDirectory();
    await cleanNodeModules();
    await removeLargeDirectories();
    await removeUtilityScripts();
    
    // Get final size
    const finalSize = await getDirSizeMB('.');
    const savedSize = initialSize - finalSize;
    
    console.log('\n========== CLEANUP COMPLETE ==========');
    CleanupLogger.success(`Initial size: ${initialSize}MB`);
    CleanupLogger.success(`Final size: ${finalSize}MB`);
    CleanupLogger.success(`Saved approximately ${savedSize}MB (${Math.round(savedSize/initialSize*100)}%)`);
    console.log('\nYour project is now ready for deployment!');
    
  } catch (err) {
    CleanupLogger.error(`Deployment cleanup failed: ${err.message}`);
    process.exit(1);
  }
}

// Run the script
main();