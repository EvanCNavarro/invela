/**
 * Migration script to update any companies with AWAITING_INVITATION status
 * to the new standardized IN_PROCESS status
 * 
 * This ensures consistency across the application with our new
 * standardized accreditation status values.
 */

import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;
dotenv.config();

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Initialize database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Pretty log with color support
 */
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Update all companies with AWAITING_INVITATION status to IN_PROCESS
 */
async function updateAwaitingInvitationStatus() {
  const client = await pool.connect();
  
  try {
    log('Starting migration: Update AWAITING_INVITATION status to IN_PROCESS', colors.cyan);
    
    // First, count how many companies have the old status
    const countQuery = `
      SELECT COUNT(*) FROM companies 
      WHERE accreditation_status = 'AWAITING_INVITATION'
    `;
    
    const countResult = await client.query(countQuery);
    const count = parseInt(countResult.rows[0].count);
    
    if (count === 0) {
      log('No companies found with AWAITING_INVITATION status. Nothing to update.', colors.yellow);
      return;
    }
    
    log(`Found ${count} companies with AWAITING_INVITATION status that need to be updated.`, colors.blue);
    
    // Update the status for all matching companies
    const updateQuery = `
      UPDATE companies 
      SET accreditation_status = 'PENDING' 
      WHERE accreditation_status = 'AWAITING_INVITATION'
      RETURNING id, name
    `;
    
    const updateResult = await client.query(updateQuery);
    const updatedCompanies = updateResult.rows;
    
    log(`Successfully updated ${updatedCompanies.length} companies:`, colors.green);
    updatedCompanies.forEach((company, idx) => {
      log(`  ${idx + 1}. ID: ${company.id}, Name: ${company.name}`, colors.green);
    });
    
    log('Migration completed successfully!', colors.cyan);
  } catch (error) {
    log(`Error updating company statuses: ${error.message}`, colors.red);
    throw error;
  } finally {
    client.release();
  }
}

// Execute the update function as an IIFE
(async () => {
  try {
    await updateAwaitingInvitationStatus();
    log('Script execution completed.', colors.blue);
    process.exit(0);
  } catch (err) {
    log(`Script execution failed: ${err.message}`, colors.red);
    process.exit(1);
  }
})();