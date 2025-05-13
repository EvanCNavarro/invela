/**
 * Fix All Open Banking Submission Issues
 *
 * This script runs both fixes in sequence:
 * 1. First fixes the form submission status (ready_for_submission → submitted)
 * 2. Then fixes the Open Banking post-submission issues (risk score, accreditation, onboarding)
 *
 * Usage: node fix-all.js [taskId] [companyId]
 * Example: node fix-all.js 820 289
 */

import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

// Terminal colors for better output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

// Get task ID and company ID from command line or use defaults
const taskId = process.argv[2] || 820;
const companyId = process.argv[3] || 289;

// Script paths
const updateStatusScript = './update-form-submission-status.js';
const fixPostSubmissionScript = './fix-open-banking-postsubmission.js';

/**
 * Run the form status update script
 */
async function fixFormStatus() {
  console.log(`\n${colors.bright}${colors.blue}=== STEP 1: Fixing Form Submission Status ===${colors.reset}\n`);
  
  try {
    const { stdout, stderr } = await execAsync(`node ${updateStatusScript} ${taskId} open_banking`);
    console.log(stdout);
    if (stderr) console.error(stderr);
    return true;
  } catch (error) {
    console.error(`${colors.red}Error running form status update script:${colors.reset}`, error.message);
    return false;
  }
}

/**
 * Run the Open Banking post-submission fix script
 */
async function fixOpenBankingPostSubmission() {
  console.log(`\n${colors.bright}${colors.blue}=== STEP 2: Fixing Open Banking Post-Submission Issues ===${colors.reset}\n`);
  
  try {
    const { stdout, stderr } = await execAsync(`node ${fixPostSubmissionScript} ${companyId}`);
    console.log(stdout);
    if (stderr) console.error(stderr);
    return true;
  } catch (error) {
    console.error(`${colors.red}Error running Open Banking post-submission fix script:${colors.reset}`, error.message);
    return false;
  }
}

/**
 * Main function to run both fixes
 */
async function fixAll() {
  console.log(`\n${colors.bright}${colors.green}=======================================${colors.reset}`);
  console.log(`${colors.bright}${colors.green}== STARTING COMPREHENSIVE FIX PROCESS ==${colors.reset}`);
  console.log(`${colors.bright}${colors.green}=======================================${colors.reset}`);
  console.log(`Task ID: ${taskId}, Company ID: ${companyId}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);
  
  try {
    // Step 1: Fix form submission status
    const statusFixed = await fixFormStatus();
    if (!statusFixed) {
      console.warn(`${colors.yellow}Form status fix encountered issues, but continuing...${colors.reset}`);
    }
    
    // Step 2: Fix Open Banking post-submission issues
    const postSubmissionFixed = await fixOpenBankingPostSubmission();
    if (!postSubmissionFixed) {
      console.warn(`${colors.yellow}Open Banking post-submission fix encountered issues.${colors.reset}`);
    }
    
    // Final status
    if (statusFixed && postSubmissionFixed) {
      console.log(`\n${colors.bright}${colors.green}========================================${colors.reset}`);
      console.log(`${colors.bright}${colors.green}== ALL FIXES COMPLETED SUCCESSFULLY ==${colors.reset}`);
      console.log(`${colors.bright}${colors.green}========================================${colors.reset}`);
    } else {
      console.log(`\n${colors.bright}${colors.yellow}==================================${colors.reset}`);
      console.log(`${colors.bright}${colors.yellow}== FIXES COMPLETED WITH WARNINGS ==${colors.reset}`);
      console.log(`${colors.bright}${colors.yellow}==================================${colors.reset}`);
    }
    
    console.log(`\nPlease refresh the application UI to see the changes.\n`);
  } catch (error) {
    console.error(`\n${colors.bright}${colors.red}=======================${colors.reset}`);
    console.error(`${colors.bright}${colors.red}== FIX PROCESS FAILED ==${colors.reset}`);
    console.error(`${colors.bright}${colors.red}=======================${colors.reset}`);
    console.error(`\nError: ${error.message}\n`);
  }
}

// Run the combined fix process
fixAll().catch(error => {
  console.error(`${colors.red}Unhandled error:${colors.reset}`, error);
  process.exit(1);
});