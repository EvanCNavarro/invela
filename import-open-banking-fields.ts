/**
 * Import Open Banking Survey Field Definitions
 * 
 * This script imports the 1033 Open Banking Survey field definitions from a CSV file
 * into the open_banking_fields table. It handles mapping from CSV columns to database fields,
 * and ensures appropriate data types are used.
 */

import { db } from './db';
import { openBankingFields } from './db/schema';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { Logger } from './server/utils/logger';

// ESM replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a logger instance
const logger = new Logger('OpenBankingImport');

function parseCSV(csvText: string): { headers: string[], rows: string[][] } {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(header => header.trim());
  
  const rows: string[][] = [];
  
  for (let i = 1; i < lines.length; i++) {
    rows.push(parseCSVLine(lines[i]));
  }
  
  return { headers, rows };
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let currentValue = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      // Toggle the inQuotes flag
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      // End of field
      values.push(currentValue.trim());
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  
  // Don't forget the last field
  values.push(currentValue.trim());
  
  return values;
}

async function importOpenBankingFields() {
  try {
    logger.info('[OpenBankingImport] Starting import of Open Banking fields');
    
    // Read the CSV file
    const csvPath = path.join(__dirname, 'attached_assets', '1033_Open_Banking_Survey_Field_Additions_Normalized.csv');
    
    if (!fs.existsSync(csvPath)) {
      logger.error(`[OpenBankingImport] CSV file not found at: ${csvPath}`);
      throw new Error(`CSV file not found at: ${csvPath}`);
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Parse the CSV
    const { headers, rows } = parseCSV(csvContent);
    logger.info(`[OpenBankingImport] Parsed CSV with ${rows.length} rows`);
    
    // Find the indices of columns we need
    const idIndex = headers.findIndex(h => h.includes('ID') || h.includes('id'));
    const orderIndex = headers.findIndex(h => h.includes('Order') || h.includes('order'));
    const fieldKeyIndex = headers.findIndex(h => h.includes('field_key'));
    const displayNameIndex = headers.findIndex(h => h.includes('display_name'));
    const questionIndex = headers.findIndex(h => h.includes('question'));
    const groupIndex = headers.findIndex(h => h.includes('group'));
    const fieldTypeIndex = headers.findIndex(h => h.includes('field_type'));
    const requiredIndex = headers.findIndex(h => h.includes('required'));
    const helpTextIndex = headers.findIndex(h => h.includes('help_text'));
    const demoAutofillIndex = headers.findIndex(h => h.includes('demo_autofill'));
    const answerExpectationIndex = headers.findIndex(h => h.includes('Answer Expectation'));
    const validationTypeIndex = headers.findIndex(h => h.includes('Validation Type'));
    const validationRulesIndex = headers.findIndex(h => h.includes('validation_rules'));
    const stepIndexIndex = headers.findIndex(h => h.includes('step_index'));
    
    // Before inserting, check if the table is empty or not
    try {
        const existingCount = await db.select({ count: db.fn.count() }).from(openBankingFields);
        console.log('Existing count query result:', existingCount);
        const hasExistingData = existingCount && existingCount[0] && parseInt(existingCount[0].count as any) > 0;
    } catch (error) {
        console.error('Error checking existing data:', error);
        // If there's an error, assume no existing data
        const hasExistingData = false;
    
    if (hasExistingData) {
      logger.info('[OpenBankingImport] Found existing data in openBankingFields table');
      
      // Prompt user to confirm if they want to continue
      console.log('WARNING: The open_banking_fields table already has data.');
      console.log('If you continue, existing data will remain and new rows may be duplicated.');
      console.log('It is recommended to clear the table first if you want a fresh import.');
      
      // We're continuing anyway for automation - but log this prominently
      logger.warn('[OpenBankingImport] Continuing with import despite existing data');
    }
    
    // Process and insert each row
    let insertedCount = 0;
    
    for (const row of rows) {
      try {
        const fieldData = {
          order: parseInt(row[orderIndex]),
          field_key: row[fieldKeyIndex],
          display_name: row[displayNameIndex],
          question: row[questionIndex],
          group: row[groupIndex],
          field_type: row[fieldTypeIndex],
          required: row[requiredIndex].toLowerCase() === 'true',
          help_text: row[helpTextIndex] || null,
          demo_autofill: row[demoAutofillIndex] || null,
          answer_expectation: row[answerExpectationIndex] || null,
          validation_type: row[validationTypeIndex] || null,
          validation_rules: row[validationRulesIndex] || null,
          step_index: row[stepIndexIndex] ? parseInt(row[stepIndexIndex]) : 0
        };
        
        await db.insert(openBankingFields).values(fieldData);
        insertedCount++;
      } catch (error) {
        logger.error(`[OpenBankingImport] Error inserting field: ${row[fieldKeyIndex]}`, { error });
      }
    }
    
    logger.info(`[OpenBankingImport] Successfully imported ${insertedCount} out of ${rows.length} fields`);
  } catch (error) {
    logger.error('[OpenBankingImport] Error importing Open Banking fields', { error });
    console.error('Detailed error:', error);
    throw error;
  }
}

async function run() {
  try {
    await importOpenBankingFields();
    process.exit(0);
  } catch (error) {
    logger.error('[OpenBankingImport] Failed to import fields', { error });
    process.exit(1);
  }
}

// Run the import
run();