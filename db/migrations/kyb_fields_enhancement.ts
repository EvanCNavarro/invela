/**
 * KYB Fields Enhancement Migration
 * 
 * This migration performs the following operations:
 * 1. Adds three new metadata columns to the kyb_fields table
 * 2. Updates field ordering to match the normalized CSV structure
 * 3. Backfills the new metadata columns with values from the CSV
 * 
 * IMPORTANT: This migration preserves all existing data and functionality while
 * enhancing the metadata and organization of KYB fields.
 */

import { db } from '../index';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

// Utility to safely execute operations
const safeExecute = async (operation: () => Promise<any>, errorMessage: string) => {
  try {
    return await operation();
  } catch (error) {
    console.error(`[KYB Fields Migration] ${errorMessage}:`, error);
    throw error;
  }
};

export async function migrate() {
  console.log('[KYB Fields Migration] Starting migration...');
  
  // Step 1: Add new columns if they don't exist
  await safeExecute(async () => {
    const columnCheckResult = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'kyb_fields' 
      AND column_name IN ('answer_expectation', 'demo_autofill', 'validation_type')
    `);
    
    const existingColumns = columnCheckResult.rows.map(row => row.column_name);
    
    // Add columns that don't exist yet
    if (!existingColumns.includes('answer_expectation')) {
      console.log('[KYB Fields Migration] Adding answer_expectation column...');
      await db.query(`ALTER TABLE kyb_fields ADD COLUMN answer_expectation TEXT`);
    }
    
    if (!existingColumns.includes('demo_autofill')) {
      console.log('[KYB Fields Migration] Adding demo_autofill column...');
      await db.query(`ALTER TABLE kyb_fields ADD COLUMN demo_autofill TEXT`);
    }
    
    if (!existingColumns.includes('validation_type')) {
      console.log('[KYB Fields Migration] Adding validation_type column...');
      await db.query(`ALTER TABLE kyb_fields ADD COLUMN validation_type TEXT`);
    }
  }, 'Failed to add new columns');
  
  // Step 2: Parse the CSV data for field updates
  // The CSV path should be adjusted to the actual location
  const csvFilePath = path.resolve(__dirname, '../../attached_assets/KYB_Form_Fields_Sorted_Normalized.csv');
  
  let csvData: any[] = [];
  try {
    if (fs.existsSync(csvFilePath)) {
      const csvContent = fs.readFileSync(csvFilePath, { encoding: 'latin1' });
      csvData = parse(csvContent, {
        columns: true,
        skip_empty_lines: true
      });
      console.log(`[KYB Fields Migration] Successfully parsed CSV with ${csvData.length} rows`);
    } else {
      console.log('[KYB Fields Migration] CSV file not found, skipping data import');
      // We'll still update the schema but won't have data to import
      return;
    }
  } catch (error) {
    console.error('[KYB Fields Migration] Error parsing CSV:', error);
    // Continue with migration even if CSV parsing fails - we'll just add the columns
    return;
  }
  
  // Step 3: Begin a transaction for updating field data and ordering
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    // First update the new metadata fields
    for (const row of csvData) {
      const { 
        id, 
        field_key, 
        answer_expectation = null, 
        demo_autofill = null, 
        validation_type = null,
        order: newOrder
      } = row;
      
      // Find by field_key as it's the most reliable identifier
      await client.query(`
        UPDATE kyb_fields
        SET 
          answer_expectation = $1,
          demo_autofill = $2,
          validation_type = $3
        WHERE field_key = $4
      `, [
        answer_expectation, 
        demo_autofill, 
        validation_type, 
        field_key
      ]);
      
      // Update ordering in a separate query to avoid conflicts
      await client.query(`
        UPDATE kyb_fields
        SET "order" = $1
        WHERE field_key = $2
      `, [newOrder, field_key]);
    }
    
    await client.query('COMMIT');
    console.log('[KYB Fields Migration] Successfully updated kyb_fields table');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[KYB Fields Migration] Error updating kyb_fields:', error);
    throw error;
  } finally {
    client.release();
  }
  
  console.log('[KYB Fields Migration] Migration completed successfully');
}

export async function rollback() {
  console.log('[KYB Fields Migration] Starting rollback...');
  
  // Only drop the new columns, don't revert the order changes to avoid data inconsistency
  await safeExecute(async () => {
    await db.query(`
      ALTER TABLE kyb_fields 
      DROP COLUMN IF EXISTS answer_expectation,
      DROP COLUMN IF EXISTS demo_autofill,
      DROP COLUMN IF EXISTS validation_type
    `);
  }, 'Failed to roll back column additions');
  
  console.log('[KYB Fields Migration] Rollback completed successfully');
}