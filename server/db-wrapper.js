/**
 * db-wrapper.js
 * 
 * This module provides a bridge between CommonJS and ES modules for database access.
 * It attempts to load the TypeScript database modules and falls back to a mock implementation
 * if the TypeScript modules cannot be loaded (common in development environments).
 */

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const workspaceRoot = path.resolve(__dirname, '../');

console.log('[DB Wrapper] Starting initialization');
console.log('[DB Wrapper] Workspace root:', workspaceRoot);

// Use mock database by default
let useMockDb = false;
let mockDb = null;

// Helper function to check if a file exists
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    console.error(`[DB Wrapper] Error checking if file exists (${filePath}):`, error);
    return false;
  }
}

// Try to dynamically import an ES module
async function importEsModule(modulePath) {
  console.log(`[DB Wrapper] Attempting to import: ${modulePath}`);
  
  try {
    // Check if the file exists
    if (!fileExists(modulePath)) {
      console.error(`[DB Wrapper] File does not exist: ${modulePath}`);
      return null;
    }
    
    // Convert path to URL for import()
    const moduleUrl = pathToFileURL(modulePath).href;
    console.log(`[DB Wrapper] Module URL: ${moduleUrl}`);
    
    // Try to import the module
    const module = await import(moduleUrl);
    console.log(`[DB Wrapper] Successfully imported: ${modulePath}`);
    return module;
  } catch (error) {
    console.error(`[DB Wrapper] Error importing module (${modulePath}):`, error);
    return null;
  }
}

// Check for JavaScript equivalent of a TypeScript file
function findJavaScriptEquivalent(tsPath) {
  const jsPath = tsPath.replace(/\.ts$/, '.js');
  if (fileExists(jsPath)) {
    console.log(`[DB Wrapper] Found JavaScript equivalent: ${jsPath}`);
    return jsPath;
  }
  
  // Also check for compiled output in potential dist/build folders
  const baseName = path.basename(jsPath);
  const dirName = path.dirname(tsPath);
  
  const distPath = path.join(dirName, 'dist', baseName);
  if (fileExists(distPath)) {
    console.log(`[DB Wrapper] Found compiled JavaScript in dist: ${distPath}`);
    return distPath;
  }
  
  const buildPath = path.join(dirName, 'build', baseName);
  if (fileExists(buildPath)) {
    console.log(`[DB Wrapper] Found compiled JavaScript in build: ${buildPath}`);
    return buildPath;
  }
  
  console.log(`[DB Wrapper] No JavaScript equivalent found for: ${tsPath}`);
  return null;
}

// Safely import a module, falling back to JavaScript equivalent or mock
async function safeImport(modulePath) {
  let module = await importEsModule(modulePath);
  
  if (!module) {
    // Try JavaScript equivalent
    const jsPath = findJavaScriptEquivalent(modulePath);
    if (jsPath) {
      module = await importEsModule(jsPath);
    }
  }
  
  if (!module) {
    console.log(`[DB Wrapper] Could not import module: ${modulePath}, using mock database`);
    useMockDb = true;
    
    // Lazy load the mock database module
    if (!mockDb) {
      try {
        mockDb = require('./utils/mock-db');
        console.log('[DB Wrapper] Successfully loaded mock database module');
      } catch (mockError) {
        console.error('[DB Wrapper] Error loading mock database module:', mockError);
        throw new Error('Failed to load both actual and mock database modules');
      }
    }
    
    return mockDb;
  }
  
  return module;
}

/**
 * Initialize the database and return a database bridge object
 */
async function initialize() {
  console.log('[DB Wrapper] Initializing database bridge');
  
  try {
    // Define paths to database modules
    const dbPath = path.join(workspaceRoot, 'db', 'index.ts');
    const schemaPath = path.join(workspaceRoot, 'db', 'schema.ts');
    
    console.log(`[DB Wrapper] Database path: ${dbPath}`);
    console.log(`[DB Wrapper] Schema path: ${schemaPath}`);
    
    // Try to import the database modules
    const dbModule = await safeImport(dbPath);
    const schemaModule = await safeImport(schemaPath);
    
    if (useMockDb) {
      console.log('[DB Wrapper] Using mock database implementation');
      await mockDb.initialize();
      
      return {
        // Return the mock module interface
        pool: mockDb.pool,
        db: mockDb,
        executeWithNeonRetry: mockDb.executeWithNeonRetry,
        queryWithNeonRetry: mockDb.queryWithNeonRetry,
        ensureValue: mockDb.ensureValue,
        schemas: {
          companies: mockDb.companies,
          users: mockDb.users,
          relationships: mockDb.relationships,
          documents: mockDb.documents
        }
      };
    }
    
    // If we have real modules, use them
    console.log('[DB Wrapper] Using actual database implementation');
    
    // Initialize the real database
    await dbModule.default.initialize();
    
    return {
      pool: dbModule.default.pool,
      db: dbModule.default.db,
      executeWithNeonRetry: dbModule.default.executeWithNeonRetry,
      queryWithNeonRetry: dbModule.default.queryWithNeonRetry,
      ensureValue: dbModule.default.ensureValue,
      schemas: {
        companies: schemaModule.companies,
        users: schemaModule.users,
        relationships: schemaModule.relationships,
        documents: schemaModule.documents
      }
    };
  } catch (error) {
    console.error('[DB Wrapper] Fatal error during database initialization:', error);
    throw error;
  }
}

module.exports = {
  initialize
}; 