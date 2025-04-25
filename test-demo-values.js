/**
 * Simple test script to verify demo_autofill values in database
 * 
 * This script uses direct SQL queries with the pg package
 * to check for demo values in the database.
 */

import pg from 'pg';
const { Pool } = pg;

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Function to check demo values for a specific form type
async function checkDemoValues(formType) {
  let tableName;
  switch (formType) {
    case 'kyb':
      tableName = 'kyb_fields';
      break;
    case 'ky3p':
      tableName = 'ky3p_fields';
      break;
    case 'open_banking':
      tableName = 'open_banking_fields';
      break;
    default:
      throw new Error(`Unknown form type: ${formType}`);
  }
  
  console.log(`\nChecking demo values for ${formType} (${tableName})...`);
  
  try {
    // Count total fields
    const totalCountResult = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
    const totalCount = parseInt(totalCountResult.rows[0].count, 10);
    
    // Count fields with demo values
    const demoCountResult = await pool.query(
      `SELECT COUNT(*) FROM ${tableName} WHERE demo_autofill IS NOT NULL AND demo_autofill != ''`
    );
    const demoCount = parseInt(demoCountResult.rows[0].count, 10);
    
    // Get sample demo values
    const sampleResult = await pool.query(
      `SELECT id, field_key, demo_autofill FROM ${tableName} 
       WHERE demo_autofill IS NOT NULL AND demo_autofill != '' 
       ORDER BY id LIMIT 5`
    );
    
    const percentage = Math.round((demoCount / totalCount) * 100);
    
    console.log(`Total fields: ${totalCount}`);
    console.log(`Fields with demo values: ${demoCount} (${percentage}%)`);
    
    if (sampleResult.rows.length > 0) {
      console.log('\nSample demo values:');
      sampleResult.rows.forEach(row => {
        const truncatedValue = row.demo_autofill.length > 50 
          ? row.demo_autofill.substring(0, 50) + '...' 
          : row.demo_autofill;
        console.log(`  ID ${row.id} (${row.field_key}): ${truncatedValue}`);
      });
    } else {
      console.log('No sample demo values found.');
    }
    
    return { totalCount, demoCount, percentage, samples: sampleResult.rows };
  } catch (error) {
    console.error(`Error checking demo values for ${formType}:`, error);
    throw error;
  }
}

// Main function to run tests
async function runTests() {
  try {
    console.log('===== DEMO VALUE VERIFICATION TEST =====');
    console.log('Testing if fields have demo_autofill values in database');
    console.log('Date:', new Date().toISOString());
    console.log('========================================\n');
    
    await checkDemoValues('kyb');
    await checkDemoValues('ky3p');
    await checkDemoValues('open_banking');
    
    console.log('\n========================================');
    console.log('✅ Test completed successfully');
  } catch (error) {
    console.error('Error running tests:', error);
  } finally {
    // Close the connection pool
    await pool.end();
    process.exit(0);
  }
}

// Run the tests
runTests();