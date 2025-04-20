/**
 * Import S&P KY3P Security Assessment Field Definitions
 * 
 * This script imports the S&P KY3P Security Assessment field definitions from a CSV file
 * into the ky3p_fields table. It handles mapping from CSV columns to database fields,
 * and ensures appropriate data types are used.
 */

import { db } from './db';
import { ky3pFields } from './db/schema';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

// Workaround for the csv-parse package
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

// Simple CSV parser function
function parseCSV(csvData: string): Record<string, string>[] {
  const lines = csvData.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  const records: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const record: Record<string, string> = {};
    
    for (let j = 0; j < headers.length; j++) {
      record[headers[j]] = values[j] ? values[j].trim() : '';
    }
    
    records.push(record);
  }
  
  return records;
}

// Map column names from CSV to database field names
const csvToDbFieldMap = {
  'ID (id)': 'id',
  'Order (order)': 'order',
  'Field Key (field_key)': 'field_key',
  'Label (label)': 'label',
  'Question (description)': 'description',
  'Help Text (help_text)': 'help_text',
  'Demo Autofill Answer (demo_autofill)': 'demo_autofill',
  'Group (section)': 'section',
  'Field Type (field_type)': 'field_type',
  'Required (is_required)': 'is_required',
  'Answer Expectation': 'answer_expectation',
  'Validation Type': 'validation_type',
  'Phasing': 'phasing',
  'SOC2 Overlap': 'soc2_overlap',
  'validation_rules': 'validation_rules',
  'step_index': 'step_index'
};

async function importKy3pFields() {
  console.log('Starting S&P KY3P Security Assessment field import...');
  
  try {
    // Read the CSV file
    const csvFilePath = path.resolve('./attached_assets/S&P_KY3P_Security_Assessment_Field_Additions_Normalized.csv');
    const csvData = fs.readFileSync(csvFilePath, 'utf8');
    
    // Parse the CSV file using our custom parser
    const records = parseCSV(csvData);
    
    console.log(`Found ${records.length} KY3P field definitions in CSV file`);
    
    // Transform CSV records to database field format
    const fieldsToInsert = records.map((record, index) => {
      // Safe parseInt that handles empty or invalid values
      const safeParseInt = (value: string | undefined, defaultValue: number = 0): number => {
        if (!value || value.trim() === '') return defaultValue;
        const parsed = parseInt(value);
        return isNaN(parsed) ? defaultValue : parsed;
      };
      
      return {
        id: safeParseInt(record['ID (id)'], index + 1),
        order: safeParseInt(record['Order (order)'], index + 1),
        field_key: record['Field Key (field_key)'] || `field_${index + 1}`,
        label: record['Label (label)'] || `Field ${index + 1}`,
        description: record['Question (description)'] || '',
        help_text: record['Help Text (help_text)'] || null,
        demo_autofill: record['Demo Autofill Answer (demo_autofill)'] || null,
        section: record['Group (section)'] || 'General',
        field_type: record['Field Type (field_type)'] || 'TEXT',
        is_required: record['Required (is_required)'] === 'TRUE',
        answer_expectation: record['Answer Expectation'] || null,
        validation_type: record['Validation Type'] || null,
        phasing: record['Phasing'] || null,
        soc2_overlap: record['SOC2 Overlap'] || null,
        validation_rules: record['validation_rules'] || null,
        step_index: safeParseInt(record['step_index']),
        created_at: new Date(),
        updated_at: new Date()
      };
    });
    
    console.log('Transformed field data, preparing to insert into database...');
    
    // First, check if we have any existing KY3P fields using SQL directly
    const existingFieldsCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM ky3p_fields;
    `);
    
    const count = parseInt(existingFieldsCount.rows[0]?.count || '0');
    
    if (count > 0) {
      console.log(`Found ${count} existing KY3P fields in database, truncating table first...`);
      await db.execute(sql`TRUNCATE TABLE ky3p_fields CASCADE;`);
    }
    
    // Insert the fields into the database
    const result = await db.insert(ky3pFields).values(fieldsToInsert);
    
    console.log(`Successfully imported ${fieldsToInsert.length} KY3P fields`);
  } catch (error) {
    console.error('Error importing KY3P fields:', error);
    process.exit(1);
  }
}

// Run the import function
importKy3pFields().then(() => {
  console.log('KY3P field import completed successfully');
  process.exit(0);
});