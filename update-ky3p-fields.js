/**
 * Update KY3P Fields Database
 * 
 * This script reads the field mappings from the JSON file
 * and updates the demo_autofill values in the database.
 */

import fs from 'fs';
import { execute_sql_tool } from '@/server/tools/execute_sql_tool.js';

async function updateKy3pFields() {
  try {
    console.log('Starting KY3P demo_autofill database update...');
    
    // Read the JSON file with field mappings
    const fieldsData = JSON.parse(fs.readFileSync('./ky3p-fields-to-update.json', 'utf8'));
    console.log(`Loaded ${fieldsData.length} fields from JSON file`);
    
    // Get a list of all field_keys in the database
    const dbFields = await execute_sql_tool({
      sql_query: `SELECT field_key FROM ky3p_fields;`
    });
    
    const dbFieldKeys = dbFields.rows.map(row => row.field_key);
    console.log(`Found ${dbFieldKeys.length} fields in the database`);
    
    // Track statistics
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Update each field in the database
    for (const field of fieldsData) {
      if (!dbFieldKeys.includes(field.fieldKey)) {
        console.log(`Skipping field ${field.fieldKey} - not found in database`);
        skippedCount++;
        continue;
      }
      
      try {
        // Update the demo_autofill value for this field
        await execute_sql_tool({
          sql_query: `
            UPDATE ky3p_fields
            SET demo_autofill = '${field.demoAutofill.replace(/'/g, "''")}'
            WHERE field_key = '${field.fieldKey}';
          `
        });
        
        console.log(`Updated field: ${field.fieldKey}`);
        updatedCount++;
      } catch (error) {
        console.error(`Error updating field ${field.fieldKey}: ${error.message}`);
        errorCount++;
      }
    }
    
    // Print update summary
    console.log('\nUpdate Summary:');
    console.log(`- ${updatedCount} fields updated successfully`);
    console.log(`- ${skippedCount} fields skipped (not found in database)`);
    console.log(`- ${errorCount} errors encountered`);
    
    // Verify a few random fields
    console.log('\nVerifying random field updates:');
    const verifyResult = await execute_sql_tool({
      sql_query: `
        SELECT field_key, demo_autofill
        FROM ky3p_fields
        ORDER BY RANDOM()
        LIMIT 5;
      `
    });
    
    console.log('Sample of updated fields in the database:');
    verifyResult.rows.forEach(field => {
      console.log(`Field: ${field.field_key}`);
      console.log(`Demo Autofill: ${field.demo_autofill}\n`);
    });
    
    console.log('Database update completed.');
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
    console.error(error);
  }
}

// Start the update process
updateKy3pFields();