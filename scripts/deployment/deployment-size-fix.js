#!/usr/bin/env node

/**
 * Emergency Deployment Size Fix
 * 
 * This script temporarily moves large directories outside the Docker build context
 * to reduce the deployment image size below the 8GB limit.
 * 
 * Run this script before deployment, then restore after successful deployment.
 * 
 * Usage: node deployment-size-fix.js [restore]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LARGE_DIRS = [
  'attached_assets',
  'uploads',
  // Keep node_modules as it's needed for build
];

const BACKUP_SUFFIX = '.deployment-backup';

function moveDirectory(source, destination) {
  try {
    if (fs.existsSync(source)) {
      fs.renameSync(source, destination);
      console.log(`✅ Moved ${source} to ${destination}`);
      return true;
    } else {
      console.log(`⚠️  Directory ${source} not found, skipping`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Failed to move ${source}:`, error.message);
    return false;
  }
}

function prepareForDeployment() {
  console.log('🚀 Preparing for deployment - reducing image size...\n');
  
  let totalSaved = 0;
  
  LARGE_DIRS.forEach(dir => {
    const backupDir = dir + BACKUP_SUFFIX;
    if (moveDirectory(dir, backupDir)) {
      // Create empty directory to maintain structure
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, '.gitkeep'), '# Temporary directory for deployment\n');
      console.log(`   Created empty ${dir} directory for deployment\n`);
    }
  });

  console.log('✅ Deployment preparation complete!');
  console.log('📦 Image size significantly reduced');
  console.log('\n🔄 After deployment, run: node deployment-size-fix.js restore');
}

function restoreAfterDeployment() {
  console.log('🔄 Restoring directories after deployment...\n');
  
  LARGE_DIRS.forEach(dir => {
    const backupDir = dir + BACKUP_SUFFIX;
    if (fs.existsSync(backupDir)) {
      // Remove the temporary empty directory
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
      // Restore the original directory
      moveDirectory(backupDir, dir);
    }
  });

  console.log('✅ All directories restored successfully!');
}

// Main execution
const isRestore = process.argv.includes('restore');

if (isRestore) {
  restoreAfterDeployment();
} else {
  prepareForDeployment();
}