/**
 * Advanced KY3P Field Importer
 * 
 * This script handles the complex CSV parsing needed for the KY3P fields
 * with proper handling of commas within fields and exact column mapping.
 */

import fs from 'fs';
import path from 'path';
import { db } from './db';
import { sql } from 'drizzle-orm';

// Function to parse CSV with proper handling of quotes and commas
function parseCSV(csvText: string): { headers: string[], rows: string[][] } {
  const lines = csvText.split('\n');
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      rows.push(parseCSVLine(lines[i]));
    }
  }
  
  return { headers, rows };
}

// Parse a single CSV line handling quotes and commas
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      // If we're already in quotes and the next character is also a quote,
      // it's an escaped quote
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip the next quote
      } else {
        // Otherwise, toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Only treat commas as separators if we're not in quotes
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last field
  result.push(current);
  return result;
}

async function importKy3pFields() {
  console.log('Starting advanced KY3P field import...');
  
  try {
    // First, ensure tables exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "ky3p_fields" (
        "id" SERIAL PRIMARY KEY,
        "order" INTEGER NOT NULL,
        "field_key" TEXT NOT NULL,
        "label" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "help_text" TEXT,
        "demo_autofill" TEXT,
        "section" TEXT NOT NULL,
        "field_type" TEXT NOT NULL,
        "is_required" BOOLEAN NOT NULL,
        "answer_expectation" TEXT,
        "validation_type" TEXT,
        "phasing" TEXT,
        "soc2_overlap" TEXT,
        "validation_rules" TEXT,
        "step_index" INTEGER DEFAULT 0,
        "created_at" TIMESTAMP DEFAULT NOW(),
        "updated_at" TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Clear existing data
    await db.execute(sql`TRUNCATE TABLE "ky3p_fields" RESTART IDENTITY CASCADE;`);
    
    // Read and parse the CSV file
    const csvFilePath = path.resolve('./attached_assets/S&P_KY3P_Security_Assessment_Field_Additions_Normalized.csv');
    const fileContent = fs.readFileSync(csvFilePath, 'utf8');
    const { headers, rows } = parseCSV(fileContent);
    
    // Map headers to database columns
    const columnMap: Record<string, string> = {
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
    
    // Map each header to its index
    const headerIndexes: Record<string, number> = {};
    headers.forEach((header, index) => {
      headerIndexes[header] = index;
    });
    
    // Process each row
    let successCount = 0;
    let errorCount = 0;
    
    for (const row of rows) {
      try {
        // Extract values using column mapping
        const values: Record<string, any> = {};
        
        for (const [csvHeader, dbColumn] of Object.entries(columnMap)) {
          const index = headerIndexes[csvHeader];
          if (index !== undefined && index < row.length) {
            values[dbColumn] = row[index];
          }
        }
        
        // Convert types as needed
        const id = parseInt(values.id) || null;
        const order = parseInt(values.order) || null;
        const isRequired = values.is_required === 'TRUE';
        const stepIndex = parseInt(values.step_index) || 0;
        
        // Set default values for required fields if missing
        const fieldKey = values.field_key || `field_${id}`;
        const label = values.label || `Field ${id}`;
        const description = values.description || '';
        const section = values.section || 'General';
        const fieldType = values.field_type || 'TEXT';
        
        // Insert into database
        await db.execute(sql`
          INSERT INTO "ky3p_fields" (
            "id", "order", "field_key", "label", "description", "help_text",
            "demo_autofill", "section", "field_type", "is_required",
            "answer_expectation", "validation_type", "phasing", "soc2_overlap",
            "validation_rules", "step_index"
          ) VALUES (
            ${id}, ${order}, ${fieldKey}, ${label}, ${description}, ${values.help_text},
            ${values.demo_autofill}, ${section}, ${fieldType}, ${isRequired},
            ${values.answer_expectation}, ${values.validation_type}, 
            ${values.phasing}, ${values.soc2_overlap}, ${values.validation_rules},
            ${stepIndex}
          );
        `);
        
        successCount++;
        if (successCount % 10 === 0) {
          console.log(`Imported ${successCount} fields...`);
        }
      } catch (error) {
        console.error(`Error processing row:`, error);
        errorCount++;
      }
    }
    
    console.log(`Import completed. Successfully imported ${successCount} fields. Errors: ${errorCount}`);
    
    // Verify sample fields
    const verification = await db.execute(sql`
      SELECT id, field_key, label, section FROM ky3p_fields ORDER BY id LIMIT 5;
    `);
    
    console.log('Verification of first 5 fields:');
    verification.rows.forEach(row => {
      console.log(`ID: ${row.id}, Key: ${row.field_key}, Label: ${row.label}, Section: ${row.section}`);
    });
    
    // Check total count
    const countResult = await db.execute(sql`SELECT COUNT(*) FROM ky3p_fields;`);
    console.log(`Total fields in database: ${countResult.rows[0].count}`);
    
  } catch (error) {
    console.error('Error importing KY3P fields:', error);
    throw error;
  }
}

// Run the import
importKy3pFields()
  .then(() => {
    console.log('KY3P field import completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('KY3P field import failed:', error);
    process.exit(1);
  });