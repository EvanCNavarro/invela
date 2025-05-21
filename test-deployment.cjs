/**
 * Deployment Configuration Test Script
 * 
 * This script helps verify that our deployment configuration is correct
 * by checking the file paths and server responsiveness.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// Timestamp utility for logging
function timestamp() {
  return new Date().toISOString();
}

// Log message with timestamp
function log(message) {
  console.log(`[${timestamp()}] [TEST] ${message}`);
}

// Check if a file exists
function checkFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      log(`✅ File exists: ${filePath}`);
      return true;
    } else {
      log(`❌ File not found: ${filePath}`);
      return false;
    }
  } catch (error) {
    log(`❌ Error checking file ${filePath}: ${error.message}`);
    return false;
  }
}

// Check server responsiveness
function checkServer(port = 8080, host = 'localhost') {
  return new Promise((resolve) => {
    log(`Testing server on ${host}:${port}...`);
    
    const req = http.request({
      method: 'GET',
      host,
      port,
      path: '/',
      timeout: 3000
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          log(`✅ Server responded with status 200 OK`);
          log(`Response: ${data.substring(0, 100)}${data.length > 100 ? '...' : ''}`);
          resolve(true);
        } else {
          log(`❌ Server responded with unexpected status: ${res.statusCode}`);
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      log(`❌ Error connecting to server: ${error.message}`);
      resolve(false);
    });
    
    req.on('timeout', () => {
      log(`❌ Request timed out`);
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

// Check deployment configuration
function checkDeploymentConfig() {
  try {
    const deployConfigPath = path.join(process.cwd(), '.replit.deploy.json');
    
    if (fs.existsSync(deployConfigPath)) {
      log(`Found deployment configuration at ${deployConfigPath}`);
      
      const deployConfig = JSON.parse(fs.readFileSync(deployConfigPath, 'utf8'));
      log(`Run command: ${deployConfig.run}`);
      log(`Entrypoint: ${deployConfig.entrypoint}`);
      log(`Port: ${deployConfig.port}`);
      
      // Check if entrypoint exists
      if (deployConfig.entrypoint) {
        const entrypointPath = path.join(process.cwd(), deployConfig.entrypoint);
        checkFile(entrypointPath);
      }
      
      return true;
    } else {
      log(`❌ Deployment configuration not found at ${deployConfigPath}`);
      return false;
    }
  } catch (error) {
    log(`❌ Error checking deployment configuration: ${error.message}`);
    return false;
  }
}

// Check Docker ignore file
function checkDockerIgnore() {
  const dockerIgnorePath = path.join(process.cwd(), '.dockerignore');
  
  if (fs.existsSync(dockerIgnorePath)) {
    log(`✅ Found .dockerignore file`);
    
    const content = fs.readFileSync(dockerIgnorePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    
    log(`Docker ignore contains ${lines.length} patterns`);
    
    // Check for key exclusions to reduce image size
    const keyExclusions = [
      'node_modules/.cache',
      'attached_assets',
      '.git',
      '**/*.map'
    ];
    
    let allFound = true;
    for (const exclusion of keyExclusions) {
      if (content.includes(exclusion)) {
        log(`✅ Docker ignore includes key exclusion: ${exclusion}`);
      } else {
        log(`❌ Docker ignore missing key exclusion: ${exclusion}`);
        allFound = false;
      }
    }
    
    return allFound;
  } else {
    log(`❌ Docker ignore file not found at ${dockerIgnorePath}`);
    return false;
  }
}

// Run all checks
async function runTests() {
  log('Starting deployment configuration tests...');
  
  const configOk = checkDeploymentConfig();
  const dockerIgnoreOk = checkDockerIgnore();
  
  // Try to check if server is running
  const serverOk = await checkServer();
  
  // Overall result
  if (configOk && dockerIgnoreOk) {
    log('✅ Deployment configuration looks good!');
    log('✅ Docker ignore file is properly configured.');
    
    if (serverOk) {
      log('✅ Server is running and responding correctly.');
    } else {
      log('⚠️ Server is not responding, but configuration is correct.');
      log('   You may need to start the server before testing.');
    }
    
    log('You should be ready to deploy with the current configuration.');
  } else {
    log('❌ Some issues were found with the deployment configuration.');
    log('   Please fix the issues mentioned above before deploying.');
  }
}

// Run all tests
runTests();