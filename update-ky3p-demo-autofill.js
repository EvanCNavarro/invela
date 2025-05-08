/**
 * Update KY3P Demo Autofill Data
 * 
 * This script reads the CSV file with updated demo_autofill values for KY3P fields
 * and updates the database with these new values.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { db } from './dist/db/index.js';
import { sql } from 'drizzle-orm';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color formatting for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

// Logger function
function log(message, color = colors.reset) {
  console.log(`${color}[KY3P Demo Autofill Update] ${message}${colors.reset}`);
}

/**
 * Main function to update KY3P demo_autofill data
 */
async function updateKy3pDemoAutofill() {
  try {
    log('Starting KY3P demo_autofill data update...', colors.blue);
    
    // Path to the CSV file with new demo_autofill values
    const csvFilePath = path.resolve('./attached_assets/S&P_KY3P_Security_Assessment_4Groups_Final.csv');
    
    if (!fs.existsSync(csvFilePath)) {
      log('CSV file not found!', colors.red);
      log(`Checked path: ${csvFilePath}`, colors.red);
      return;
    }
    
    log(`Reading CSV file: ${csvFilePath}`, colors.blue);
    
    // Read the CSV file
    const csvData = fs.readFileSync(csvFilePath, 'utf8');
    
    // Parse CSV data
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    log(`Parsed ${records.length} records from CSV file`, colors.green);
    
    // Create a map of field_key to demo_autofill values
    const demoAutofillMap = new Map();
    
    records.forEach(record => {
      const fieldKey = record['Field Key (field_key)'];
      const demoAutofill = record['Demo Autofill Answer (demo_autofill)'];
      
      if (fieldKey && demoAutofill) {
        demoAutofillMap.set(fieldKey, demoAutofill);
      }
    });
    
    log(`Extracted ${demoAutofillMap.size} field_key to demo_autofill mappings`, colors.green);
    
    // Get current values from the database for comparison
    const currentFields = await db.execute(sql`
      SELECT id, field_key, demo_autofill
      FROM ky3p_fields
    `);
    
    log(`Retrieved ${currentFields.rows.length} fields from database`, colors.blue);
    
    // Create a map of field_key to current demo_autofill values
    const currentDemoAutofillMap = new Map();
    
    currentFields.rows.forEach(field => {
      currentDemoAutofillMap.set(field.field_key, field.demo_autofill);
    });
    
    // Initialize counters
    let updatedCount = 0;
    let unchangedCount = 0;
    let errorCount = 0;
    
    // Log some examples of changes for verification
    log('Sample of changes to be made:', colors.cyan);
    let exampleCount = 0;
    
    for (const [fieldKey, newDemoAutofill] of demoAutofillMap.entries()) {
      const currentDemoAutofill = currentDemoAutofillMap.get(fieldKey);
      
      if (exampleCount < 3 && currentDemoAutofill !== newDemoAutofill) {
        log(`Field: ${fieldKey}`, colors.cyan);
        log(`  Current: ${currentDemoAutofill}`, colors.yellow);
        log(`  New: ${newDemoAutofill}`, colors.green);
        exampleCount++;
      }
    }
    
    // Confirm before proceeding
    log('Ready to update database. Proceeding with updates...', colors.blue);
    
    // Update the database
    for (const [fieldKey, newDemoAutofill] of demoAutofillMap.entries()) {
      try {
        // Only update if the demo_autofill value is different
        const currentDemoAutofill = currentDemoAutofillMap.get(fieldKey);
        
        if (currentDemoAutofill !== newDemoAutofill) {
          // Update the demo_autofill value in the database
          await db.execute(sql`
            UPDATE ky3p_fields
            SET demo_autofill = ${newDemoAutofill}
            WHERE field_key = ${fieldKey}
          `);
          
          log(`Updated field_key "${fieldKey}"`, colors.green);
          updatedCount++;
        } else {
          unchangedCount++;
        }
      } catch (error) {
        log(`Error updating field_key "${fieldKey}": ${error.message}`, colors.red);
        errorCount++;
      }
    }
    
    // Log results
    log(`Update completed with the following results:`, colors.blue);
    log(`  ${updatedCount} fields updated`, colors.green);
    log(`  ${unchangedCount} fields unchanged`, colors.yellow);
    log(`  ${errorCount} errors occurred`, errorCount > 0 ? colors.red : colors.yellow);
    
    // Get the updated values from the database
    const updatedFields = await db.execute(sql`
      SELECT id, field_key, demo_autofill
      FROM ky3p_fields
      ORDER BY field_key
      LIMIT 5
    `);
    
    log('Sample of updated fields in the database:', colors.cyan);
    updatedFields.rows.forEach(field => {
      log(`Field: ${field.field_key}`, colors.cyan);
      log(`  Demo Autofill: ${field.demo_autofill}`, colors.green);
    });
    
  } catch (error) {
    log(`Error: ${error.message}`, colors.red);
    console.error(error);
  }
}

// Run the update function
updateKy3pDemoAutofill().then(() => {
  log('Process completed', colors.green);
}).catch(error => {
  log(`Process failed: ${error.message}`, colors.red);
  console.error(error);
});