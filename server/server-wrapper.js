/**
 * server-wrapper.js
 * 
 * This is a JavaScript wrapper that loads the TypeScript server using dynamic imports.
 * It resolves module system conflicts by using dynamic ES module imports.
 */

// First, register ts-node to handle TypeScript files
(async function() {
  try {
    console.log('Server wrapper: bootstrapping application...');
    
    // Register path aliases first - this is critical
    console.log('Server wrapper: registering path aliases...');
    require('./tsconfig-paths-bootstrap.js');
    
    // Initialize ts-node with proper options
    console.log('Server wrapper: registering ts-node...');
    require('ts-node').register({
      transpileOnly: true,
      compilerOptions: {
        module: 'CommonJS'
      }
    });
    
    // Dynamically import the server entry point
    console.log('Server wrapper: starting server...');
    
    // Define our dynamic import function
    const importModule = async (path) => {
      try {
        // Use a dynamic import with the full path
        const absolutePath = require('path').resolve(__dirname, path);
        // Ensure we add file:// protocol for Node.js ESM loading
        const moduleUrl = `file://${absolutePath}`;
        console.log(`Server wrapper: importing ${moduleUrl}`);
        
        return await import(moduleUrl);
      } catch (error) {
        console.error(`Failed to import ${path}:`, error);
        throw error;
      }
    };
    
    // Attempt to load our TypeScript server code
    try {
      // Try loading with require first (CommonJS approach)
      console.log('Server wrapper: trying CommonJS require...');
      require('./index');
    } catch (error) {
      if (error.code === 'ERR_REQUIRE_ESM') {
        // If it fails with ERR_REQUIRE_ESM, try dynamic import (ESM approach)
        console.log('Server wrapper: fallback to dynamic import...');
        await importModule('./index.ts');
      } else {
        // If it's a different error, just throw it
        console.error('Server wrapper: unexpected error:', error);
        throw error;
      }
    }
    
    console.log('Server wrapper: server started successfully');
  } catch (error) {
    console.error('Server wrapper: critical error starting server:', error);
    process.exit(1);
  }
})(); 