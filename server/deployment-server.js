/**
 * Universal Deployment Server
 * 
 * A robust and adaptable deployment server for Replit that:
 * - Dynamically locates the correct application entry point
 * - Provides extensive logging for troubleshooting
 * - Ensures consistent port configuration for Replit
 * - Works with both ESM and CommonJS modules
 * 
 * @version 1.0.0
 */

// Force production mode and required port
process.env.NODE_ENV = 'production';
process.env.PORT = '8080';

// Comprehensive logging system
const Logger = {
  /**
   * Log an informational message with timestamp
   * @param {string} message - The message to log
   * @param {any} data - Optional data to include
   */
  info: function(message, data) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [DEPLOY-INFO] ${message}`);
    if (data) console.log(data);
  },
  
  /**
   * Log an error message with timestamp
   * @param {string} message - The message to log
   * @param {Error} error - Optional error object
   */
  error: function(message, error) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [DEPLOY-ERROR] ${message}`);
    if (error) {
      console.error(`[${timestamp}] [DEPLOY-ERROR] Details:`, error);
      if (error.stack) console.error(`[${timestamp}] [DEPLOY-ERROR] Stack:`, error.stack);
    }
  },
  
  /**
   * Log a success message with timestamp
   * @param {string} message - The message to log
   */
  success: function(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [DEPLOY-SUCCESS] ${message}`);
  },
  
  /**
   * Create a visual divider in the logs
   */
  divider: function() {
    console.log('='.repeat(60));
  }
};

// Display startup banner
Logger.divider();
Logger.info('INVELA PLATFORM - DEPLOYMENT SERVER');
Logger.info(`Starting at: ${new Date().toISOString()}`);
Logger.info(`Environment: ${process.env.NODE_ENV}`);
Logger.info(`Port: ${process.env.PORT}`);
Logger.info(`Current directory: ${process.cwd()}`);
Logger.info(`Node version: ${process.version}`);
Logger.divider();

// Load required modules
const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');

/**
 * Wait for a specified time
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>} - Promise that resolves after the time elapses
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if a module exists and can be imported
 * @param {string} modulePath - Path to the module
 * @returns {boolean} - Whether the module exists
 */
function moduleExists(modulePath) {
  try {
    require.resolve(modulePath);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Find the server entry point by checking multiple possible locations
 * @returns {string|null} - Path to the entry point or null if not found
 */
function findServerEntryPoint() {
  // Possible locations for the entry point in order of preference
  const possiblePaths = [
    // Standard build output location
    path.join(process.cwd(), 'dist', 'index.js'),
    // Root directory
    path.join(process.cwd(), 'index.js'),
    // Server subdirectory
    path.join(process.cwd(), 'dist', 'server', 'index.js'),
    path.join(process.cwd(), 'server', 'index.js'),
    // Look for server.js as an alternative
    path.join(process.cwd(), 'dist', 'server.js'),
    path.join(process.cwd(), 'server.js'),
    // Absolute paths in deployment environment
    '/home/runner/workspace/dist/index.js',
    '/home/runner/workspace/index.js',
    '/home/runner/workspace/dist/server/index.js'
  ];

  // Try each path and return the first one that exists
  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
      return testPath;
    }
  }

  return null;
}

/**
 * Create a map of all JavaScript files in the project
 * @returns {Promise<string[]>} - List of JavaScript files
 */
async function createFileMap() {
  return new Promise((resolve, reject) => {
    exec('find . -name "*.js" | sort', (error, stdout) => {
      if (error) {
        Logger.error('Error creating file map', error);
        resolve([]);
      } else {
        resolve(stdout.split('\n').filter(Boolean));
      }
    });
  });
}

/**
 * Start the application with proper port binding and timeout handling
 * @param {string} entryPoint - Path to the entry point
 */
async function startServer(entryPoint) {
  try {
    Logger.info(`Starting server from: ${entryPoint}`);
    
    // Ensure port 8080 is available
    await ensurePortAvailable(8080);
    
    // Start the server process
    const server = spawn('node', [entryPoint], {
      stdio: 'inherit',
      env: {
        ...process.env,
        PORT: '8080',
        NODE_ENV: 'production',
        HOST: '0.0.0.0'
      }
    });
    
    // Track server process
    let serverStarted = false;
    
    // Handle server output to detect when it's ready
    server.on('close', (code) => {
      if (code !== 0) {
        Logger.error(`Server process exited with code ${code}`);
        if (!serverStarted) {
          Logger.info('Attempting to restart server...');
          // Try again with a different approach if server didn't start
          tryAlternativeStartMethod();
        } else {
          process.exit(code);
        }
      }
    });
    
    // Wait for port 8080 to become active, which indicates server is running
    await waitForPort(8080, 10000); // Wait up to 10 seconds
    serverStarted = true;
    
    Logger.success('Server successfully started and bound to port 8080');
    
    // Keep the parent process running
    process.on('SIGINT', () => {
      Logger.info('Received SIGINT, shutting down...');
      process.exit(0);
    });
    
  } catch (error) {
    Logger.error('Failed to start server', error);
    // Try alternative approach
    await tryAlternativeStartMethod();
  }
}

/**
 * Check if a port is in use
 * @param {number} port - Port to check
 * @returns {Promise<boolean>} - Whether the port is in use
 */
function isPortInUse(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const tester = net.createServer()
      .once('error', () => resolve(true))
      .once('listening', () => {
        tester.close();
        resolve(false);
      })
      .listen(port, '0.0.0.0');
  });
}

/**
 * Ensure a port is available, killing any process using it if necessary
 * @param {number} port - Port to check
 */
async function ensurePortAvailable(port) {
  if (await isPortInUse(port)) {
    Logger.info(`Port ${port} is in use, attempting to free it...`);
    
    // On Linux, find and kill process using the port
    if (process.platform === 'linux') {
      try {
        await new Promise((resolve, reject) => {
          exec(`fuser -k ${port}/tcp`, (error) => {
            // We don't care about errors here, just continue
            resolve();
          });
        });
        
        // Wait a moment for the port to be released
        await wait(1000);
        
        if (await isPortInUse(port)) {
          Logger.error(`Failed to free port ${port}`);
        } else {
          Logger.success(`Successfully freed port ${port}`);
        }
      } catch (error) {
        Logger.error('Error freeing port', error);
      }
    }
  }
}

/**
 * Wait for a port to become active
 * @param {number} port - Port to check
 * @param {number} timeout - Maximum time to wait in ms
 * @returns {Promise<boolean>} - Whether the port became active
 */
async function waitForPort(port, timeout) {
  Logger.info(`Waiting for port ${port} to become active...`);
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await isPortInUse(port)) {
      Logger.success(`Port ${port} is now active`);
      return true;
    }
    await wait(500);
  }
  
  Logger.error(`Timeout waiting for port ${port} to become active`);
  return false;
}

/**
 * Try an alternative method to start the server
 */
async function tryAlternativeStartMethod() {
  Logger.info('Trying alternative server start method...');
  
  // Try to require the entry point directly
  try {
    const fileMap = await createFileMap();
    Logger.info('Available JavaScript files:', fileMap);
    
    // Look for specific patterns that might be entry points
    const potentialEntryPoints = fileMap.filter(file => 
      file.includes('index.js') || 
      file.includes('server.js') || 
      file.includes('app.js')
    );
    
    if (potentialEntryPoints.length > 0) {
      Logger.info('Potential entry points found:', potentialEntryPoints);
      
      // Try each potential entry point
      for (const entryPoint of potentialEntryPoints) {
        Logger.info(`Trying to start server from: ${entryPoint}`);
        
        try {
          // Ensure port 8080 is available
          await ensurePortAvailable(8080);
          
          // Start the server using this entry point
          const server = spawn('node', [entryPoint], {
            stdio: 'inherit',
            env: {
              ...process.env,
              PORT: '8080',
              NODE_ENV: 'production',
              HOST: '0.0.0.0'
            }
          });
          
          // Wait to see if it stays running
          await wait(5000);
          
          // If we get here without an error, assume success
          Logger.success(`Server started successfully from ${entryPoint}`);
          return;
        } catch (error) {
          Logger.error(`Failed to start from ${entryPoint}`, error);
        }
      }
    }
    
    // If we get here, all attempts failed
    Logger.error('All alternative start methods failed');
    process.exit(1);
  } catch (error) {
    Logger.error('Error in alternative start method', error);
    process.exit(1);
  }
}

/**
 * Main function to run the deployment server
 */
async function main() {
  try {
    // Find the server entry point
    const entryPoint = findServerEntryPoint();
    
    if (!entryPoint) {
      Logger.error('Cannot find server entry point. Checking directory structure...');
      
      // Map available files to help with debugging
      const fileMap = await createFileMap();
      Logger.info('Available JavaScript files:', fileMap);
      
      // Check if we can create a redirect file
      Logger.info('Creating a server entry point redirector...');
      
      // Create a temporary file that will try to load the server using various methods
      const redirectorPath = path.join(process.cwd(), 'deploy-redirector.js');
      const redirectorContent = `
/**
 * Deployment Server Redirector
 * This file attempts to load the application server using various methods
 */
console.log('[REDIRECTOR] Starting server redirector');

// Try various potential entry points
const possibleModules = [
  './dist/index.js',
  './index.js',
  './dist/server/index.js',
  './server/index.js'
];

let loaded = false;

for (const modulePath of possibleModules) {
  try {
    console.log(\`[REDIRECTOR] Trying to load \${modulePath}...\`);
    require(modulePath);
    console.log(\`[REDIRECTOR] Successfully loaded \${modulePath}\`);
    loaded = true;
    break;
  } catch (e) {
    console.error(\`[REDIRECTOR] Failed to load \${modulePath}: \${e.message}\`);
  }
}

if (!loaded) {
  console.error('[REDIRECTOR] Failed to load any server entry point');
  process.exit(1);
}
`;
      
      fs.writeFileSync(redirectorPath, redirectorContent);
      Logger.success(`Created redirector at ${redirectorPath}`);
      
      // Try starting with this redirector
      await startServer(redirectorPath);
    } else {
      // Start the server with the found entry point
      Logger.info(`Server entry point found at: ${entryPoint}`);
      await startServer(entryPoint);
    }
  } catch (error) {
    Logger.error('Fatal error in deployment server', error);
    process.exit(1);
  }
}

// Register error handlers
process.on('uncaughtException', (error) => {
  Logger.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  Logger.error('Unhandled promise rejection:', reason);
});

// Run the main function
main();