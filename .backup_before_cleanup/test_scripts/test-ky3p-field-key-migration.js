/**
 * Test script for KY3P field_key migration
 * 
 * This script tests the migration of KY3P responses from using numeric field_id to
 * using string-based field_key references.
 */

// Import required modules
const { db } = require('./server/db');
const { ky3pFields, ky3pResponses } = require('./db/schema');
const { eq, sql, isNull, and } = require('drizzle-orm');

// ANSI color codes for better readability
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Log a message with color
 */
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Count responses without field_key
 */
async function countResponsesWithoutFieldKey() {
  try {
    const result = await db.select({
      count: sql`COUNT(*)`,
    })
    .from(ky3pResponses)
    .where(
      and(
        isNull(ky3pResponses.field_key),
        sql`${ky3pResponses.field_id} IS NOT NULL`
      )
    );
    
    return parseInt(result?.[0]?.count || '0', 10);
  } catch (error) {
    log(`Error counting responses without field_key: ${error.message}`, colors.red);
    return 0;
  }
}

/**
 * Count KY3P fields with field_key
 */
async function countFieldsWithFieldKey() {
  try {
    const result = await db.select({
      count: sql`COUNT(*)`,
    })
    .from(ky3pFields)
    .where(sql`${ky3pFields.field_key} IS NOT NULL`);
    
    return parseInt(result?.[0]?.count || '0', 10);
  } catch (error) {
    log(`Error counting fields with field_key: ${error.message}`, colors.red);
    return 0;
  }
}

/**
 * Run the migration
 */
async function runMigration() {
  // Import the migration function dynamically (ES modules)
  const { populateKy3pResponseFieldKeys } = await import('./server/utils/ky3p-field-key-migration.js');
  
  const result = await populateKy3pResponseFieldKeys();
  log(`Migration result: ${JSON.stringify(result, null, 2)}`, result.success ? colors.green : colors.red);
  
  return result;
}

/**
 * Main test function
 */
async function runTest() {
  try {
    log('\n==== KY3P Field Key Migration Test ====', colors.cyan);
    
    // Check initial state
    log('\nChecking initial state...', colors.yellow);
    const initialFieldCount = await countFieldsWithFieldKey();
    const initialMissingCount = await countResponsesWithoutFieldKey();
    
    log(`KY3P fields with field_key: ${initialFieldCount}`, colors.blue);
    log(`KY3P responses missing field_key: ${initialMissingCount}`, colors.blue);
    
    if (initialFieldCount === 0) {
      log('\nERROR: No KY3P fields have field_key values. Migration cannot proceed.', colors.red);
      log('Please make sure KY3P fields have been properly set up with field_key values.', colors.red);
      process.exit(1);
    }
    
    if (initialMissingCount === 0) {
      log('\nNo KY3P responses are missing field_key values. No migration needed.', colors.green);
      process.exit(0);
    }
    
    // Run migration
    log('\nRunning migration...', colors.yellow);
    const migrationResult = await runMigration();
    
    // Check final state
    log('\nChecking final state...', colors.yellow);
    const finalMissingCount = await countResponsesWithoutFieldKey();
    
    log(`KY3P responses still missing field_key: ${finalMissingCount}`, colors.blue);
    
    if (finalMissingCount === 0) {
      log('\nSUCCESS: All KY3P responses now have field_key values.', colors.green);
    } else if (finalMissingCount < initialMissingCount) {
      log(`\nPARTIAL SUCCESS: ${initialMissingCount - finalMissingCount} KY3P responses were migrated.`, colors.yellow);
      log(`${finalMissingCount} responses still missing field_key values.`, colors.yellow);
    } else {
      log('\nFAILED: Migration did not reduce the number of responses missing field_key values.', colors.red);
    }
    
  } catch (error) {
    log(`\nTest error: ${error.message}`, colors.red);
    log(error.stack, colors.red);
    process.exit(1);
  }
}

// Run the test
runTest();
