import { db } from '@db';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

/**
 * Update the order of KYB fields according to the normalized and sorted CSV
 * 
 * This script reads the field order from the CSV file and updates the database accordingly
 */

type Field = {
  id: string;
  field_key: string;
  display_name: string;
  field_type: string;
  order: string;
};

// Simple CSV parser function
function parseCSV(content: string): Field[] {
  const lines = content.split('\n');
  const headers = lines[0].split(',');
  
  // Find indices of the columns we need
  const idIndex = headers.indexOf('id');
  const fieldKeyIndex = headers.indexOf('field_key');
  const displayNameIndex = headers.indexOf('display_name');
  const fieldTypeIndex = headers.indexOf('field_type');
  const orderIndex = headers.indexOf('order');
  
  const fields: Field[] = [];
  
  // Skip the header row (start at index 1)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    // Handle quoted values with commas inside them
    const values: string[] = [];
    let currentValue = '';
    let insideQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    // Add the last value
    values.push(currentValue);
    
    if (values.length > orderIndex && values.length > fieldKeyIndex) {
      fields.push({
        id: values[idIndex] || '',
        field_key: values[fieldKeyIndex] || '',
        display_name: values[displayNameIndex] || '',
        field_type: values[fieldTypeIndex] || '',
        order: values[orderIndex] || ''
      });
    }
  }
  
  return fields;
}

export async function migrate() {
  console.log('Running update-kyb-field-order migration...');
  
  try {
    // Read CSV file
    const csvPath = path.resolve('./attached_assets/KYB_Form_Fields_Sorted_Normalized.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    
    // Parse CSV
    const fields = parseCSV(csvContent);
    console.log(`Read ${fields.length} fields from CSV`);
    
    // Update each field's order based on the CSV
    const totalFields = fields.length;
    let updatedFields = 0;
    
    for (const field of fields) {
      const order = parseInt(field.order, 10);
      const fieldKey = field.field_key;
      
      if (isNaN(order)) {
        console.warn(`Invalid order for field ${fieldKey}: ${field.order}`);
        continue;
      }
      
      try {
        // Update the field order in the database
        await db.execute(sql`
          UPDATE kyb_fields 
          SET "order" = ${order} 
          WHERE field_key = ${fieldKey}
        `);
        updatedFields++;
        console.log(`Updated field order for ${fieldKey} to ${order}`);
      } catch (error) {
        console.error(`Failed to update field ${fieldKey}:`, error);
      }
    }
    
    console.log(`Successfully updated ${updatedFields} of ${totalFields} field orders.`);
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

export async function rollback() {
  console.log('Rollback is not implemented for this migration.');
}