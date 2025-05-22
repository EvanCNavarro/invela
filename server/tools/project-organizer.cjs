#!/usr/bin/env node

/**
 * Professional Project Organizer
 * 
 * This script transforms the cluttered project root into a clean,
 * professional structure following modern best practices.
 */

const fs = require('fs');
const path = require('path');

// Files that should stay in root (essential config only)
const ROOT_FILES_TO_KEEP = [
  'package.json',
  'package-lock.json', 
  'tsconfig.json',
  'drizzle.config.ts',
  'vite.config.ts',
  '.env',
  '.replit',
  '.gitignore',
  '.npmrc',
  'README.md'
];

// Organized file movements
const FILE_MOVEMENTS = {
  'tools/deployment/': [
    'deployment-helpers.ts',
    'deployment-size-fix.js'
  ],
  'tools/database/': [
    'database-cleanup.ts',
    'cleanup-database.js'
  ],
  'tools/maintenance/': [
    'find-stuck-kyb-tasks.js',
    'fix-progress-data-consistency.ts'
  ],
  'docs/': [
    /.*\.md$/,
    /.*\.txt$/
  ]
};

// Files to remove completely (safe deletions)
const REMOVE_PATTERNS = [
  /^browser-.*\.js$/,
  /^apply_fix\.js$/,
  /^create_fixed_file\.cjs$/,
  /.*-debug.*\.(js|ts|cjs)$/,
  /.*-test-.*\.(js|ts|cjs)$/,
  /^check-.*\.(js|ts|cjs)$/,
  /^add-.*\.(js|ts|cjs)$/,
  /^fill-.*\.(js|ts|cjs)$/,
  /^populate-.*\.(js|ts|cjs)$/,
  /^force-.*\.(js|ts|cjs)$/,
  /^simple-.*\.(js|ts|cjs)$/,
  /^fix-.*\.(js|ts|cjs)$/,
  /.*task-\d+.*\.(js|ts|cjs)$/,
  /.*-fix-.*\.(js|ts|cjs)$/
];

function log(message, color = '\x1b[0m') {
  console.log(`${color}[ProjectOrganizer] ${message}\x1b[0m`);
}

function isPatternMatch(filename, patterns) {
  return patterns.some(pattern => {
    if (typeof pattern === 'string') {
      return filename === pattern;
    }
    return pattern.test(filename);
  });
}

function organizeFiles() {
  log('📦 Organizing files into proper structure...', '\x1b[36m');
  
  const rootFiles = fs.readdirSync('.').filter(f => fs.statSync(f).isFile());
  let movedCount = 0;
  let removedCount = 0;
  
  for (const filename of rootFiles) {
    // Skip files that should stay in root
    if (ROOT_FILES_TO_KEEP.includes(filename)) {
      log(`🔒 Keeping in root: ${filename}`, '\x1b[33m');
      continue;
    }
    
    // Check if file should be removed
    if (isPatternMatch(filename, REMOVE_PATTERNS)) {
      try {
        fs.unlinkSync(filename);
        log(`🗑️ Removed: ${filename}`, '\x1b[31m');
        removedCount++;
        continue;
      } catch (error) {
        log(`❌ Error removing ${filename}: ${error.message}`, '\x1b[31m');
      }
    }
    
    // Check for organized movement
    let moved = false;
    for (const [targetDir, patterns] of Object.entries(FILE_MOVEMENTS)) {
      if (isPatternMatch(filename, patterns)) {
        try {
          const targetPath = path.join(targetDir, filename);
          fs.renameSync(filename, targetPath);
          log(`📁 Moved: ${filename} → ${targetDir}`, '\x1b[32m');
          movedCount++;
          moved = true;
          break;
        } catch (error) {
          log(`❌ Error moving ${filename}: ${error.message}`, '\x1b[31m');
        }
      }
    }
    
    if (!moved && /\.(js|ts|cjs|mjs)$/.test(filename)) {
      // Archive remaining scripts
      try {
        const targetPath = path.join('archived/one-time-scripts/', filename);
        fs.renameSync(filename, targetPath);
        log(`📁 Archived: ${filename}`, '\x1b[35m');
        movedCount++;
      } catch (error) {
        log(`❌ Error archiving ${filename}: ${error.message}`, '\x1b[31m');
      }
    }
  }
  
  return { movedCount, removedCount };
}

async function organizeProject() {
  log('🚀 Starting professional project organization...', '\x1b[36m');
  
  const { movedCount, removedCount } = organizeFiles();
  
  // Final summary
  log('', '\x1b[0m');
  log('=== Project Organization Complete ===', '\x1b[36m');
  log(`📁 Files moved to organized structure: ${movedCount}`, '\x1b[32m');
  log(`🗑️ Temporary files removed: ${removedCount}`, '\x1b[31m');
  log('', '\x1b[0m');
  log('🎉 Project is now professionally organized!', '\x1b[32m');
  log('✅ Ready for clean deployment and future development', '\x1b[32m');
}

organizeProject().catch(error => {
  console.error(`\x1b[31m[ProjectOrganizer] Fatal error: ${error.message}\x1b[0m`);
  process.exit(1);
});