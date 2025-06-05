/**
 * Parse KY3P Fields CSV
 * 
 * This script parses the S&P_KY3P_Security_Assessment_4Groups_Final.csv file
 * and extracts the field_key and demo_autofill values to prepare for database updates.
 */

import fs from 'fs';
import { parse } from 'csv-parse/sync';

// Read the CSV file
const csvFilePath = './attached_assets/S&P_KY3P_Security_Assessment_4Groups_Final.csv';
const csvData = fs.readFileSync(csvFilePath, 'utf8');

// Parse the CSV data
const records = parse(csvData, {
  columns: true,
  skip_empty_lines: true,
  trim: true
});

// Extract field_key and demo_autofill values
const fieldsMap = [];

records.forEach(record => {
  const fieldKey = record['Field Key (field_key)'];
  const demoAutofill = record['Demo Autofill Answer (demo_autofill)'];
  
  if (fieldKey && demoAutofill) {
    fieldsMap.push({
      fieldKey,
      demoAutofill
    });
  }
});

// Output the results
console.log(`Found ${fieldsMap.length} fields with demo_autofill values`);
console.log('\nSample of fields to update:');

// Show first 5 fields as examples
for (let i = 0; i < Math.min(5, fieldsMap.length); i++) {
  const field = fieldsMap[i];
  console.log(`\nField Key: ${field.fieldKey}`);
  console.log(`Demo Autofill: ${field.demoAutofill}`);
}

// Save the fields to a JSON file for reference
fs.writeFileSync('ky3p-fields-to-update.json', JSON.stringify(fieldsMap, null, 2));
console.log('\nAll fields saved to ky3p-fields-to-update.json for reference');