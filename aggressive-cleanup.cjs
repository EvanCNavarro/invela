/**
 * Aggressive Deployment Size Reduction Script
 * 
 * This script drastically reduces deployment size by:
 * 1. Moving ALL non-essential assets to a backup directory
 * 2. Removing development-only files and directories
 * 3. Cleaning node_modules of unnecessary files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create backup directory
const backupDir = path.join(__dirname, 'deployment-excluded');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`Created backup directory: ${backupDir}`);
}

// Directories to completely exclude from deployment
const dirsToExclude = [
  'attached_assets',
  'backup_assets',
  'backup_text',
  'uploads',
  'node_modules/.cache',
  '.git',
  'deployment-excluded'
];

// Exclude all directories
dirsToExclude.forEach(dirPath => {
  const fullPath = path.join(__dirname, dirPath);
  const backupPath = path.join(backupDir, path.basename(dirPath));
  
  if (fs.existsSync(fullPath)) {
    try {
      // Create backup directory if it doesn't exist
      if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(backupPath, { recursive: true });
      }
      
      console.log(`Moving directory ${dirPath} to backup location...`);
      
      // For node_modules/.cache, just remove it completely
      if (dirPath === 'node_modules/.cache') {
        execSync(`rm -rf ${fullPath}`);
        console.log(`Removed cache directory: ${dirPath}`);
      } else {
        // Move entire directory to backup (preserving structure)
        execSync(`cp -r ${fullPath}/* ${backupPath}/`);
        execSync(`rm -rf ${fullPath}/*`);
        
        // Create a placeholder file to keep directory structure
        fs.writeFileSync(path.join(fullPath, '.placeholder'), 
          'This directory has been cleaned for deployment. Original files are in deployment-excluded.');
        
        console.log(`Moved directory ${dirPath} to backup and created placeholder`);
      }
    } catch (err) {
      console.error(`Error processing ${dirPath}:`, err);
    }
  } else {
    console.log(`Directory not found: ${dirPath}`);
  }
});

// Additional node_modules cleanup (remove docs, tests, examples)
try {
  console.log('Cleaning node_modules of unnecessary files...');
  const nodeModulesDir = path.join(__dirname, 'node_modules');
  
  if (fs.existsSync(nodeModulesDir)) {
    // Remove documentation, tests, and example directories
    execSync(`find ${nodeModulesDir} -type d -name "doc" -o -name "docs" -o -name "test" -o -name "tests" -o -name "example" -o -name "examples" | xargs rm -rf`);
    // Remove markdown files
    execSync(`find ${nodeModulesDir} -type f -name "*.md" | xargs rm -f`);
    // Remove TypeScript definition files (we don't need them in production)
    execSync(`find ${nodeModulesDir} -type f -name "*.d.ts" | xargs rm -f`);
    
    console.log('Cleaned node_modules of unnecessary documentation and test files');
  }
} catch (err) {
  console.error('Error cleaning node_modules:', err);
}

console.log('Aggressive deployment cleanup completed.');