/**
 * Open Banking Post-Submission Fix Controller
 * 
 * This script acts as a controller to check and fix Open Banking
 * post-submission processing as needed.
 * 
 * Usage:
 *   node fix-open-banking-post-submission.js <taskId> <companyId> [--fix]
 * 
 * Examples:
 *   # Check status only
 *   node fix-open-banking-post-submission.js 784 278
 * 
 *   # Check and fix
 *   node fix-open-banking-post-submission.js 784 278 --fix
 */

// Load the check and fix modules dynamically
import { spawn } from 'child_process';

// Function to run a script with arguments
async function runScript(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [scriptPath, ...args], {
      stdio: 'inherit',
      shell: true
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script exited with code ${code}`));
      }
    });
    
    child.on('error', (err) => {
      reject(err);
    });
  });
}

// Main function
async function main() {
  try {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      console.error('Usage: node fix-open-banking-post-submission.js <taskId> <companyId> [--fix]');
      process.exit(1);
    }
    
    const taskId = args[0];
    const companyId = args[1];
    const shouldFix = args.includes('--fix');
    
    // First, check the current state
    console.log('Checking Open Banking post-submission state...\n');
    await runScript('check-open-banking-post-submission.js', [taskId, companyId]);
    
    // If --fix flag is provided, run the fix script
    if (shouldFix) {
      console.log('\nApplying fixes...\n');
      await runScript('direct-fix-open-banking-post-submission.js', [taskId, companyId]);
      
      // Check again after fixes
      console.log('\nVerifying fixes...\n');
      await runScript('check-open-banking-post-submission.js', [taskId, companyId]);
    }
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the main function
main();