/**
 * Tutorial Implementation Checker
 * 
 * This script scans the codebase to check if all pages have properly
 * implemented the TutorialManager component.
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);

// ANSI color codes for better readability
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
};

// Enhanced logging function for better readability
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// List of pages to exclude
const EXCLUDED_PAGES = [
  'task-center-page',
  'form-field',
  'TaskCenter',
  'index.tsx',
  'landing',
  'auth',
  'onboarding',
  'login-page',
];

/**
 * Recursive function to get all files in a directory
 */
async function getFiles(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  
  const files = await Promise.all(
    entries.map(entry => {
      const entryPath = path.join(dirPath, entry.name);
      return entry.isDirectory() ? getFiles(entryPath) : entryPath;
    })
  );
  
  return files.flat();
}

/**
 * Check if a file should be analyzed
 */
function shouldAnalyzeFile(filePath) {
  // Only analyze TypeScript/React files
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.jsx')) {
    return false;
  }
  
  // Skip excluded pages
  if (EXCLUDED_PAGES.some(excluded => filePath.includes(excluded))) {
    return false;
  }
  
  // Skip backup/new files
  if (filePath.endsWith('.new') || filePath.endsWith('.bak') || filePath.endsWith('.temp')) {
    return false;
  }
  
  return true;
}

/**
 * Extract page information from file
 */
async function extractPageInfo(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    
    // Check if this is a page component
    const isPage = content.includes('export default function') && 
                   (content.includes('<DashboardLayout') || content.includes('return ('));
    
    if (!isPage) {
      return null;
    }
    
    // Extract info about tutorial implementation
    const importsTutorialManager = content.includes('import { TutorialManager }') || 
                                   content.includes('import {TutorialManager}');
    const usesTutorialManager = content.includes('<TutorialManager');
    
    // Extract the tab name if possible
    let tabName = null;
    const tabNameMatch = content.match(/<TutorialManager[^>]*tabName=["']([^"']+)["']/);
    if (tabNameMatch) {
      tabName = tabNameMatch[1];
    }
    
    // Get the page name from the file name
    const fileName = path.basename(filePath);
    const pageName = fileName.replace(/\.tsx$|\.jsx$/, '');
    
    return {
      filePath,
      pageName,
      importsTutorialManager,
      usesTutorialManager,
      tabName,
      implementation: importsTutorialManager && usesTutorialManager ? 'complete' : 
                     importsTutorialManager ? 'partial-import-only' : 
                     usesTutorialManager ? 'partial-use-only' : 'missing',
    };
  } catch (error) {
    log(`Error analyzing ${filePath}: ${error.message}`, colors.red);
    return null;
  }
}

/**
 * Main function to scan the project
 */
async function scanProject() {
  log(`\n${colors.bright}${colors.bgBlue}${colors.white} TUTORIAL IMPLEMENTATION CHECK ${colors.reset}\n`);
  
  // Get all pages in the project
  const pagesDir = path.join('client', 'src', 'pages');
  log(`Scanning ${pagesDir} for page components...`, colors.cyan);
  
  try {
    const allFiles = await getFiles(pagesDir);
    const relevantFiles = allFiles.filter(shouldAnalyzeFile);
    
    log(`Found ${relevantFiles.length} relevant files to analyze.\n`, colors.cyan);
    
    // Analyze each file
    const pageAnalysis = [];
    for (const file of relevantFiles) {
      const pageInfo = await extractPageInfo(file);
      if (pageInfo) {
        pageAnalysis.push(pageInfo);
      }
    }
    
    // Show results
    const implementationStats = {
      complete: pageAnalysis.filter(p => p.implementation === 'complete').length,
      partialImportOnly: pageAnalysis.filter(p => p.implementation === 'partial-import-only').length,
      partialUseOnly: pageAnalysis.filter(p => p.implementation === 'partial-use-only').length,
      missing: pageAnalysis.filter(p => p.implementation === 'missing').length,
      total: pageAnalysis.length
    };
    
    log(`\n${colors.bright}Implementation Summary:${colors.reset}`);
    log(`${colors.green}✓ Complete implementations:${colors.reset} ${implementationStats.complete} / ${implementationStats.total}`);
    log(`${colors.yellow}⚠ Partial (import only):${colors.reset} ${implementationStats.partialImportOnly}`);
    log(`${colors.yellow}⚠ Partial (use only):${colors.reset} ${implementationStats.partialUseOnly}`);
    log(`${colors.red}✗ Missing implementations:${colors.reset} ${implementationStats.missing}`);
    
    // Show compliant pages
    log(`\n${colors.bright}${colors.green}Pages with complete implementation:${colors.reset}`);
    pageAnalysis
      .filter(p => p.implementation === 'complete')
      .forEach(page => {
        log(`  ${page.pageName} ${colors.dim}(${page.tabName || 'unnamed tab'})${colors.reset}`);
      });
    
    // Show non-compliant pages
    if (implementationStats.partialImportOnly + implementationStats.partialUseOnly + implementationStats.missing > 0) {
      log(`\n${colors.bright}${colors.red}Pages needing attention:${colors.reset}`);
      
      pageAnalysis
        .filter(p => p.implementation !== 'complete')
        .forEach(page => {
          const issueColor = page.implementation === 'missing' ? colors.red : colors.yellow;
          log(`  ${issueColor}${page.pageName}${colors.reset} - ${page.implementation}`);
          log(`    ${colors.dim}${page.filePath}${colors.reset}`);
          
          if (page.implementation === 'partial-import-only') {
            log(`    ✓ Imports TutorialManager, but doesn't use it in JSX`);
          } else if (page.implementation === 'partial-use-only') {
            log(`    ✓ Uses TutorialManager, but without proper import`);
          }
        });
    }
    
    // Show tab names being used
    log(`\n${colors.bright}Tab names in use:${colors.reset}`);
    const tabNames = pageAnalysis
      .filter(p => p.tabName)
      .map(p => p.tabName);
    
    // Count occurrences of each tab name
    const tabNameCounts = {};
    tabNames.forEach(tabName => {
      tabNameCounts[tabName] = (tabNameCounts[tabName] || 0) + 1;
    });
    
    // Display unique tab names
    Object.entries(tabNameCounts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([tabName, count]) => {
        log(`  ${tabName}${count > 1 ? colors.yellow + ' (used in ' + count + ' places)' + colors.reset : ''}`);
      });
    
  } catch (error) {
    log(`Error scanning project: ${error.message}`, colors.red);
    console.error(error);
  }
}

// Run the scanner
scanProject().catch(console.error);