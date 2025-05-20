/**
 * Create Fixed File Repair Module
 * 
 * This script copies the fileCreation.fixed.ts module to a JavaScript file
 * that can be used by CommonJS modules, ensuring compatibility across both module systems.
 */

const fs = require('fs');
const path = require('path');

// Copy the fixed file creation module to a JavaScript version
function createFixedFileRepairModule() {
  console.log('Creating fixed file repair module...');
  
  const sourcePath = path.join(__dirname, 'server/services/fileCreation.fixed.ts');
  const destPath = path.join(__dirname, 'server/services/fileCreation.fixed.js');
  
  console.log(`Source: ${sourcePath}`);
  console.log(`Destination: ${destPath}`);
  
  // Check if source file exists
  if (!fs.existsSync(sourcePath)) {
    console.error(`Source file not found: ${sourcePath}`);
    return false;
  }
  
  try {
    // Read source file
    const sourceContent = fs.readFileSync(sourcePath, 'utf8');
    console.log('Source file read successfully');
    
    // Create JavaScript version (without TypeScript types)
    let jsContent = sourceContent
      // Remove TypeScript type annotations
      .replace(/: \w+(?:<[^>]*>)?/g, '') // Remove type annotations like ': string', ': number', ': Array<string>'
      .replace(/<[^>]*>/g, '') // Remove generic type parameters
      .replace(/\?: /g, '=') // Convert optional parameters to default parameters
      .replace(/Promise<[^>]*>/g, 'Promise')
      // Make CommonJS compatible
      .replace(/import\s+{([^}]+)}\s+from\s+['"](.*?)['"];?/g, 'const {$1} = require("$2");')
      .replace(/export\s+/g, 'module.exports.')
      .replace(/export\s+async\s+function/g, 'async function')
      .replace(/export\s+function/g, 'function');
    
    console.log('Source file transformed successfully');
    
    // Fix any missed export functions to be CommonJS compatible
    if (jsContent.includes('module.exports.async function')) {
      jsContent = jsContent.replace('module.exports.async function', 'module.exports.createTaskFile = async function');
    }
    
    // Write JavaScript file
    fs.writeFileSync(destPath, jsContent, 'utf8');
    console.log(`JavaScript version created successfully: ${destPath}`);
    
    return true;
  } catch (error) {
    console.error('Error creating fixed file repair module:', error);
    return false;
  }
}

createFixedFileRepairModule();
