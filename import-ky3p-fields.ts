/**
 * Import S&P KY3P Security Assessment Field Definitions
 * 
 * This script imports the S&P KY3P Security Assessment field definitions from a CSV file
 * into the ky3p_fields table. It handles mapping from CSV columns to database fields,
 * and ensures appropriate data types are used.
 */

import { db } from './db';
import { ky3pFields } from './db/schema';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import path from 'path';

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
    
    // Parse the CSV file
    const records = parse(csvData, { 
      columns: true, 
      skip_empty_lines: true,
      trim: true
    });
    
    console.log(`Found ${records.length} KY3P field definitions in CSV file`);
    
    // Transform CSV records to database field format
    const fieldsToInsert = records.map(record => ({
      id: parseInt(record['ID (id)']),
      order: parseInt(record['Order (order)']),
      field_key: record['Field Key (field_key)'],
      label: record['Label (label)'],
      description: record['Question (description)'],
      help_text: record['Help Text (help_text)'],
      demo_autofill: record['Demo Autofill Answer (demo_autofill)'],
      section: record['Group (section)'],
      field_type: record['Field Type (field_type)'],
      is_required: record['Required (is_required)'] === 'TRUE',
      answer_expectation: record['Answer Expectation'],
      validation_type: record['Validation Type'],
      phasing: record['Phasing'],
      soc2_overlap: record['SOC2 Overlap'],
      validation_rules: record['validation_rules'] || null,
      step_index: record['step_index'] ? parseInt(record['step_index']) : 0,
      created_at: new Date(),
      updated_at: new Date()
    }));
    
    console.log('Transformed field data, preparing to insert into database...');
    
    // First, check if we have any existing KY3P fields
    const existingFields = await db.select({ count: { value: db.fn.count() } })
      .from(ky3pFields);
    
    if (existingFields[0].count.value > 0) {
      console.log(`Found ${existingFields[0].count.value} existing KY3P fields in database, truncating table first...`);
      await db.delete(ky3pFields);
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