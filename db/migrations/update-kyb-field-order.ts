import { db } from '@db';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import csv from 'csv-parser';
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

export async function migrate() {
  console.log('Running update-kyb-field-order migration...');
  
  // Read fields from CSV
  const fields: Field[] = [];
  
  const csvPath = path.resolve('./attached_assets/KYB_Form_Fields_Sorted_Normalized.csv');
  
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (data) => fields.push(data))
      .on('end', () => {
        console.log(`Read ${fields.length} fields from CSV`);
        resolve();
      })
      .on('error', (err) => {
        console.error('Error reading CSV:', err);
        reject(err);
      });
  });
  
  // Update each field's order based on the CSV
  const totalFields = fields.length;
  let updatedFields = 0;
  
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
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
}

export async function rollback() {
  console.log('Rollback is not implemented for this migration.');
}