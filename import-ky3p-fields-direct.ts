/**
 * Import S&P KY3P Security Assessment Fields using SQL directly
 * 
 * This script imports the KY3P fields using direct SQL queries to avoid issues 
 * with the ORM and complex CSV parsing.
 */

import { db } from './db';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

// Minimal CSV parser function for simple CSV files
function parseCSV(csvData: string): Record<string, string>[] {
  const lines = csvData.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  const records: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const record: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      record[header] = (values[index] || '').trim();
    });
    
    records.push(record);
  }
  
  return records;
}

async function importFields() {
  try {
    console.log('Starting KY3P field import with direct SQL approach...');
    
    // Create or truncate the ky3p_fields table
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
    
    // Truncate the table
    await db.execute(sql`TRUNCATE TABLE "ky3p_fields" RESTART IDENTITY CASCADE;`);
    
    // Read the CSV file
    const csvFilePath = path.resolve('./attached_assets/S&P_KY3P_Security_Assessment_Field_Additions_Normalized.csv');
    const csvData = fs.readFileSync(csvFilePath, 'utf8');
    
    // Parse the CSV data
    const records = parseCSV(csvData);
    console.log(`Parsed ${records.length} records from CSV file`);
    
    // Insert each record individually to avoid batch errors
    let insertCount = 0;
    for (const [index, record] of records.entries()) {
      const id = parseInt(record['ID (id)'] || `${index + 1}`) || index + 1;
      const order = parseInt(record['Order (order)'] || `${index + 1}`) || index + 1;
      const fieldKey = record['Field Key (field_key)'] || `field_${id}`;
      const label = record['Label (label)'] || `Field ${id}`;
      const description = record['Question (description)'] || '';
      const helpText = record['Help Text (help_text)'] || null;
      const demoAutofill = record['Demo Autofill Answer (demo_autofill)'] || null;
      const section = record['Group (section)'] || 'General';
      const fieldType = record['Field Type (field_type)'] || 'TEXT';
      const isRequired = record['Required (is_required)'] === 'TRUE';
      const answerExpectation = record['Answer Expectation'] || null;
      const validationType = record['Validation Type'] || null;
      const phasing = record['Phasing'] || null;
      const soc2Overlap = record['SOC2 Overlap'] || null;
      const validationRules = record['validation_rules'] || null;
      const stepIndex = parseInt(record['step_index'] || '0') || 0;
      
      try {
        await db.execute(sql`
          INSERT INTO "ky3p_fields" (
            "id", "order", "field_key", "label", "description", "help_text",
            "demo_autofill", "section", "field_type", "is_required",
            "answer_expectation", "validation_type", "phasing", "soc2_overlap",
            "validation_rules", "step_index", "created_at", "updated_at"
          ) VALUES (
            ${id}, ${order}, ${fieldKey}, ${label}, ${description}, ${helpText},
            ${demoAutofill}, ${section}, ${fieldType}, ${isRequired},
            ${answerExpectation}, ${validationType}, ${phasing}, ${soc2Overlap},
            ${validationRules}, ${stepIndex}, NOW(), NOW()
          );
        `);
        insertCount++;
      } catch (error) {
        console.error(`Error inserting field ${id} (${fieldKey}):`, error);
      }
    }
    
    console.log(`Successfully imported ${insertCount} KY3P fields`);
  } catch (error) {
    console.error('Error during import process:', error);
    process.exit(1);
  }
}

// Run the import
importFields()
  .then(() => {
    console.log('KY3P fields import completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Import failed:', error);
    process.exit(1);
  });