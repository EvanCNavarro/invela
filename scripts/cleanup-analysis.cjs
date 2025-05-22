/**
 * Repository Cleanup Analysis Tool
 * 
 * This script performs comprehensive dependency analysis to identify safe-to-remove files
 * by scanning all application source code for imports, requires, and references.
 * 
 * Follows application patterns:
 * - Uses consistent logging format matching server/utils/logger.ts
 * - Implements proper error handling like other utility scripts
 * - Creates structured output for decision-making
 */

const fs = require('fs');
const path = require('path');

/**
 * Application directories that contain active source code
 * These are the authoritative sources for determining file usage
 */
const SOURCE_DIRECTORIES = [
  'client/src',
  'server',
  'db',
  'types'
];

/**
 * File extensions to scan for dependencies
 * Matches the application's technology stack
 */
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json'];

/**
 * Logging utility matching application's logger pattern
 */
function log(level, module, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logData = Object.keys(data).length > 0 ? JSON.stringify(data) : '';
  console.log(`[${timestamp}] [${level.toUpperCase()}] [${module}] ${message} ${logData}`);
}

/**
 * Get all root-level files that need analysis
 * Filters out directories and obvious system files
 */
function getRootFilesToAnalyze() {
  try {
    const files = fs.readdirSync('.');
    return files.filter(file => {
      const stat = fs.statSync(file);
      if (stat.isDirectory()) return false;
      
      // Skip obvious system files
      const systemFiles = ['.env', '.gitignore', '.npmrc', '.replit', 'package.json', 'package-lock.json'];
      if (systemFiles.includes(file)) return false;
      
      return true;
    });
  } catch (error) {
    log('error', 'CleanupAnalysis', 'Failed to read root directory', { error: error.message });
    return [];
  }
}

/**
 * Recursively get all source files in specified directories
 * Returns full paths for dependency scanning
 */
function getSourceFiles(directories) {
  const sourceFiles = [];
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      log('warn', 'CleanupAnalysis', `Source directory not found: ${dir}`);
      return;
    }
    
    function scanDirectory(currentDir) {
      try {
        const items = fs.readdirSync(currentDir);
        
        items.forEach(item => {
          const fullPath = path.join(currentDir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            scanDirectory(fullPath);
          } else if (SOURCE_EXTENSIONS.includes(path.extname(item))) {
            sourceFiles.push(fullPath);
          }
        });
      } catch (error) {
        log('warn', 'CleanupAnalysis', `Failed to scan directory: ${currentDir}`, { error: error.message });
      }
    }
    
    scanDirectory(dir);
  });
  
  return sourceFiles;
}

/**
 * Search for references to a specific file in source code
 * Uses multiple patterns to catch imports, requires, and path references
 */
function findFileReferences(filename, sourceFiles) {
  const references = [];
  const baseFilename = path.parse(filename).name;
  
  const patterns = [
    // ES6 imports
    new RegExp(`import.*['"\`].*${filename}.*['"\`]`, 'g'),
    new RegExp(`import.*['"\`].*${baseFilename}.*['"\`]`, 'g'),
    // CommonJS requires
    new RegExp(`require\\(['"\`].*${filename}.*['"\`]\\)`, 'g'),
    new RegExp(`require\\(['"\`].*${baseFilename}.*['"\`]\\)`, 'g'),
    // Dynamic imports
    new RegExp(`import\\(['"\`].*${filename}.*['"\`]\\)`, 'g'),
    // Path references in configs
    new RegExp(`['"\`][./]*${filename}['"\`]`, 'g')
  ];
  
  sourceFiles.forEach(sourceFile => {
    try {
      const content = fs.readFileSync(sourceFile, 'utf8');
      
      patterns.forEach((pattern, index) => {
        const matches = content.match(pattern);
        if (matches) {
          references.push({
            sourceFile,
            pattern: ['ES6 import', 'ES6 import (base)', 'CommonJS require', 'CommonJS require (base)', 'Dynamic import', 'Path reference'][index],
            matches: matches.slice(0, 2)
          });
        }
      });
    } catch (error) {
      log('warn', 'CleanupAnalysis', `Failed to read source file: ${sourceFile}`, { error: error.message });
    }
  });
  
  return references;
}

/**
 * Analyze dependency usage for all root files
 * Creates comprehensive report of what's safe to remove
 */
function analyzeDependencies() {
  log('info', 'CleanupAnalysis', 'Starting comprehensive dependency analysis...');
  
  const rootFiles = getRootFilesToAnalyze();
  const sourceFiles = getSourceFiles(SOURCE_DIRECTORIES);
  
  log('info', 'CleanupAnalysis', 'Analysis scope determined', { 
    rootFiles: rootFiles.length,
    sourceFiles: sourceFiles.length,
    directories: SOURCE_DIRECTORIES.length
  });
  
  const analysisResults = {
    safeToRemove: [],
    hasReferences: [],
    analysisDate: new Date().toISOString(),
    totalFiles: rootFiles.length
  };
  
  rootFiles.forEach((file, index) => {
    const progress = Math.round(((index + 1) / rootFiles.length) * 100);
    
    const references = findFileReferences(file, sourceFiles);
    
    if (references.length === 0) {
      analysisResults.safeToRemove.push(file);
      log('info', 'CleanupAnalysis', `✅ Safe to remove: ${file}`, { progress: `${progress}%` });
    } else {
      analysisResults.hasReferences.push({
        file,
        references: references.length,
        details: references
      });
      log('warn', 'CleanupAnalysis', `⚠️  Has references: ${file}`, { progress: `${progress}%`, references: references.length });
    }
  });
  
  return analysisResults;
}

/**
 * Main execution function
 */
async function main() {
  try {
    log('info', 'CleanupAnalysis', 'Repository cleanup analysis started');
    
    const results = analyzeDependencies();
    
    // Save report for review
    const reportPath = 'cleanup-analysis-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    
    log('info', 'CleanupAnalysis', 'Analysis complete', { 
      reportSaved: reportPath,
      safeToRemove: results.safeToRemove.length,
      requiresReview: results.hasReferences.length
    });
    
    console.log('\n=== CLEANUP ANALYSIS SUMMARY ===');
    console.log(`✅ Safe to remove: ${results.safeToRemove.length} files`);
    console.log(`⚠️  Requires review: ${results.hasReferences.length} files`);
    console.log(`📄 Detailed report: ${reportPath}`);
    
    return results;
    
  } catch (error) {
    log('error', 'CleanupAnalysis', 'Analysis failed', { error: error.message });
    throw error;
  }
}

module.exports = { analyzeDependencies, main };