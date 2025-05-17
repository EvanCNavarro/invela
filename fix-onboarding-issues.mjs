#!/usr/bin/env node

/**
 * Fix Onboarding Issues Script
 * 
 * This script automatically fixes the following issues:
 * 1. Company onboarding status incorrectly shown as TRUE when users complete their individual onboarding
 * 2. User invitations created during onboarding are assigned company_id "1" instead of the inviting user's company_id
 * 
 * Usage:
 *   node fix-onboarding-issues.mjs [--dry-run]
 * 
 * Options:
 *   --dry-run   Check for issues without making any changes
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ANSI color codes for prettier output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m',
};

// Logger utility
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Constants
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_URL = process.env.DATABASE_URL;
const DRY_RUN = process.argv.includes('--dry-run');

// Initialize database connection
const client = new pg.Client({
  connectionString: DB_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

/**
 * Fix issue #1: Company onboarding status incorrectly shown
 * 
 * Check if the API routes are returning the correct company onboarding status
 */
async function fixCompanyOnboardingStatusIssue() {
  log(`\n${colors.cyan}${colors.bold}Checking for company onboarding status issue...${colors.reset}`);
  
  // Check routes.ts file
  const routesPath = path.join(__dirname, 'server', 'routes.ts');
  
  if (!fs.existsSync(routesPath)) {
    log(`${colors.red}Could not find routes.ts file at ${routesPath}${colors.reset}`);
    return false;
  }
  
  const routesContent = fs.readFileSync(routesPath, 'utf8');
  
  // Look for hardcoded onboardingCompleted values
  const hardcodedPattern = /onboardingCompleted:\s*true/g;
  const matches = routesContent.match(hardcodedPattern);
  
  if (matches && matches.length > 0) {
    log(`${colors.yellow}Found ${matches.length} instances of hardcoded onboardingCompleted: true${colors.reset}`);
    
    if (!DRY_RUN) {
      // Fix the issue by replacing hardcoded true with database value
      const fixedContent = routesContent.replace(
        /onboardingCompleted:\s*true/g, 
        'onboardingCompleted: company.onboarding_company_completed'
      );
      
      fs.writeFileSync(routesPath, fixedContent, 'utf8');
      log(`${colors.green}Fixed company onboarding status issue in routes.ts${colors.reset}`);
    } else {
      log(`${colors.yellow}[DRY RUN] Would fix company onboarding status issue in routes.ts${colors.reset}`);
    }
    
    return true;
  } else {
    log(`${colors.green}No hardcoded onboardingCompleted values found in routes.ts${colors.reset}`);
    return false;
  }
}

/**
 * Fix issue #2: User invitations assigned wrong company_id
 * 
 * Add validation to ensure invitations use the correct company_id
 */
async function fixUserInvitationCompanyIdIssue() {
  log(`\n${colors.cyan}${colors.bold}Checking for user invitation company_id issue...${colors.reset}`);
  
  let filesFixed = 0;
  const routesPath = path.join(__dirname, 'server', 'routes.ts');
  const usersRoutesPath = path.join(__dirname, 'server', 'routes', 'users.ts');
  
  // Check both files that might contain the invitation endpoint
  for (const filePath of [routesPath, usersRoutesPath]) {
    if (!fs.existsSync(filePath)) {
      log(`${colors.yellow}Could not find file at ${filePath}${colors.reset}`);
      continue;
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    
    // Look for invitation endpoint without proper validation
    if (fileContent.includes('/api/users/invite') && 
        fileContent.includes('app.post("/api/users/invite"')) {
      
      log(`${colors.blue}Found invitation endpoint in ${fileName}${colors.reset}`);
      
      // Check if validation is already present
      if (fileContent.includes('req.body.company_id === 1') && 
          fileContent.includes('Using authenticated user company ID as fallback')) {
        log(`${colors.green}Validation already exists in ${fileName}${colors.reset}`);
        continue;
      }
      
      // Find the location to insert the validation code
      const validationPoint = fileContent.indexOf('company_id: req.body.company_id');
      
      if (validationPoint === -1) {
        log(`${colors.yellow}Could not find insertion point in ${fileName}${colors.reset}`);
        continue;
      }
      
      // Find the surrounding context to properly patch the file
      let startSearchIndex = Math.max(0, validationPoint - 500);
      const contextBefore = fileContent.substring(startSearchIndex, validationPoint);
      const validationBlockStartIndex = contextBefore.lastIndexOf('const inviteData =');
      
      if (validationBlockStartIndex === -1) {
        log(`${colors.yellow}Could not find inviteData block in ${fileName}${colors.reset}`);
        continue;
      }
      
      const fullStartIndex = startSearchIndex + validationBlockStartIndex;
      const blockEndIndex = fileContent.indexOf('};', fullStartIndex) + 2;
      
      const inviteDataBlock = fileContent.substring(fullStartIndex, blockEndIndex);
      
      // Create the fixed block with validation
      const fixedBlock = inviteDataBlock.replace(
        /const inviteData = {([\s\S]*?)};/,
        `// Ensure we have a company ID
      // If req.body.company_id is missing or invalid, use the authenticated user's company_id
      if (!req.body.company_id || typeof req.body.company_id !== 'number') {
        console.warn('[Invite] Using authenticated user company ID as fallback:', req.user.company_id);
        req.body.company_id = req.user.company_id;
      }
      
      // Additional safety check to prevent company_id = 1 unless explicitly intended
      // This check should run in all cases
      if (req.body.company_id === 1) {
        console.warn('[Invite] Detected company_id = 1, this is likely incorrect. Using authenticated user company ID:', req.user.company_id);
        req.body.company_id = req.user.company_id;
      }

      const inviteData = {$1};`
      );
      
      if (!DRY_RUN) {
        // Apply the fix
        const fixedContent = fileContent.replace(inviteDataBlock, fixedBlock);
        fs.writeFileSync(filePath, fixedContent, 'utf8');
        log(`${colors.green}Fixed invitation company_id issue in ${fileName}${colors.reset}`);
        filesFixed++;
      } else {
        log(`${colors.yellow}[DRY RUN] Would fix invitation company_id issue in ${fileName}${colors.reset}`);
        filesFixed++;
      }
    } else {
      log(`${colors.yellow}No invitation endpoint found in ${fileName}${colors.reset}`);
    }
  }
  
  return filesFixed > 0;
}

/**
 * Check database for existing issues
 */
async function checkDatabase() {
  log(`\n${colors.cyan}${colors.bold}Checking database for existing issues...${colors.reset}`);
  
  try {
    await client.connect();
    log(`${colors.green}Connected to database${colors.reset}`);
    
    // Check for users with company_id = 1 that might be incorrect
    const suspiciousUsersQuery = `
      SELECT u.id, u.email, u.company_id, c.name as company_name
      FROM users u
      JOIN companies c ON u.company_id = c.id
      WHERE u.company_id = 1 AND u.created_via = 'invitation'
      ORDER BY u.created_at DESC
      LIMIT 10;
    `;
    
    const { rows: suspiciousUsers } = await client.query(suspiciousUsersQuery);
    
    if (suspiciousUsers.length > 0) {
      log(`${colors.yellow}Found ${suspiciousUsers.length} suspicious users with company_id = 1:${colors.reset}`);
      
      for (const user of suspiciousUsers) {
        log(`  ${colors.yellow}User ID: ${user.id}, Email: ${user.email}, Company: ${user.company_name}${colors.reset}`);
      }
      
      log(`${colors.yellow}These users might have incorrect company_id assignments.${colors.reset}`);
      log(`${colors.yellow}The code fix will prevent this from happening in the future.${colors.reset}`);
      log(`${colors.yellow}To fix existing data, you may need to manually update their company_id values.${colors.reset}`);
    } else {
      log(`${colors.green}No suspicious users with company_id = 1 found.${colors.reset}`);
    }
    
    // Check for recent invitation codes assigned to company_id = 1
    const invitationCodesQuery = `
      SELECT id, email, company_id, created_at
      FROM invitation_codes
      WHERE company_id = 1 AND created_at > NOW() - INTERVAL '30 days'
      ORDER BY created_at DESC
      LIMIT 10;
    `;
    
    const { rows: invitationCodes } = await client.query(invitationCodesQuery);
    
    if (invitationCodes.length > 0) {
      log(`${colors.yellow}Found ${invitationCodes.length} recent invitation codes with company_id = 1:${colors.reset}`);
      
      for (const code of invitationCodes) {
        log(`  ${colors.yellow}ID: ${code.id}, Email: ${code.email}, Created: ${code.created_at}${colors.reset}`);
      }
      
      log(`${colors.yellow}These invitation codes might have incorrect company_id assignments.${colors.reset}`);
    } else {
      log(`${colors.green}No recent invitation codes with company_id = 1 found.${colors.reset}`);
    }
    
  } catch (error) {
    log(`${colors.red}Database error: ${error.message}${colors.reset}`);
  } finally {
    await client.end();
  }
}

/**
 * Main function to run the fixes
 */
async function main() {
  log(`${colors.bold}${colors.cyan}====== Onboarding Issues Fix Tool ======${colors.reset}`);
  
  if (DRY_RUN) {
    log(`${colors.yellow}Running in DRY RUN mode - no changes will be made${colors.reset}`);
  }
  
  // Fix company onboarding status issue
  const companyIssueFixed = await fixCompanyOnboardingStatusIssue();
  
  // Fix user invitation company_id issue
  const invitationIssueFixed = await fixUserInvitationCompanyIdIssue();
  
  // Check database for existing issues
  await checkDatabase();
  
  // Summary
  log(`\n${colors.bold}${colors.cyan}====== Summary ======${colors.reset}`);
  
  if (companyIssueFixed) {
    log(`${colors.green}✅ Company onboarding status issue ${DRY_RUN ? 'would be' : 'has been'} fixed${colors.reset}`);
  } else {
    log(`${colors.blue}ℹ️ No company onboarding status issue found or fix not required${colors.reset}`);
  }
  
  if (invitationIssueFixed) {
    log(`${colors.green}✅ User invitation company_id issue ${DRY_RUN ? 'would be' : 'has been'} fixed${colors.reset}`);
  } else {
    log(`${colors.blue}ℹ️ No user invitation company_id issue found or fix not required${colors.reset}`);
  }
  
  log(`\n${colors.bold}To apply these fixes to other environments, run this script there as well.${colors.reset}`);
  log(`${colors.bold}Use --dry-run to check for issues without making changes.${colors.reset}`);
}

// Run the script
main().catch(error => {
  log(`${colors.red}Error: ${error.message}${colors.reset}`);
  process.exit(1);
});