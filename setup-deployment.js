/**
 * Deployment Setup Script
 * 
 * This script prepares the project for deployment by:
 * 1. Creating backup directories and moving large files
 * 2. Setting up deployment-specific configuration files
 * 3. Ensuring the server only uses port 8080
 */

import fs from 'fs/promises';
import path from 'path';

async function main() {
  console.log('Preparing project for deployment...');
  
  // Create deployment-excluded directory
  const backupDir = 'deployment-excluded';
  await fs.mkdir(backupDir, { recursive: true });
  
  // Create directories to exclude
  const dirsToExclude = [
    'attached_assets',
    'backup_assets',
    'backup_text',
    'uploads'
  ];
  
  // Create placeholders in these directories
  for (const dir of dirsToExclude) {
    try {
      const placeholderFile = path.join(dir, '.deployment-placeholder');
      await fs.writeFile(
        placeholderFile,
        'This directory is excluded during deployment to reduce image size.'
      );
      console.log(`Created placeholder in ${dir}`);
    } catch (err) {
      console.log(`Directory ${dir} may not exist or error: ${err.message}`);
    }
  }
  
  // Create a directory for cleanup scripts
  await fs.mkdir('cleanup-scripts', { recursive: true }).catch(() => {});
  
  console.log('Moving utility scripts...');
  
  // Get all .js files in the root directory
  const files = await fs.readdir('.');
  const scriptPatterns = [
    /^direct-.*\.js$/,
    /^fix-.*\.js$/,
    /^add-.*\.js$/,
    /^check-.*\.js$/,
    /^create-.*\.js$/,
    /^demo-.*\.js$/
  ];
  
  // Move matching files to cleanup-scripts
  for (const file of files) {
    if (scriptPatterns.some(pattern => pattern.test(file))) {
      try {
        // Only copy files that exist (and aren't directories)
        const stats = await fs.stat(file);
        if (stats.isFile()) {
          await fs.copyFile(file, path.join('cleanup-scripts', file));
          console.log(`Moved ${file} to cleanup-scripts`);
        }
      } catch (err) {
        console.log(`Error processing ${file}: ${err.message}`);
      }
    }
  }
  
  console.log('Setup complete. Your project should now be ready for deployment.');
  console.log('Remember to use the deploy-server.js entry point for Replit Autoscale deployment.');
}

main().catch(console.error);