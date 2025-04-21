/**
 * Update KY3P fields with the new groups and questions from CSV
 * 
 * This script imports the revised S&P KY3P Security Assessment field definitions 
 * from a CSV file into the ky3p_fields table, updating the existing records 
 * with the new group names and questions.
 */

import { db } from './db';
import { ky3pFields } from './db/schema';
import fs from 'fs';
import { eq } from 'drizzle-orm';

// Helper function to parse CSV
function parseCSV(csvData: string): Record<string, string>[] {
  const rows = csvData.split('\n');
  const headers = rows[0].split(',');
  
  const result: Record<string, string>[] = [];
  
  // Skip header row
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i].trim()) continue;
    
    const values = parseCSVLine(rows[i]);
    const rowData: Record<string, string> = {};
    
    for (let j = 0; j < headers.length && j < values.length; j++) {
      rowData[headers[j]] = values[j];
    }
    
    result.push(rowData);
  }
  
  return result;
}

// Helper function to parse a CSV line (handling quoted fields with commas)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let inQuotes = false;
  let currentValue = '';
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(currentValue);
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  
  // Add the last value
  result.push(currentValue);
  
  return result;
}

async function updateFields() {
  try {
    console.log('Reading CSV file...');
    const csvData = fs.readFileSync('./attached_assets/S&P_KY3P_Security_Assessment_4Groups_Final.csv', 'utf-8');
    
    console.log('Parsing CSV data...');
    const parsedData = parseCSV(csvData);
    
    console.log(`Found ${parsedData.length} rows in CSV.`);
    
    for (const row of parsedData) {
      const id = parseInt(row['ID (id)'] || '0', 10);
      const fieldKey = row['Field Key (field_key)'];
      const label = row['Label (label)'];
      const question = row['Question (question)'];
      const helpText = row['Help Text (help_text)'];
      const demoAutofill = row['Demo Autofill Answer (demo_autofill)'];
      const group = row['group'];  // New group value
      const fieldType = row['Field Type (field_type)'];
      const isRequired = row['Required (is_required)'] === 'TRUE';
      const answerExpectation = row['Answer Expectation'];
      const validationType = row['Validation Type'];
      const stepIndex = parseInt(row['step_index'] || '0', 10);
      
      if (id <= 0 || !fieldKey) {
        console.warn(`Skipping row with invalid ID or field key: ${row['ID (id)']}, ${fieldKey}`);
        continue;
      }
      
      // Update the field in the database
      console.log(`Updating field ${id}: ${fieldKey} (group: ${group})`);
      
      await db.update(ky3pFields)
        .set({
          field_key: fieldKey,
          label,
          question,  // Using question instead of description
          help_text: helpText,
          demo_autofill: demoAutofill,
          group,  // Using group instead of section
          field_type: fieldType,
          is_required: isRequired,
          answer_expectation: answerExpectation,
          validation_type: validationType,
          step_index: stepIndex
        })
        .where(eq(ky3pFields.id, id));
    }
    
    console.log('KY3P fields updated successfully!');
  } catch (error) {
    console.error('Error updating KY3P fields:', error);
    process.exit(1);
  }
}

// Run the update
updateFields();