/**
 * Import Open Banking Survey Field Definitions (Complete)
 * 
 * This script imports all 45 Open Banking Survey field definitions 
 * from the provided CSV file into the open_banking_fields table.
 */
import { db, pool } from './db';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { sql } from 'drizzle-orm';

/**
 * Parse CSV with proper handling of quoted fields containing commas
 */
function parseCSV(csvText: string): { headers: string[], rows: string[][] } {
  const lines = csvText.split('\n').filter(line => line.trim());
  const headers = parseCSVLine(lines[0]);
  
  const rows = lines.slice(1).map(line => parseCSVLine(line));
  
  return { headers, rows };
}

/**
 * Parse a single CSV line with support for quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      // Toggle quote state
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current);
      current = '';
    } else {
      // Add character to current field
      current += char;
    }
  }
  
  // Add the last field
  result.push(current);
  
  return result;
}

async function importOpenBankingFields() {
  try {
    console.log('Starting import of Open Banking fields...');
    
    // Read CSV file
    const csvPath = resolve('./attached_assets/1033_Open_Banking_Survey_Field_Additions_Normalized.csv');
    const csvContent = readFileSync(csvPath, 'utf8');
    
    // Parse CSV
    const { headers, rows } = parseCSV(csvContent);
    console.log(`Parsed ${rows.length} rows from CSV`);
    
    // Map CSV fields to database fields
    const fieldsMapped = rows.map(row => {
      const record: Record<string, any> = {};
      
      // Map fields based on CSV headers
      headers.forEach((header, index) => {
        const value = row[index]?.trim() || null;
        
        // Map CSV field names to database column names
        switch (header.trim()) {
          case 'ID (id)':
            record.id = parseInt(value || '0', 10);
            break;
          case 'Order (order)':
            record.order = parseInt(value || '0', 10);
            break;
          case 'Field Key (field_key)':
            record.field_key = value;
            break;
          case 'display_name':
            record.display_name = value;
            break;
          case 'question':
            record.question = value;
            break;
          case 'group':
            record.group = value;
            break;
          case 'Field Type (field_type)':
            record.field_type = value;
            break;
          case 'Required (required)':
            record.required = value === 'TRUE' || value === 'true' || value === 't';
            break;
          case 'Help Text (help_text)':
            record.help_text = value;
            break;
          case 'Demo Autofill Answer (demo_autofill)':
            record.demo_autofill = value;
            break;
          case 'Answer Expectation':
            record.answer_expectation = value;
            break;
          case 'Validation Type':
            record.validation_type = value;
            break;
          case 'validation_rules':
            // Parse JSON if it's not NULL
            if (value && value !== 'NULL') {
              try {
                record.validation_rules = value;
              } catch (e) {
                record.validation_rules = null;
              }
            } else {
              record.validation_rules = null;
            }
            break;
          case 'step_index':
            record.step_index = value ? parseInt(value, 10) : 0;
            break;
        }
      });
      
      return record;
    });
    
    // Insert into database
    console.log('Importing fields into database...');
    
    // Use direct SQL with Postgres client
    const client = await pool.connect();
    
    try {
      // Begin transaction
      await client.query('BEGIN');
      
      for (const field of fieldsMapped) {
        const query = `
          INSERT INTO open_banking_fields 
          (id, "order", field_key, display_name, question, "group", field_type, required, 
           help_text, demo_autofill, answer_expectation, validation_type, validation_rules, step_index)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (id) DO UPDATE SET
            "order" = EXCLUDED."order",
            field_key = EXCLUDED.field_key,
            display_name = EXCLUDED.display_name,
            question = EXCLUDED.question,
            "group" = EXCLUDED."group",
            field_type = EXCLUDED.field_type,
            required = EXCLUDED.required,
            help_text = EXCLUDED.help_text,
            demo_autofill = EXCLUDED.demo_autofill,
            answer_expectation = EXCLUDED.answer_expectation,
            validation_type = EXCLUDED.validation_type,
            validation_rules = EXCLUDED.validation_rules,
            step_index = EXCLUDED.step_index
        `;
        
        const values = [
          field.id,
          field.order,
          field.field_key,
          field.display_name,
          field.question,
          field.group,
          field.field_type,
          field.required,
          field.help_text || '',
          field.demo_autofill || '',
          field.answer_expectation || '',
          field.validation_type || '',
          field.validation_rules || null,
          field.step_index
        ];
        
        await client.query(query, values);
      }
      
      // Commit transaction
      await client.query('COMMIT');
      
    } catch (error) {
      // Rollback on error
      await client.query('ROLLBACK');
      throw error;
    } finally {
      // Release client
      client.release();
    }
    
    console.log(`Successfully imported ${fieldsMapped.length} Open Banking fields`);
    
  } catch (error) {
    console.error('Error importing Open Banking fields:', error);
    throw error;
  }
}

// Execute the import function
importOpenBankingFields().then(() => {
  console.log('Open Banking fields import completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('Open Banking fields import failed:', error);
  process.exit(1);
});