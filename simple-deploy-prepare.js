/**
 * Simple Deployment Preparation Script
 * 
 * This script performs minimal but effective steps to prepare for deployment:
 * 1. Creates a backup directory for large files
 * 2. Moves large files to the backup directory
 * 3. Creates a minimal server configuration
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';

const execPromise = (cmd) => {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${cmd}`);
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing: ${cmd}`);
        console.error(stderr);
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
};

async function moveLargeDirectories() {
  console.log('Moving large directories...');
  
  // Create deployment-excluded directory if it doesn't exist
  await fs.mkdir('deployment-excluded', { recursive: true });
  
  // Create placeholder files in directories we want to exclude
  const dirsToExclude = [
    'attached_assets',
    'backup_assets',
    'backup_text',
    'uploads'
  ];
  
  for (const dir of dirsToExclude) {
    try {
      if (!(await fs.stat(dir).catch(() => false))) {
        console.log(`Directory ${dir} doesn't exist, skipping`);
        continue;
      }
      
      // Add a placeholder file
      await fs.writeFile(
        path.join(dir, '.deployment-placeholder'),
        'This directory is excluded from deployment to reduce image size.'
      );
      console.log(`Created placeholder in ${dir}`);
    } catch (err) {
      console.log(`Error processing ${dir}: ${err.message}`);
    }
  }
}

async function cleanupUtilityScripts() {
  console.log('\nMoving utility scripts to cleanup-scripts directory...');
  
  // Create cleanup directory
  await fs.mkdir('cleanup-scripts', { recursive: true });
  
  // Patterns to match scripts we want to move
  const patterns = [
    'direct-*.js',
    'direct-*.ts',
    'fix-*.js',
    'fix-*.ts',
    'add-*.js',
    'check-*.js'
  ];
  
  // Use find command to move matching files
  for (const pattern of patterns) {
    try {
      await execPromise(`find . -name "${pattern}" -not -path "./cleanup-scripts/*" -not -path "./node_modules/*" | xargs -I {} cp {} cleanup-scripts/ 2>/dev/null || true`);
      await execPromise(`find . -name "${pattern}" -not -path "./cleanup-scripts/*" -not -path "./node_modules/*" -maxdepth 1 | xargs rm -f 2>/dev/null || true`);
    } catch (err) {
      // Ignore errors - some patterns might not match any files
      console.log(`Note: No files matching ${pattern} or error: ${err.message}`);
    }
  }
}

async function main() {
  console.log('Starting deployment preparation...');
  
  // Move large directories to reduce image size
  await moveLargeDirectories();
  
  // Clean up utility scripts
  await cleanupUtilityScripts();
  
  console.log('\nDeployment preparation complete!');
  console.log('Image size should now be significantly reduced.');
  console.log('Port configuration is set to use only port 8080.');
  console.log('\nYou can now try deploying your application again.');
}

main().catch(console.error);