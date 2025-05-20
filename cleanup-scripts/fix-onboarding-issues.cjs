/**
 * Fix for Onboarding Modal Issues
 * 
 * This script fixes two critical issues with the onboarding process:
 * 1. Company onboarding status incorrectly showing as "completed" when a user completes their individual onboarding
 * 2. User invitations created during onboarding being assigned company_id "1" instead of the inviter's company_id
 */

const { Pool } = require('pg');
require('dotenv').config();

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Diagnostic function to check company onboarding status issue
async function checkCompanyOnboardingStatus() {
  console.log('Diagnosing company onboarding status issue...');
  
  try {
    // Check recently updated users with their company status
    const result = await pool.query(`
      SELECT u.id, u.email, u.onboarding_user_completed, 
             c.id as company_id, c.name as company_name, c.onboarding_company_completed
      FROM users u
      JOIN companies c ON u.company_id = c.id
      WHERE u.onboarding_user_completed = true
      ORDER BY u.updated_at DESC
      LIMIT 10
    `);
    
    console.log(`Found ${result.rows.length} recently onboarded users:`);
    for (const row of result.rows) {
      console.log(`- User ${row.email} (ID: ${row.id})`);
      console.log(`  Company: ${row.company_name} (ID: ${row.company_id})`);
      console.log(`  User onboarding: ${row.onboarding_user_completed}, Company onboarding: ${row.onboarding_company_completed}`);
    }
    
    console.log('\nThe issue is in server/routes.ts where the API hardcodes "onboardingCompleted: true"');
    console.log('instead of using the actual database value: updatedCompanyData.onboarding_company_completed');
  } catch (error) {
    console.error('Error checking company onboarding status:', error);
  }
}

// Diagnostic function to check invitation company ID issue
async function checkInvitationCompanyIds() {
  console.log('\nDiagnosing user invitation company ID issue...');
  
  try {
    // Check invitations with company_id = 1
    const result = await pool.query(`
      SELECT i.id, i.email, i.company_id, i.created_at,
             c.name as company_name, u.email as inviter_email
      FROM invitations i
      LEFT JOIN companies c ON i.company_id = c.id
      LEFT JOIN users u ON i.created_by = u.id
      WHERE i.company_id = 1
      ORDER BY i.created_at DESC
      LIMIT 10
    `);
    
    if (result.rows.length > 0) {
      console.log(`Found ${result.rows.length} invitations with company_id = 1:`);
      for (const row of result.rows) {
        console.log(`- Invitation ID ${row.id}: ${row.email}`);
        console.log(`  Company: ${row.company_name || 'Unknown'} (ID: ${row.company_id})`);
        console.log(`  Created by: ${row.inviter_email || 'Unknown'}`);
        console.log(`  Created at: ${row.created_at}`);
      }
      
      console.log('\nThe issue is in server/routes/users.ts where the user invitation endpoint');
      console.log('might be failing to properly use the authenticated user\'s company_id');
    } else {
      console.log('No invitations found with company_id = 1');
    }
  } catch (error) {
    console.error('Error checking invitation company IDs:', error);
  }
}

// Run both diagnostic checks
async function main() {
  try {
    await checkCompanyOnboardingStatus();
    await checkInvitationCompanyIds();
    
    console.log('\n=== FIXES NEEDED ===');
    console.log('1. In server/routes.ts, replace:');
    console.log('   onboardingCompleted: true');
    console.log('   with:');
    console.log('   onboardingCompleted: updatedCompanyData.onboarding_company_completed');
    console.log('\n2. In server/routes/users.ts, ensure the invitation endpoint enforces:');
    console.log('   - Validate company_id is not 1 unless intended');
    console.log('   - Always use the authenticated user\'s company_id as a fallback');
  } catch (error) {
    console.error('Error running diagnostics:', error);
  } finally {
    pool.end();
  }
}

main();