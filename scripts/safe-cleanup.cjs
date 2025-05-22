/**
 * Safe Repository Cleanup Tool
 * 
 * OODA Framework Implementation:
 * - Observe: Scan and categorize all root-level files
 * - Orient: Analyze dependencies and usage patterns
 * - Decide: Create prioritized cleanup plan
 * - Act: Execute safe, reversible cleanup operations
 * 
 * KISS Principle: Simple, straightforward cleanup with safety nets
 */

const fs = require('fs');
const path = require('path');

/**
 * Configuration for safe cleanup operations
 */
const CLEANUP_CONFIG = {
  // Backup directory for reversible operations
  backupDir: '.cleanup-backup',
  
  // Obviously safe patterns (no dependency checking needed)
  obviouslySafePatterns: [
    /^fix-.*\.(js|ts|cjs)$/,           // Temporary fix scripts
    /^direct-.*\.(js|ts|cjs)$/,       // Direct operation scripts
    /^check-.*\.(js|ts|cjs)$/,        // Diagnostic scripts
    /^force-.*\.(js|ts|cjs)$/,        // Emergency fix scripts
    /^temp-.*\.(js|ts|cjs)$/,         // Temporary files
    /^test-.*\.(js|ts|cjs)$/,         // Test scripts
    /.*-backup\.(js|ts|cjs)$/,        // Backup files
    /.*\.backup$/,                    // Any backup files
    /^demo-.*\.(js|ts|cjs)$/,         // Demo scripts
    /^populate-.*\.(js|ts|cjs)$/,     // Data population scripts
  ],
  
  // Require dependency check (might be imported)
  requiresAnalysis: [
    /^deployment-.*\.(js|ts|cjs)$/,   // Deployment related
    /^database-.*\.(js|ts|cjs)$/,     // Database utilities
    /^create-.*\.(js|ts|cjs)$/,       // Creation scripts
  ],
  
  // Never touch these files
  protected: [
    'package.json', 'package-lock.json', '.env', '.gitignore',
    'vite.config.ts', 'drizzle.config.ts', '.replit', '.npmrc'
  ]
};

/**
 * Logging utility matching application patterns
 */
function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const dataStr = Object.keys(data).length > 0 ? ` ${JSON.stringify(data)}` : '';
  console.log(`[${timestamp}] [${level.toUpperCase()}] [SafeCleanup] ${message}${dataStr}`);
}

/**
 * OBSERVE: Scan and categorize all root-level files
 */
function observeRootFiles() {
  log('info', 'OBSERVE: Scanning root-level files...');
  
  const files = fs.readdirSync('.');
  const categories = {
    obviouslySafe: [],
    requiresAnalysis: [],
    protected: [],
    unknown: []
  };
  
  files.forEach(file => {
    const stat = fs.statSync(file);
    if (stat.isDirectory()) return;
    
    // Check protected files first
    if (CLEANUP_CONFIG.protected.includes(file)) {
      categories.protected.push(file);
      return;
    }
    
    // Check obviously safe patterns
    const isSafe = CLEANUP_CONFIG.obviouslySafePatterns.some(pattern => pattern.test(file));
    if (isSafe) {
      categories.obviouslySafe.push(file);
      return;
    }
    
    // Check requires analysis patterns
    const requiresCheck = CLEANUP_CONFIG.requiresAnalysis.some(pattern => pattern.test(file));
    if (requiresCheck) {
      categories.requiresAnalysis.push(file);
      return;
    }
    
    // Everything else
    categories.unknown.push(file);
  });
  
  log('info', 'OBSERVE: File categorization complete', {
    obviouslySafe: categories.obviouslySafe.length,
    requiresAnalysis: categories.requiresAnalysis.length,
    protected: categories.protected.length,
    unknown: categories.unknown.length
  });
  
  return categories;
}

/**
 * ORIENT: Check if files are actually referenced in source code
 */
function orientDependencyCheck(files) {
  log('info', 'ORIENT: Checking dependencies for analysis-required files...');
  
  const sourceDirectories = ['client/src', 'server', 'db', 'types'];
  const sourceFiles = [];
  
  // Collect all source files
  sourceDirectories.forEach(dir => {
    if (!fs.existsSync(dir)) return;
    
    function scanDir(currentDir) {
      const items = fs.readdirSync(currentDir);
      items.forEach(item => {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (/\.(ts|tsx|js|jsx)$/.test(item)) {
          sourceFiles.push(fullPath);
        }
      });
    }
    
    scanDir(dir);
  });
  
  const analysisResults = {};
  
  files.forEach(file => {
    const baseFilename = path.parse(file).name;
    let hasReferences = false;
    
    // Search for imports/requires
    for (const sourceFile of sourceFiles) {
      try {
        const content = fs.readFileSync(sourceFile, 'utf8');
        
        const patterns = [
          new RegExp(`import.*['"\`].*${file}.*['"\`]`, 'g'),
          new RegExp(`import.*['"\`].*${baseFilename}.*['"\`]`, 'g'),
          new RegExp(`require\\(['"\`].*${file}.*['"\`]\\)`, 'g'),
          new RegExp(`require\\(['"\`].*${baseFilename}.*['"\`]\\)`, 'g'),
        ];
        
        if (patterns.some(pattern => content.match(pattern))) {
          hasReferences = true;
          break;
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }
    
    analysisResults[file] = hasReferences;
    log('info', `ORIENT: ${file} - ${hasReferences ? 'HAS REFERENCES' : 'NO REFERENCES'}`);
  });
  
  return analysisResults;
}

/**
 * DECIDE: Create safe cleanup plan based on analysis
 */
function decideCleanupPlan(categories, dependencyResults) {
  log('info', 'DECIDE: Creating cleanup execution plan...');
  
  const plan = {
    phase1_obviouslySafe: categories.obviouslySafe,
    phase2_analyzedSafe: [],
    phase3_requiresReview: [],
    totalFilesToCleanup: 0
  };
  
  // Add files that passed dependency analysis
  categories.requiresAnalysis.forEach(file => {
    if (!dependencyResults[file]) {
      plan.phase2_analyzedSafe.push(file);
    } else {
      plan.phase3_requiresReview.push(file);
    }
  });
  
  // Add unknown files to review (conservative approach)
  plan.phase3_requiresReview.push(...categories.unknown);
  
  plan.totalFilesToCleanup = plan.phase1_obviouslySafe.length + plan.phase2_analyzedSafe.length;
  
  log('info', 'DECIDE: Cleanup plan created', {
    phase1Count: plan.phase1_obviouslySafe.length,
    phase2Count: plan.phase2_analyzedSafe.length,
    reviewCount: plan.phase3_requiresReview.length,
    totalSafeCleanup: plan.totalFilesToCleanup
  });
  
  return plan;
}

/**
 * ACT: Execute safe cleanup with backup safety net
 */
function actExecuteCleanup(plan, dryRun = false) {
  log('info', `ACT: ${dryRun ? 'DRY RUN' : 'EXECUTING'} safe cleanup plan...`);
  
  if (!dryRun) {
    // Create backup directory
    if (!fs.existsSync(CLEANUP_CONFIG.backupDir)) {
      fs.mkdirSync(CLEANUP_CONFIG.backupDir);
      log('info', `ACT: Created backup directory: ${CLEANUP_CONFIG.backupDir}`);
    }
  }
  
  let cleanedCount = 0;
  
  // Phase 1: Obviously safe files
  log('info', 'ACT: Phase 1 - Cleaning obviously safe files...');
  plan.phase1_obviouslySafe.forEach(file => {
    if (dryRun) {
      log('info', `ACT: [DRY RUN] Would move to backup: ${file}`);
    } else {
      try {
        const backupPath = path.join(CLEANUP_CONFIG.backupDir, file);
        fs.renameSync(file, backupPath);
        log('info', `ACT: Moved to backup: ${file}`);
        cleanedCount++;
      } catch (error) {
        log('error', `ACT: Failed to move ${file}`, { error: error.message });
      }
    }
  });
  
  // Phase 2: Analyzed safe files
  log('info', 'ACT: Phase 2 - Cleaning analyzed safe files...');
  plan.phase2_analyzedSafe.forEach(file => {
    if (dryRun) {
      log('info', `ACT: [DRY RUN] Would move to backup: ${file}`);
    } else {
      try {
        const backupPath = path.join(CLEANUP_CONFIG.backupDir, file);
        fs.renameSync(file, backupPath);
        log('info', `ACT: Moved to backup: ${file}`);
        cleanedCount++;
      } catch (error) {
        log('error', `ACT: Failed to move ${file}`, { error: error.message });
      }
    }
  });
  
  const results = {
    dryRun,
    cleanedCount: dryRun ? plan.totalFilesToCleanup : cleanedCount,
    backupLocation: CLEANUP_CONFIG.backupDir,
    requiresReview: plan.phase3_requiresReview
  };
  
  log('info', 'ACT: Cleanup execution complete', results);
  return results;
}

/**
 * Main execution function implementing OODA framework
 */
function main() {
  try {
    log('info', 'Starting OODA-based safe cleanup process...');
    
    // OBSERVE
    const categories = observeRootFiles();
    
    // ORIENT 
    const dependencyResults = orientDependencyCheck(categories.requiresAnalysis);
    
    // DECIDE
    const plan = decideCleanupPlan(categories, dependencyResults);
    
    // ACT (dry run first)
    log('info', '=== DRY RUN EXECUTION ===');
    const dryRunResults = actExecuteCleanup(plan, true);
    
    console.log('\n=== SAFE CLEANUP SUMMARY ===');
    console.log(`✅ Ready to clean: ${dryRunResults.cleanedCount} files`);
    console.log(`⚠️  Requires review: ${dryRunResults.requiresReview.length} files`);
    console.log('\nTo execute cleanup: node scripts/safe-cleanup.cjs --execute');
    console.log('To restore: mv .cleanup-backup/* ./');
    
    // Show files requiring review
    if (dryRunResults.requiresReview.length > 0) {
      console.log('\nFiles requiring manual review:');
      dryRunResults.requiresReview.forEach(file => console.log(`  - ${file}`));
    }
    
    return dryRunResults;
    
  } catch (error) {
    log('error', 'Cleanup process failed', { error: error.message });
    throw error;
  }
}

// Execute based on command line args
const shouldExecute = process.argv.includes('--execute');
if (shouldExecute) {
  // Real execution
  const categories = observeRootFiles();
  const dependencyResults = orientDependencyCheck(categories.requiresAnalysis);
  const plan = decideCleanupPlan(categories, dependencyResults);
  actExecuteCleanup(plan, false);
} else {
  // Dry run
  main();
}

module.exports = { observeRootFiles, orientDependencyCheck, decideCleanupPlan, actExecuteCleanup };