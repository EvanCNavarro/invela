/**
 * Database Cleanup Script
 * 
 * IMPORTANT: This script is DESTRUCTIVE and will PERMANENTLY DELETE data.
 * Run this only in development or test environments, NEVER in production.
 * Backup your database before running this script.
 * 
 * This script cleans up test data from the database by:
 * 1. Truncating response tables (kyb_responses, ky3p_responses, open_banking_responses)
 * 2. Truncating field timestamp tables (kyb_field_timestamps)
 * 3. Dropping unused tables
 * 4. Deleting test task_templates
 * 5. Deleting test users and invitations in ID range 209-293
 * 6. Truncating files table
 * 7. Deleting test companies in ID range 169-251
 * 8. Deleting test tasks in ID range 347-675
 */

import { db, pool } from "@db";
import { sql } from "drizzle-orm";
import * as readline from 'readline';

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || args.includes('-d');

// Confirmation function to ensure the user wants to proceed
function askForConfirmation(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${message} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

// Helper function to count records that would be deleted
async function countRecords(): Promise<Record<string, number>> {
  const counts = {
    kyb_responses: 0,
    ky3p_responses: 0,
    open_banking_responses: 0,
    kyb_field_timestamps: 0,
    files: 0,
    users: 0,
    invitations: 0,
    companies: 0,
    tasks: 0
  };
  
  try {
    const kybResponsesResult = await db.execute(sql`SELECT COUNT(*) FROM kyb_responses`);
    counts.kyb_responses = parseInt(kybResponsesResult.rows[0]?.count || '0');
    
    const ky3pResponsesResult = await db.execute(sql`SELECT COUNT(*) FROM ky3p_responses`);
    counts.ky3p_responses = parseInt(ky3pResponsesResult.rows[0]?.count || '0');
    
    const obResponsesResult = await db.execute(sql`SELECT COUNT(*) FROM open_banking_responses`);
    counts.open_banking_responses = parseInt(obResponsesResult.rows[0]?.count || '0');
    
    const kybTimestampsResult = await db.execute(sql`SELECT COUNT(*) FROM kyb_field_timestamps`);
    counts.kyb_field_timestamps = parseInt(kybTimestampsResult.rows[0]?.count || '0');
    
    const filesResult = await db.execute(sql`SELECT COUNT(*) FROM files`);
    counts.files = parseInt(filesResult.rows[0]?.count || '0');
    
    const usersResult = await db.execute(sql`SELECT COUNT(*) FROM users WHERE id BETWEEN 209 AND 293`);
    counts.users = parseInt(usersResult.rows[0]?.count || '0');
    
    const invitationsResult = await db.execute(sql`SELECT COUNT(*) FROM invitations WHERE id BETWEEN 217 AND 300`);
    counts.invitations = parseInt(invitationsResult.rows[0]?.count || '0');
    
    const companiesResult = await db.execute(sql`SELECT COUNT(*) FROM companies WHERE id BETWEEN 169 AND 251`);
    counts.companies = parseInt(companiesResult.rows[0]?.count || '0');
    
    const tasksResult = await db.execute(sql`SELECT COUNT(*) FROM tasks WHERE id BETWEEN 347 AND 675`);
    counts.tasks = parseInt(tasksResult.rows[0]?.count || '0');
    
    return counts;
  } catch (error) {
    console.error('Error counting records:', error);
    return counts;
  }
}

async function cleanupDatabase() {
  console.log('\n\x1b[31m%s\x1b[0m', '⚠️  WARNING: This script will permanently delete data from the database!');
  console.log('\x1b[31m%s\x1b[0m', '    This operation cannot be undone.\n');
  
  // Show dry run information if requested
  if (isDryRun) {
    console.log('\x1b[33m%s\x1b[0m', '📝 DRY RUN MODE: No actual changes will be made to the database.\n');
    
    console.log('Counting records that would be affected...');
    const counts = await countRecords();
    
    console.log('\n📊 Records that would be affected:');
    console.log('--------------------------------');
    console.log(`KYB Responses: ${counts.kyb_responses}`);
    console.log(`KY3P Responses: ${counts.ky3p_responses}`);
    console.log(`Open Banking Responses: ${counts.open_banking_responses}`);
    console.log(`KYB Field Timestamps: ${counts.kyb_field_timestamps}`);
    console.log(`Files: ${counts.files}`);
    console.log(`Users (ID range 209-293): ${counts.users}`);
    console.log(`Invitations (ID range 217-300): ${counts.invitations}`);
    console.log(`Companies (ID range 169-251): ${counts.companies}`);
    console.log(`Tasks (ID range 347-675): ${counts.tasks}`);
    console.log('--------------------------------');
    
    console.log('\nTo execute the actual cleanup, run this script without the --dry-run flag.');
    return;
  }
  
  // Ask for confirmation before proceeding with actual changes
  const confirmed = await askForConfirmation('Are you sure you want to proceed with database cleanup?');
  
  if (!confirmed) {
    console.log('Database cleanup cancelled by user.');
    return;
  }
  console.log('Starting database cleanup...');
  
  try {
    // Begin transaction
    await db.execute(sql`BEGIN`);
    
    // 1. Truncate response tables
    console.log('Truncating response tables...');
    await db.execute(sql`TRUNCATE TABLE kyb_responses`);
    await db.execute(sql`TRUNCATE TABLE ky3p_responses`);
    await db.execute(sql`TRUNCATE TABLE open_banking_responses`);
    console.log('Response tables truncated successfully.');
    
    // 2. Truncate field timestamp tables
    console.log('Truncating field timestamp tables...');
    await db.execute(sql`TRUNCATE TABLE kyb_field_timestamps`);
    console.log('Field timestamp tables truncated successfully.');
    
    // 3. Check if tables exist before dropping them
    console.log('Checking for unused tables...');
    
    // Check if kyb_fields_archive exists
    const archiveTableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'kyb_fields_archive'
      )
    `);
    
    if (archiveTableExists.rows[0]?.exists) {
      console.log('Dropping kyb_fields_archive table...');
      // Use direct SQL for DDL statement with CASCADE
      await db.execute(sql`DROP TABLE IF EXISTS kyb_fields_archive CASCADE`);
    } else {
      console.log('kyb_fields_archive table does not exist.');
    }
    
    // Check and drop card/security related tables
    const tablesToCheck = [
      'card_fields', 'card_responses', 'security_fields', 'security_responses'
    ];
    
    for (const table of tablesToCheck) {
      const tableExists = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${table}
        )
      `);
      
      if (tableExists.rows[0]?.exists) {
        console.log(`Dropping ${table} table...`);
        // Use a direct string for table name with IF EXISTS and CASCADE to prevent errors with dependencies
        // This is safe since we're using a fixed list of table names from our own code
        if (table === 'card_fields') {
          await db.execute(sql`DROP TABLE IF EXISTS card_fields CASCADE`);
        } else if (table === 'card_responses') {
          await db.execute(sql`DROP TABLE IF EXISTS card_responses CASCADE`);
        } else if (table === 'security_fields') {
          await db.execute(sql`DROP TABLE IF EXISTS security_fields CASCADE`);
        } else if (table === 'security_responses') {
          await db.execute(sql`DROP TABLE IF EXISTS security_responses CASCADE`);
        }
      } else {
        console.log(`${table} table does not exist.`);
      }
    }
    
    // 4. Delete component configurations first (due to foreign key constraint)
    console.log('Deleting component configurations linked to unused task templates...');
    await db.execute(sql`
      DELETE FROM component_configurations 
      WHERE template_id IN (
        SELECT id FROM task_templates 
        WHERE task_type IN ('company_card', 'security_assessment', 'card_application')
      )
    `);
    console.log('Component configurations deleted.');
    
    // Now delete the task templates
    console.log('Deleting unused task templates...');
    await db.execute(sql`
      DELETE FROM task_templates 
      WHERE task_type IN ('company_card', 'security_assessment', 'card_application')
    `);
    console.log('Task templates deleted.');
    
    // 5. Delete test users and invitations
    console.log('Deleting test users...');
    // First delete any foreign key references to users
    console.log('Deleting user-related foreign key references...');
    
    // Delete session records for test users
    console.log('Deleting session records for test users...');
    await db.execute(sql`
      DELETE FROM session
      WHERE sess::text LIKE ANY (ARRAY[
        '%"user":209%', '%"user":210%', '%"user":211%', '%"user":212%',
        '%"user":213%', '%"user":214%', '%"user":215%', '%"user":216%',
        '%"user":217%', '%"user":218%', '%"user":219%', '%"user":220%',
        '%"user":221%', '%"user":222%', '%"user":223%', '%"user":224%',
        '%"user":225%', '%"user":226%', '%"user":227%', '%"user":228%',
        '%"user":229%', '%"user":230%', '%"user":231%', '%"user":232%',
        '%"user":233%', '%"user":234%', '%"user":235%', '%"user":236%',
        '%"user":237%', '%"user":238%', '%"user":239%', '%"user":240%',
        '%"user":241%', '%"user":242%', '%"user":243%', '%"user":244%',
        '%"user":245%', '%"user":246%', '%"user":247%', '%"user":248%',
        '%"user":249%', '%"user":250%', '%"user":251%', '%"user":252%',
        '%"user":253%', '%"user":254%', '%"user":255%', '%"user":256%',
        '%"user":257%', '%"user":258%', '%"user":259%', '%"user":260%',
        '%"user":261%', '%"user":262%', '%"user":263%', '%"user":264%',
        '%"user":265%', '%"user":266%', '%"user":267%', '%"user":268%',
        '%"user":269%', '%"user":270%', '%"user":271%', '%"user":272%',
        '%"user":273%', '%"user":274%', '%"user":275%', '%"user":276%',
        '%"user":277%', '%"user":278%', '%"user":279%', '%"user":280%',
        '%"user":281%', '%"user":282%', '%"user":283%', '%"user":284%',
        '%"user":285%', '%"user":286%', '%"user":287%', '%"user":288%',
        '%"user":289%', '%"user":290%', '%"user":291%', '%"user":292%',
        '%"user":293%'
      ])
    `);
    
    // Now delete users
    await db.execute(sql`DELETE FROM users WHERE id BETWEEN 209 AND 293`);
    await db.execute(sql`DELETE FROM invitations WHERE id BETWEEN 217 AND 300`);
    console.log('Test users and invitations deleted.');
    
    // 6. Delete all files
    console.log('Truncating files table...');
    await db.execute(sql`TRUNCATE TABLE files`);
    console.log('Files table truncated.');
    
    // 7. Delete test companies and tasks
    // First delete any tasks associated with companies to avoid foreign key constraints
    console.log('Deleting test tasks...');
    await db.execute(sql`DELETE FROM tasks WHERE id BETWEEN 347 AND 675`);
    console.log('Test tasks deleted.');
    
    // Delete any task dependencies
    console.log('Deleting task dependencies...');
    await db.execute(sql`DELETE FROM task_dependencies WHERE task_id BETWEEN 347 AND 675 OR dependent_task_id BETWEEN 347 AND 675`);
    
    // Delete any user-company relationships first
    console.log('Deleting company-related foreign key references...');
    await db.execute(sql`DELETE FROM user_company_roles WHERE company_id BETWEEN 169 AND 251`);
    
    // Now delete companies
    console.log('Deleting test companies...');
    await db.execute(sql`DELETE FROM companies WHERE id BETWEEN 169 AND 251`);
    console.log('Test companies deleted.');
    
    // Commit transaction
    await db.execute(sql`COMMIT`);
    
    console.log('Database cleanup completed successfully!');
  } catch (error) {
    // Rollback transaction on error
    await db.execute(sql`ROLLBACK`);
    console.error('Error during database cleanup:', error);
    console.error('Transaction rolled back.');
    throw error;
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the cleanup function
cleanupDatabase().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});