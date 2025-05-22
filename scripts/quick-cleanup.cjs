/**
 * Quick Safe Cleanup - KISS Principle Implementation
 * 
 * Simple, fast cleanup of obviously safe temporary files
 * No complex dependency analysis - just pattern-based safe removal
 */

const fs = require('fs');

function log(message, data = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [QuickCleanup] ${message}`, data);
}

function quickCleanup(dryRun = true) {
  // Obviously safe patterns for immediate cleanup
  const safePatterns = [
    /^fix-.*\.(js|ts|cjs)$/,
    /^direct-.*\.(js|ts|cjs)$/,
    /^check-.*\.(js|ts|cjs)$/,
    /^force-.*\.(js|ts|cjs)$/,
    /^temp-.*\.(js|ts|cjs)$/,
    /^demo-.*\.(js|ts|cjs)$/,
    /^test-.*\.(js|ts|cjs)$/,
    /^populate-.*\.(js|ts|cjs)$/,
    /.*-backup\.(js|ts|cjs)$/,
    /^browser-.*\.(js|ts|cjs)$/,
    /^cleanup-.*\.(js|ts|cjs)$/,
    /^simple-.*\.(js|ts|cjs)$/,
    /^emergency-.*\.(js|ts|cjs)$/,
    /^repair-.*\.(js|ts|cjs)$/,
    /^update-.*\.(js|ts|cjs)$/
  ];

  const files = fs.readdirSync('.');
  const safeToRemove = [];
  
  files.forEach(file => {
    const stat = fs.statSync(file);
    if (stat.isDirectory()) return;
    
    if (safePatterns.some(pattern => pattern.test(file))) {
      safeToRemove.push(file);
    }
  });

  log(`Found ${safeToRemove.length} files safe for cleanup`);
  
  if (!dryRun) {
    if (!fs.existsSync('.cleanup-backup')) {
      fs.mkdirSync('.cleanup-backup');
    }
    
    let moved = 0;
    safeToRemove.forEach(file => {
      try {
        fs.renameSync(file, `.cleanup-backup/${file}`);
        moved++;
      } catch (err) {
        log(`Failed to move ${file}: ${err.message}`);
      }
    });
    log(`Successfully moved ${moved} files to backup`);
    return moved;
  } else {
    console.log('\n=== QUICK CLEANUP PREVIEW ===');
    console.log(`Ready to move ${safeToRemove.length} files to backup:`);
    safeToRemove.slice(0, 10).forEach(file => console.log(`  - ${file}`));
    if (safeToRemove.length > 10) {
      console.log(`  ... and ${safeToRemove.length - 10} more`);
    }
    console.log('\nTo execute: node scripts/quick-cleanup.cjs --execute');
    console.log('To restore: mv .cleanup-backup/* ./');
    return safeToRemove.length;
  }
}

// Execute
const shouldExecute = process.argv.includes('--execute');
quickCleanup(!shouldExecute);