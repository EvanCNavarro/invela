/**
 * Full KY3P Fields Update Script
 * 
 * This script reads all field keys and demo_autofill values from the CSV file
 * and creates a single SQL update statement to update all fields at once.
 */

import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { execSync } from 'child_process';

// Read the CSV file
const csvFilePath = './attached_assets/S&P_KY3P_Security_Assessment_4Groups_Final.csv';
const csvData = fs.readFileSync(csvFilePath, 'utf8');

// Parse the CSV data
const records = parse(csvData, {
  columns: true,
  skip_empty_lines: true,
  trim: true
});

console.log(`Parsed ${records.length} records from CSV file`);

// Build the SQL statement
let sql = `
-- Create a temporary table for all the fields with their demo_autofill values
CREATE TEMPORARY TABLE temp_all_ky3p_fields (
  field_key TEXT PRIMARY KEY,
  demo_autofill TEXT
);

-- Insert all values
INSERT INTO temp_all_ky3p_fields (field_key, demo_autofill) VALUES
`;

// Add all the field data
records.forEach((record, index) => {
  const fieldKey = record['Field Key (field_key)'];
  const demoAutofill = record['Demo Autofill Answer (demo_autofill)'];
  
  if (fieldKey && demoAutofill) {
    // Replace single quotes with double single quotes for SQL
    const escapedDemoAutofill = demoAutofill.replace(/'/g, "''");
    
    sql += `('${fieldKey}', '${escapedDemoAutofill}')`;
    
    // Add a comma if it's not the last item
    if (index < records.length - 1) {
      sql += ',\n';
    } else {
      sql += ';\n';
    }
  }
});

// Add the update statement
sql += `
-- Update all fields in one go
UPDATE ky3p_fields AS kf
SET demo_autofill = tf.demo_autofill
FROM temp_all_ky3p_fields AS tf
WHERE kf.field_key = tf.field_key;

-- Check how many fields were updated
SELECT COUNT(*) AS fields_updated
FROM ky3p_fields AS kf
JOIN temp_all_ky3p_fields AS tf
ON kf.field_key = tf.field_key;

-- Sample of updated fields
SELECT field_key, demo_autofill
FROM ky3p_fields
ORDER BY RANDOM()
LIMIT 5;

-- Drop the temporary table
DROP TABLE temp_all_ky3p_fields;
`;

// Write the SQL file
const sqlFilePath = './full-ky3p-update.sql';
fs.writeFileSync(sqlFilePath, sql);

console.log(`SQL file created at ${sqlFilePath}`);
console.log('Execute the SQL file with:');
console.log('cat full-ky3p-update.sql | psql $DATABASE_URL');

// Try to execute the SQL directly
try {
  console.log('Attempting to execute SQL...');
  execSync(`cat ${sqlFilePath} | psql $DATABASE_URL`, { stdio: 'inherit' });
  console.log('SQL executed successfully!');
} catch (error) {
  console.error('Error executing SQL:', error.message);
  console.log('Please execute the SQL file manually as shown above.');
}