#!/usr/bin/env node

/**
 * WebSocket Architecture Audit Script
 * 
 * Comprehensive analysis of all WebSocket usage patterns across the codebase
 * to identify redundancy, dependencies, and consolidation opportunities.
 */

const fs = require('fs');
const path = require('path');

// Audit results structure
const auditResults = {
  totalFiles: 0,
  socketFiles: 0,
  patterns: {
    directConnection: [],
    serviceLayer: [],
    hookPattern: [],
    providerPattern: [],
    eventListeners: [],
    imports: [],
    legacy: [],
    broken: []
  },
  functionality: {},
  dependencies: {},
  duplicates: []
};

// WebSocket detection patterns
const patterns = {
  directConnection: /new\s+WebSocket\s*\(/g,
  wsUrl: /ws:\/\/|wss:\/\//g,
  socketImport: /import.*[Ww]eb[Ss]ocket|from.*websocket|require.*websocket/g,
  serviceUsage: /useWebSocket|WebSocketService|wsService|webSocketService/g,
  contextProvider: /WebSocketProvider|WebSocketContext|useWebSocketContext/g,
  eventHandlers: /\.onopen|\.onclose|\.onmessage|\.onerror|addEventListener.*message/g,
  socketSend: /\.send\s*\(|sendMessage|emit/g,
  connectionManagement: /\.connect\(|\.disconnect\(|\.close\(/g
};

// File analysis function
function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const analysis = {
      path: filePath,
      size: content.length,
      patterns: {},
      functionality: [],
      dependencies: [],
      isSocketFile: false
    };

    // Check each pattern
    Object.entries(patterns).forEach(([patternName, regex]) => {
      const matches = content.match(regex);
      if (matches) {
        analysis.patterns[patternName] = matches.length;
        analysis.isSocketFile = true;
      }
    });

    // Extract functionality clues
    const functionalityClues = [
      'task_update', 'form_submission', 'file_upload', 'tutorial_progress',
      'authentication', 'heartbeat', 'ping', 'pong', 'reconnect',
      'notification', 'status_update', 'real_time', 'live_update'
    ];

    functionalityClues.forEach(clue => {
      if (content.toLowerCase().includes(clue)) {
        analysis.functionality.push(clue);
      }
    });

    // Extract import dependencies
    const importMatches = content.match(/import.*from\s+['"`]([^'"`]+)['"`]/g);
    if (importMatches) {
      analysis.dependencies = importMatches
        .map(imp => imp.match(/from\s+['"`]([^'"`]+)['"`]/)?.[1])
        .filter(dep => dep && dep.includes('socket'))
        .filter(Boolean);
    }

    // Check if file seems active or legacy
    const lastModified = fs.statSync(filePath).mtime;
    const isOld = (Date.now() - lastModified.getTime()) > (90 * 24 * 60 * 60 * 1000); // 90 days
    
    if (isOld && analysis.isSocketFile) {
      analysis.suspectedLegacy = true;
    }

    return analysis;
  } catch (error) {
    return {
      path: filePath,
      error: error.message,
      isSocketFile: false
    };
  }
}

// Recursive directory walker
function walkDirectory(dir, callback) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules, .cache, and other unnecessary directories
      if (!['node_modules', '.cache', '.git', 'dist', 'build'].includes(file)) {
        walkDirectory(filePath, callback);
      }
    } else if (stat.isFile()) {
      // Only analyze relevant file types
      if (/\.(ts|tsx|js|jsx)$/.test(file)) {
        callback(filePath);
      }
    }
  });
}

// Main audit function
function runAudit() {
  console.log('🔍 Starting comprehensive WebSocket audit...\n');
  
  const startTime = Date.now();
  
  // Analyze all files
  ['client', 'server'].forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`📁 Analyzing ${dir}/ directory...`);
      
      walkDirectory(dir, (filePath) => {
        auditResults.totalFiles++;
        const analysis = analyzeFile(filePath);
        
        if (analysis.isSocketFile) {
          auditResults.socketFiles++;
          
          // Categorize by primary pattern
          if (analysis.patterns.directConnection) {
            auditResults.patterns.directConnection.push(analysis);
          }
          if (analysis.patterns.serviceUsage) {
            auditResults.patterns.serviceLayer.push(analysis);
          }
          if (analysis.patterns.contextProvider) {
            auditResults.patterns.providerPattern.push(analysis);
          }
          if (analysis.patterns.eventHandlers) {
            auditResults.patterns.eventListeners.push(analysis);
          }
          if (analysis.patterns.socketImport) {
            auditResults.patterns.imports.push(analysis);
          }
          if (analysis.suspectedLegacy) {
            auditResults.patterns.legacy.push(analysis);
          }
          if (analysis.error) {
            auditResults.patterns.broken.push(analysis);
          }
          
          // Store functionality mapping
          analysis.functionality.forEach(func => {
            if (!auditResults.functionality[func]) {
              auditResults.functionality[func] = [];
            }
            auditResults.functionality[func].push(filePath);
          });
          
          // Store dependency mapping
          analysis.dependencies.forEach(dep => {
            if (!auditResults.dependencies[dep]) {
              auditResults.dependencies[dep] = [];
            }
            auditResults.dependencies[dep].push(filePath);
          });
        }
        
        // Progress indicator
        if (auditResults.totalFiles % 100 === 0) {
          process.stdout.write(`  📊 Processed ${auditResults.totalFiles} files...\r`);
        }
      });
    }
  });
  
  console.log(`\n✅ Audit complete! Processed ${auditResults.totalFiles} files in ${Date.now() - startTime}ms\n`);
  
  // Generate report
  generateReport();
}

// Report generation
function generateReport() {
  console.log('📋 WEBSOCKET ARCHITECTURE AUDIT REPORT');
  console.log('=====================================\n');
  
  console.log(`📈 OVERVIEW:`);
  console.log(`  Total files analyzed: ${auditResults.totalFiles}`);
  console.log(`  Files with WebSocket usage: ${auditResults.socketFiles}`);
  console.log(`  Percentage of codebase: ${((auditResults.socketFiles / auditResults.totalFiles) * 100).toFixed(1)}%\n`);
  
  console.log(`🔌 CONNECTION PATTERNS:`);
  Object.entries(auditResults.patterns).forEach(([pattern, files]) => {
    if (files.length > 0) {
      console.log(`  ${pattern}: ${files.length} files`);
    }
  });
  console.log();
  
  console.log(`⚙️  FUNCTIONALITY DISTRIBUTION:`);
  Object.entries(auditResults.functionality).forEach(([func, files]) => {
    console.log(`  ${func}: ${files.length} implementations`);
  });
  console.log();
  
  console.log(`📦 DEPENDENCY ANALYSIS:`);
  Object.entries(auditResults.dependencies).forEach(([dep, files]) => {
    console.log(`  ${dep}: used by ${files.length} files`);
  });
  console.log();
  
  // Identify potential duplicates
  const functionalityDuplicates = Object.entries(auditResults.functionality)
    .filter(([func, files]) => files.length > 1)
    .sort((a, b) => b[1].length - a[1].length);
  
  if (functionalityDuplicates.length > 0) {
    console.log(`🔄 POTENTIAL DUPLICATES (Multiple implementations of same functionality):`);
    functionalityDuplicates.forEach(([func, files]) => {
      console.log(`  ${func}: ${files.length} implementations`);
      files.forEach(file => console.log(`    - ${file}`));
    });
    console.log();
  }
  
  // Consolidation recommendations
  console.log(`💡 CONSOLIDATION RECOMMENDATIONS:`);
  
  const directConnections = auditResults.patterns.directConnection.length;
  if (directConnections > 0) {
    console.log(`  ⚠️  Found ${directConnections} direct WebSocket connections - should be consolidated`);
  }
  
  const multipleServices = Object.keys(auditResults.dependencies).length;
  if (multipleServices > 1) {
    console.log(`  ⚠️  Found ${multipleServices} different WebSocket services - should use single service`);
  }
  
  const legacyFiles = auditResults.patterns.legacy.length;
  if (legacyFiles > 0) {
    console.log(`  🗑️  Found ${legacyFiles} potentially legacy files - review for removal`);
  }
  
  console.log(`\n📄 Detailed analysis saved to: websocket-audit-results.json`);
  
  // Save detailed results
  fs.writeFileSync(
    'websocket-audit-results.json', 
    JSON.stringify(auditResults, null, 2)
  );
}

// Run the audit
runAudit();