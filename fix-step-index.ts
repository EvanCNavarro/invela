/**
 * Fix step_index for KY3P fields
 * 
 * This script ensures the step_index value is correctly set from the CSV file.
 */

import fs from 'fs';
import path from 'path';
import { db } from './db';
import { sql } from 'drizzle-orm';

// Function to parse CSV correctly handling quoted fields
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

async function fixStepIndices() {
  console.log('Starting step_index fix for KY3P fields...');
  
  try {
    // Read and parse the CSV file
    const csvFilePath = path.resolve('./attached_assets/S&P_KY3P_Security_Assessment_Field_Additions_Normalized.csv');
    const fileContent = fs.readFileSync(csvFilePath, 'utf8');
    const { headers, rows } = parseCSV(fileContent);
    
    // Map headers to their indices
    const headerMap: Record<string, number> = {};
    headers.forEach((header, index) => {
      headerMap[header] = index;
      // Log headers to help debug
      console.log(`Found header: "${header}" at index ${index}`);
    });
    
    // Find the step_index column - it could have different formats
    let idColumnIndex = -1;
    let stepIndexColumnIndex = -1;
    
    // Try different possible header formats for ID
    if (headerMap['ID (id)'] !== undefined) idColumnIndex = headerMap['ID (id)'];
    else if (headerMap['ID'] !== undefined) idColumnIndex = headerMap['ID'];
    else if (headerMap['id'] !== undefined) idColumnIndex = headerMap['id'];
    
    // Try different possible header formats for step_index
    if (headerMap['step_index'] !== undefined) stepIndexColumnIndex = headerMap['step_index'];
    else if (headerMap['Step Index'] !== undefined) stepIndexColumnIndex = headerMap['Step Index'];
    else if (headerMap['Step Index (step_index)'] !== undefined) stepIndexColumnIndex = headerMap['Step Index (step_index)'];
    
    if (idColumnIndex === -1 || stepIndexColumnIndex === -1) {
      throw new Error(`Required columns not found in CSV. Found ID column: ${idColumnIndex}, step_index column: ${stepIndexColumnIndex}`);
    }
    
    console.log(`Found ID column at index ${idColumnIndex} and step_index column at index ${stepIndexColumnIndex}`);
    
    // Track how many fields we update
    let updateCount = 0;
    let errorCount = 0;
    
    // Process each row and update the step_index
    for (const row of rows) {
      try {
        const id = parseInt(row[idColumnIndex]);
        if (isNaN(id)) continue;
        
        // Get the step_index, default to 0 if not present or not a valid number
        let stepIndex = 0;
        if (row[stepIndexColumnIndex] && !isNaN(parseInt(row[stepIndexColumnIndex]))) {
          stepIndex = parseInt(row[stepIndexColumnIndex]);
        }
        
        // Update the field in the database
        await db.execute(sql`
          UPDATE ky3p_fields 
          SET step_index = ${stepIndex}
          WHERE id = ${id}
        `);
        
        updateCount++;
        if (updateCount % 10 === 0) {
          console.log(`Updated ${updateCount} fields so far...`);
        }
      } catch (error) {
        console.error(`Error updating step_index for row:`, error);
        errorCount++;
      }
    }
    
    console.log(`Step index fix completed. Updated ${updateCount} fields. Errors: ${errorCount}`);
    
    // Verify the updates
    const verification = await db.execute(sql`
      SELECT id, field_key, step_index FROM ky3p_fields ORDER BY id LIMIT 5;
    `);
    
    console.log('Verification of step_index for first 5 fields:');
    verification.rows.forEach(row => {
      console.log(`ID: ${row.id}, Key: ${row.field_key}, step_index: ${row.step_index}`);
    });
    
  } catch (error) {
    console.error('Error fixing step_index for KY3P fields:', error);
    throw error;
  }
}

// Run the function
fixStepIndices()
  .then(() => {
    console.log('step_index fix completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('step_index fix failed:', error);
    process.exit(1);
  });