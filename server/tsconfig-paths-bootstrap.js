/**
 * tsconfig-paths-bootstrap.js - Runtime path resolution for TypeScript aliases
 * 
 * This file sets up runtime path resolution for TypeScript path aliases like @db/* and @shared/*
 * that were defined in tsconfig.json. It ensures these path aliases work correctly at runtime
 * after TypeScript compilation, allowing for cleaner imports across the application.
 * 
 * Best practices implemented:
 * 1. Clear separation between TypeScript compilation and runtime concerns
 * 2. Robust error handling for missing directories and files
 * 3. Detailed logging for easier troubleshooting
 * 4. Proper cleanup on process exit
 * 5. Support for both direct and wildcard path aliases
 */

const tsConfigPaths = require('tsconfig-paths');
const path = require('path');
const fs = require('fs');

// Get the workspace root directory (1 level up from server/)
const baseUrl = path.join(__dirname, '..');
console.log('[Path Resolution] Base URL:', baseUrl);

// Check existence of key directories and files to provide helpful diagnostics
// This helps identify problems early during server startup
function checkPathExistence() {
  try {
    // Check existence of source directories
    const dbDirExists = fs.existsSync(path.join(baseUrl, 'db'));
    const sharedDirExists = fs.existsSync(path.join(baseUrl, 'shared'));
    
    // Check existence of compiled output directory
    const distDirExists = fs.existsSync(path.join(baseUrl, 'dist'));
    const distDbDirExists = distDirExists && fs.existsSync(path.join(baseUrl, 'dist', 'db'));
    const distSharedDirExists = distDirExists && fs.existsSync(path.join(baseUrl, 'dist', 'shared'));

    console.log('[Path Resolution] Directory checks:');
    console.log('- DB source directory exists:', dbDirExists);
    console.log('- Shared source directory exists:', sharedDirExists);
    console.log('- Dist directory exists:', distDirExists);
    console.log('- Compiled DB directory exists:', distDbDirExists);
    console.log('- Compiled Shared directory exists:', distSharedDirExists);

    // Warn if compiled directories don't exist
    if (!distDirExists) {
      console.warn('[Path Resolution] WARNING: dist/ directory not found. Has the TypeScript been compiled?');
      console.warn('                  Run "npm run build" to compile TypeScript files.');
    } else if (!distDbDirExists || !distSharedDirExists) {
      console.warn('[Path Resolution] WARNING: Some compiled directories are missing.');
      console.warn('                  This might cause runtime errors when importing from these paths.');
    }
  } catch (error) {
    console.error('[Path Resolution] Error checking path existence:', error);
    // Continue execution despite errors in diagnostics
  }
}

// Run path existence check
checkPathExistence();

/**
 * Define path mappings that match tsconfig.json
 * These mappings need to be kept in sync with the paths in tsconfig.json
 * For compiled JS files, we need to point to the dist directory
 */
const sourcePathMappings = {
  '@db': [path.join(baseUrl, 'db')],
  '@db/*': [path.join(baseUrl, 'db/*')],
  '@shared/*': [path.join(baseUrl, 'shared/*')]
};

/**
 * Define path mappings for compiled JavaScript files
 * These are used when importing from compiled code
 */
const compiledPathMappings = {
  '@db': [path.join(baseUrl, 'dist/db')],
  '@db/*': [path.join(baseUrl, 'dist/db/*')],
  '@shared/*': [path.join(baseUrl, 'dist/shared/*')]
};

// Determine which path mappings to use based on environment
// In production, we should use the compiled paths
const isProduction = process.env.NODE_ENV === 'production';
const pathsToRegister = isProduction ? compiledPathMappings : sourcePathMappings;

console.log(`[Path Resolution] Using ${isProduction ? 'production' : 'development'} path mappings`);

// Create an additional mapping helper for direct node requires
// This helps modules find the absolute paths based on aliases
const explicitPathMappings = {};
for (const [alias, targets] of Object.entries(pathsToRegister)) {
  if (alias.endsWith('/*')) {
    // Handle wildcard paths by removing the /* suffix
    const aliasBase = alias.slice(0, -2);
    const targetBase = targets[0].slice(0, -2);
    explicitPathMappings[aliasBase] = targetBase;
  } else {
    // Handle direct paths
    explicitPathMappings[alias] = targets[0];
  }
}

// Make the explicit mappings available for external modules if needed
module.exports = explicitPathMappings;

// Register paths for CommonJS module resolution
// This is the main functionality that enables path aliases at runtime
try {
  const cleanup = tsConfigPaths.register({ 
    baseUrl, 
    paths: pathsToRegister,
    // Add match-all pattern to handle subdirectories properly
    addMatchAll: true
  });

  // Clean up paths registration on process exit to prevent memory leaks
  process.on('exit', () => {
    console.log('[Path Resolution] Cleaning up path registrations');
    cleanup();
  });

  console.log('[Path Resolution] Successfully registered path aliases:', 
    Object.keys(pathsToRegister).join(', '));
} catch (error) {
  console.error('[Path Resolution] Failed to register path aliases:', error);
  console.error('[Path Resolution] Server may experience import errors');
} 