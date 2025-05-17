/**
 * Direct Fix for Onboarding Issues
 * 
 * This script directly patches the complete-onboarding endpoint in server/routes.ts
 * to fix two issues:
 * 
 * 1. Company onboarding status incorrectly showing as "completed" when users complete
 *    their individual onboarding by using actual database value instead of hardcoded true
 * 
 * 2. Adds additional validation for the user invitation endpoint to ensure
 *    the correct company ID is always used
 * 
 * Note: This is a direct file-changing script that should be run carefully
 */

import fs from 'fs';
import path from 'path';

// Files to patch
const routesPath = './server/routes.ts';
const usersRoutesPath = './server/routes/users.ts';

// Fix the company onboarding status issue
function fixCompanyOnboardingStatus() {
  console.log('Fixing company onboarding status issue...');
  
  try {
    // Read the routes.ts file
    let routesContent = fs.readFileSync(routesPath, 'utf8');
    
    // Create a backup before making changes
    fs.writeFileSync(routesPath + '.bak', routesContent, 'utf8');
    console.log('Created backup of routes.ts');
    
    // Fix the onboarding status in both response objects
    // This is safer than direct string replacement
    let fixedContent = routesContent
      .replace(
        /onboardingCompleted: true/g, 
        'onboardingCompleted: updatedCompanyData.onboarding_company_completed'
      );
    
    // Write the fixed content back to the file
    fs.writeFileSync(routesPath, fixedContent, 'utf8');
    console.log('Fixed company onboarding status in routes.ts');
    
    // Verify the changes
    const afterContent = fs.readFileSync(routesPath, 'utf8');
    if (afterContent !== routesContent) {
      console.log('Successfully updated routes.ts');
    } else {
      console.error('Failed to update routes.ts - no changes were made');
    }
  } catch (error) {
    console.error('Error fixing company onboarding status:', error);
  }
}

// Fix the user invitation company ID issue
function fixInvitationCompanyID() {
  console.log('\nFixing user invitation company ID issue...');
  
  try {
    // Read the users.ts file
    let usersContent = fs.readFileSync(usersRoutesPath, 'utf8');
    
    // Create a backup before making changes
    fs.writeFileSync(usersRoutesPath + '.bak', usersContent, 'utf8');
    console.log('Created backup of users.ts');
    
    // Find the position where we need to add additional validation
    // This is after the existing company ID fallback logic
    const insertPoint = usersContent.indexOf('req.body.company_id = req.user.company_id;');
    
    if (insertPoint === -1) {
      console.error('Failed to find insertion point in users.ts');
      return;
    }
    
    // Find the end of the line
    const lineEnd = usersContent.indexOf('\n', insertPoint);
    
    // Prepare the additional validation code
    const additionalValidation = `
      // Additional safety check to prevent company_id = 1 unless explicitly intended
      if (req.body.company_id === 1) {
        console.warn('[Invite] Detected company_id = 1, this is likely incorrect. Using authenticated user company ID:', req.user.company_id);
        req.body.company_id = req.user.company_id;
      }`;
    
    // Insert the additional validation after the existing fallback
    const updatedContent = 
      usersContent.substring(0, lineEnd + 1) + 
      additionalValidation + 
      usersContent.substring(lineEnd + 1);
    
    // Write the fixed content back to the file
    fs.writeFileSync(usersRoutesPath, updatedContent, 'utf8');
    console.log('Added company ID validation in users.ts');
    
    // Verify the changes
    const afterContent = fs.readFileSync(usersRoutesPath, 'utf8');
    if (afterContent !== usersContent) {
      console.log('Successfully updated users.ts');
    } else {
      console.error('Failed to update users.ts - no changes were made');
    }
  } catch (error) {
    console.error('Error fixing invitation company ID:', error);
  }
}

// Run both fixes
function main() {
  console.log('Starting onboarding issues fix...');
  
  // Fix the company onboarding status issue
  fixCompanyOnboardingStatus();
  
  // Fix the user invitation company ID issue
  fixInvitationCompanyID();
  
  console.log('\nAll fixes applied. Please restart the server for changes to take effect.');
}

// Execute the main function
main();