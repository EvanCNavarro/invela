/**
 * Pre-deployment Cleanup Script
 * 
 * This script reduces the size of the deployment package by:
 * 1. Moving large asset files to a backup directory
 * 2. Clearing caches and temporary files
 * 3. Removing development-only files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Directories to clean or exclude from deployment
const largeDirs = [
  'attached_assets',
  'uploads', 
  'node_modules/.cache'
];

// Create backup directory if it doesn't exist
const backupDir = path.join(__dirname, 'deployment-excluded');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`Created backup directory: ${backupDir}`);
}

// Clean each large directory
largeDirs.forEach(dirPath => {
  const fullPath = path.join(__dirname, dirPath);
  const backupPath = path.join(backupDir, path.basename(dirPath));
  
  if (fs.existsSync(fullPath)) {
    // Create backup destination
    if (!fs.existsSync(backupPath)) {
      fs.mkdirSync(backupPath, { recursive: true });
    }
    
    console.log(`Processing ${dirPath}...`);
    
    // For attached_assets, just move the largest files
    if (dirPath === 'attached_assets') {
      try {
        // Get file sizes and sort by largest first
        const files = fs.readdirSync(fullPath)
          .filter(file => !file.startsWith('.')) // Skip hidden files
          .map(file => {
            const filePath = path.join(fullPath, file);
            const stats = fs.statSync(filePath);
            return { file, size: stats.size, path: filePath };
          })
          .sort((a, b) => b.size - a.size); // Sort largest first
        
        // Keep track of total size we're saving
        let totalSaved = 0;
        
        // Move the largest files (limit to top 100 to avoid excessive operations)
        files.slice(0, 100).forEach(fileInfo => {
          if (fileInfo.size > 1000000) { // Only move files > 1MB
            const destPath = path.join(backupPath, fileInfo.file);
            fs.copyFileSync(fileInfo.path, destPath);
            fs.unlinkSync(fileInfo.path);
            totalSaved += fileInfo.size;
            console.log(`Moved large file: ${fileInfo.file} (${(fileInfo.size/1024/1024).toFixed(2)} MB)`);
          }
        });
        
        console.log(`Saved ${(totalSaved/1024/1024).toFixed(2)} MB from ${dirPath}`);
      } catch (err) {
        console.error(`Error processing ${dirPath}:`, err);
      }
    } else if (dirPath === 'node_modules/.cache') {
      // For cache directories, just remove them entirely
      try {
        console.log(`Clearing cache directory: ${dirPath}`);
        execSync(`rm -rf ${fullPath}`);
        console.log(`Successfully cleared cache: ${dirPath}`);
      } catch (err) {
        console.error(`Error clearing cache ${dirPath}:`, err);
      }
    } else {
      // For other directories, move them to backup
      try {
        console.log(`Moving directory ${dirPath} to backup`);
        execSync(`mv ${fullPath}/* ${backupPath}/`);
        console.log(`Successfully backed up ${dirPath}`);
      } catch (err) {
        console.error(`Error backing up ${dirPath}:`, err);
      }
    }
  } else {
    console.log(`Directory not found: ${dirPath}`);
  }
});

console.log('Pre-deployment cleanup completed.');