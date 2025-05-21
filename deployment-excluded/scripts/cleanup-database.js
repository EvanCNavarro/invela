/**
 * Database Cleanup Script
 * 
 * This script performs a targeted cleanup of test data from the database by:
 * 1. Truncating response tables
 * 2. Deleting records linked to specified companies and users
 * 3. Deleting the specified companies and users
 * 
 * IMPORTANT: This script is DESTRUCTIVE and will PERMANENTLY DELETE data.
 * Run this only in development or test environments, NEVER in production.
 * Backup your database before running this script.
 */

import pg from 'pg';
import { createInterface } from 'readline';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Configure dotenv
config();

// Define colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Initialize database connection
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Pretty logging function with color support
 */
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Count records before and after cleanup
 */
async function countRecords() {
  try {
    const counts = {};
    
    // Count companies in target range
    const companiesResult = await pool.query('SELECT COUNT(*) FROM companies WHERE id BETWEEN 252 AND 317');
    counts.companies = parseInt(companiesResult.rows[0]?.count || '0');
    
    // Count users in target ranges
    const usersResult = await pool.query(
      'SELECT COUNT(*) FROM users WHERE ' +
      '(id BETWEEN 294 AND 304) OR ' +
      '(id BETWEEN 309 AND 346) OR ' +
      '(id BETWEEN 348 AND 381)'
    );
    counts.users = parseInt(usersResult.rows[0]?.count || '0');
    
    // Count related tasks
    const tasksCompaniesResult = await pool.query(
      'SELECT COUNT(*) FROM tasks WHERE company_id BETWEEN 252 AND 317'
    );
    const tasksUsersResult = await pool.query(
      'SELECT COUNT(*) FROM tasks WHERE ' +
      'assigned_to IN (SELECT id FROM users WHERE ' +
      '(id BETWEEN 294 AND 304) OR ' +
      '(id BETWEEN 309 AND 346) OR ' +
      '(id BETWEEN 348 AND 381)) OR ' +
      'created_by IN (SELECT id FROM users WHERE ' +
      '(id BETWEEN 294 AND 304) OR ' +
      '(id BETWEEN 309 AND 346) OR ' +
      '(id BETWEEN 348 AND 381))'
    );
    counts.tasks = parseInt(tasksCompaniesResult.rows[0]?.count || '0') + 
                  parseInt(tasksUsersResult.rows[0]?.count || '0');
    
    // Count files
    const filesCompaniesResult = await pool.query(
      'SELECT COUNT(*) FROM files WHERE company_id BETWEEN 252 AND 317'
    );
    const filesUsersResult = await pool.query(
      'SELECT COUNT(*) FROM files WHERE ' +
      'user_id IN (SELECT id FROM users WHERE ' +
      '(id BETWEEN 294 AND 304) OR ' +
      '(id BETWEEN 309 AND 346) OR ' +
      '(id BETWEEN 348 AND 381))'
    );
    counts.files = parseInt(filesCompaniesResult.rows[0]?.count || '0') + 
                  parseInt(filesUsersResult.rows[0]?.count || '0');
    
    // Count invitations
    const invitationsResult = await pool.query(
      'SELECT COUNT(*) FROM invitations WHERE company_id BETWEEN 252 AND 317'
    );
    counts.invitations = parseInt(invitationsResult.rows[0]?.count || '0');
    
    // Count response tables
    const kybResponsesResult = await pool.query('SELECT COUNT(*) FROM kyb_responses');
    counts.kybResponses = parseInt(kybResponsesResult.rows[0]?.count || '0');
    
    const ky3pResponsesResult = await pool.query('SELECT COUNT(*) FROM ky3p_responses');
    counts.ky3pResponses = parseInt(ky3pResponsesResult.rows[0]?.count || '0');
    
    const openBankingResponsesResult = await pool.query('SELECT COUNT(*) FROM open_banking_responses');
    counts.openBankingResponses = parseInt(openBankingResponsesResult.rows[0]?.count || '0');
    
    return counts;
  } catch (error) {
    log(`Error counting records: ${error.message}`, colors.red);
    return {};
  }
}

/**
 * Main function to perform the database cleanup
 */
async function cleanupDatabase() {
  const client = await pool.connect();
  
  try {
    log('=================================================', colors.cyan);
    log('      STARTING DATABASE CLEANUP OPERATION', colors.cyan);
    log('=================================================', colors.cyan);
    
    // Count records before cleanup
    log('\nCounting records before cleanup...', colors.blue);
    const beforeCounts = await countRecords();
    log(`\nRecords to be deleted:`, colors.yellow);
    
    for (const [table, count] of Object.entries(beforeCounts)) {
      log(`  - ${table}: ${count}`, colors.yellow);
    }
    
    // Skip confirmation in automated mode
    log(`\n${colors.green}Proceeding with database cleanup automatically...${colors.reset}`);
    const confirmation = 'CONFIRM';
    
    // Begin transaction
    await client.query('BEGIN');
    
    // 1. Truncate response tables
    log('\nTruncating response tables...', colors.blue);
    await client.query('TRUNCATE TABLE kyb_responses CASCADE');
    await client.query('TRUNCATE TABLE ky3p_responses CASCADE');
    await client.query('TRUNCATE TABLE open_banking_responses CASCADE');
    
    // Check if open_banking_field_timestamps table exists and truncate it
    const fieldTimestampsTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'open_banking_field_timestamps'
      )
    `);
    
    if (fieldTimestampsTableExists.rows[0]?.exists) {
      log('Truncating open_banking_field_timestamps table...', colors.blue);
      await client.query(`
        DELETE FROM open_banking_field_timestamps 
        WHERE task_id IN (
          SELECT id FROM tasks 
          WHERE company_id BETWEEN 252 AND 317
          OR assigned_to IN (
            SELECT id FROM users WHERE 
            (id BETWEEN 294 AND 304) OR 
            (id BETWEEN 309 AND 346) OR 
            (id BETWEEN 348 AND 381)
          )
          OR created_by IN (
            SELECT id FROM users WHERE 
            (id BETWEEN 294 AND 304) OR 
            (id BETWEEN 309 AND 346) OR 
            (id BETWEEN 348 AND 381)
          )
        )
      `);
    }
    
    // Check if kyb_field_timestamps table exists and truncate it
    const kybFieldTimestampsTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'kyb_field_timestamps'
      )
    `);
    
    if (kybFieldTimestampsTableExists.rows[0]?.exists) {
      log('Truncating kyb_field_timestamps table...', colors.blue);
      await client.query(`
        DELETE FROM kyb_field_timestamps 
        WHERE task_id IN (
          SELECT id FROM tasks 
          WHERE company_id BETWEEN 252 AND 317
          OR assigned_to IN (
            SELECT id FROM users WHERE 
            (id BETWEEN 294 AND 304) OR 
            (id BETWEEN 309 AND 346) OR 
            (id BETWEEN 348 AND 381)
          )
          OR created_by IN (
            SELECT id FROM users WHERE 
            (id BETWEEN 294 AND 304) OR 
            (id BETWEEN 309 AND 346) OR 
            (id BETWEEN 348 AND 381)
          )
        )
      `);
    }
    
    // Check if ky3p_field_timestamps table exists and truncate it
    const ky3pFieldTimestampsTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ky3p_field_timestamps'
      )
    `);
    
    if (ky3pFieldTimestampsTableExists.rows[0]?.exists) {
      log('Truncating ky3p_field_timestamps table...', colors.blue);
      await client.query(`
        DELETE FROM ky3p_field_timestamps 
        WHERE task_id IN (
          SELECT id FROM tasks 
          WHERE company_id BETWEEN 252 AND 317
          OR assigned_to IN (
            SELECT id FROM users WHERE 
            (id BETWEEN 294 AND 304) OR 
            (id BETWEEN 309 AND 346) OR 
            (id BETWEEN 348 AND 381)
          )
          OR created_by IN (
            SELECT id FROM users WHERE 
            (id BETWEEN 294 AND 304) OR 
            (id BETWEEN 309 AND 346) OR 
            (id BETWEEN 348 AND 381)
          )
        )
      `);
    }
    
    log('Response tables truncated.', colors.green);
    
    // 2. Check for and delete from tables linking to companies or users
    log('\nChecking for additional tables with foreign keys to companies or users...', colors.blue);
    
    // Check if claims table exists
    const claimsTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'claims'
      )
    `);
    
    if (claimsTableExists.rows[0]?.exists) {
      log('Deleting claims for target companies...', colors.blue);
      await client.query(`
        DELETE FROM claims 
        WHERE company_id BETWEEN 252 AND 317
      `);
    }
    
    // Check if relationships table exists
    const relationshipsTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'relationships'
      )
    `);
    
    if (relationshipsTableExists.rows[0]?.exists) {
      log('Deleting relationships for target companies...', colors.blue);
      await client.query(`
        DELETE FROM relationships 
        WHERE company_id BETWEEN 252 AND 317 
        OR related_company_id BETWEEN 252 AND 317
      `);
    }
    
    // Check if company_logos table exists
    const companyLogosTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'company_logos'
      )
    `);
    
    if (companyLogosTableExists.rows[0]?.exists) {
      log('Deleting company logos for target companies...', colors.blue);
      await client.query(`
        DELETE FROM company_logos 
        WHERE company_id BETWEEN 252 AND 317
      `);
    }
    
    // Check if document_answers table exists and has foreign keys to files
    const documentAnswersTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'document_answers'
      )
    `);
    
    if (documentAnswersTableExists.rows[0]?.exists) {
      log('Checking for document_answers related to target files...', colors.blue);
      await client.query(`
        DELETE FROM document_answers 
        WHERE file_id IN (
          SELECT id FROM files WHERE company_id BETWEEN 252 AND 317
          UNION
          SELECT id FROM files WHERE user_id IN (
            SELECT id FROM users WHERE 
            (id BETWEEN 294 AND 304) OR 
            (id BETWEEN 309 AND 346) OR 
            (id BETWEEN 348 AND 381)
          )
        )
      `);
    }

    // 3. Delete files linked to the target companies and users
    log('\nDeleting files...', colors.blue);
    await client.query(`
      DELETE FROM files 
      WHERE company_id BETWEEN 252 AND 317
      OR user_id IN (
        SELECT id FROM users WHERE 
        (id BETWEEN 294 AND 304) OR 
        (id BETWEEN 309 AND 346) OR 
        (id BETWEEN 348 AND 381)
      )
    `);
    
    // 4. Delete invitations linked to target companies and tasks
    log('\nDeleting invitations...', colors.blue);
    await client.query(`
      DELETE FROM invitations 
      WHERE company_id BETWEEN 252 AND 317
      OR task_id IN (
        SELECT id FROM tasks 
        WHERE company_id BETWEEN 252 AND 317
        OR assigned_to IN (
          SELECT id FROM users WHERE 
          (id BETWEEN 294 AND 304) OR 
          (id BETWEEN 309 AND 346) OR 
          (id BETWEEN 348 AND 381)
        )
        OR created_by IN (
          SELECT id FROM users WHERE 
          (id BETWEEN 294 AND 304) OR 
          (id BETWEEN 309 AND 346) OR 
          (id BETWEEN 348 AND 381)
        )
      )
    `);
    
    // 5. Delete tasks linked to the target companies and users
    log('\nDeleting tasks...', colors.blue);
    await client.query(`
      DELETE FROM tasks 
      WHERE company_id BETWEEN 252 AND 317
      OR assigned_to IN (
        SELECT id FROM users WHERE 
        (id BETWEEN 294 AND 304) OR 
        (id BETWEEN 309 AND 346) OR 
        (id BETWEEN 348 AND 381)
      )
      OR created_by IN (
        SELECT id FROM users WHERE 
        (id BETWEEN 294 AND 304) OR 
        (id BETWEEN 309 AND 346) OR 
        (id BETWEEN 348 AND 381)
      )
    `);
    
    // 6. Delete all users associated with target companies first
    log('\nDeleting users associated with target companies...', colors.blue);
    await client.query(`
      DELETE FROM users 
      WHERE company_id BETWEEN 252 AND 317
    `);
    
    // 7. Then delete users in the specified ID ranges
    log('\nDeleting users in specified ID ranges...', colors.blue);
    await client.query(`
      DELETE FROM users 
      WHERE (id BETWEEN 294 AND 304) 
      OR (id BETWEEN 309 AND 346) 
      OR (id BETWEEN 348 AND 381)
    `);
    
    // 8. Finally, delete the companies
    log('\nDeleting companies...', colors.blue);
    await client.query(`
      DELETE FROM companies 
      WHERE id BETWEEN 252 AND 317
    `);
    
    // Commit transaction
    await client.query('COMMIT');
    
    log('\nDatabase cleanup completed successfully.', colors.green);
    
    // Count records after cleanup to verify
    log('\nVerifying cleanup results...', colors.blue);
    const afterCounts = await countRecords();
    
    log('\nRecords remaining after cleanup:', colors.green);
    for (const [table, count] of Object.entries(afterCounts)) {
      log(`  - ${table}: ${count}`, count > 0 ? colors.yellow : colors.green);
    }
    
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    log(`\nERROR: ${error.message}`, colors.red);
    log('Database cleanup failed and was rolled back.', colors.red);
    throw error;
  } finally {
    client.release();
  }
}

// Run the cleanup function
cleanupDatabase()
  .then(() => {
    log('\nCleanup process completed.', colors.green);
    process.exit(0);
  })
  .catch(error => {
    log(`\nFatal error: ${error.message}`, colors.red);
    process.exit(1);
  });