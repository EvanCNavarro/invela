/**
 * Update all KY3P fields to use TEXTAREA instead of TEXT
 * 
 * This script ensures that all KY3P fields use the TEXTAREA field type
 * to allow for longer, multi-line explanations instead of single-line inputs.
 */

import { db } from './db';
import { ky3pFields } from './db/schema';
import { eq } from 'drizzle-orm';
import { Logger } from './server/utils/logger';

const logger = new Logger('KY3P Field Type Update');

async function updateKy3pFieldTypes() {
  try {
    // First get all fields to see how many we need to update
    const allFields = await db.select().from(ky3pFields);
    
    logger.info(`Found ${allFields.length} KY3P fields in total`);
    
    // Count how many fields are currently TEXT type
    const textFields = allFields.filter(field => field.field_type === 'TEXT');
    logger.info(`Found ${textFields.length} fields with TEXT type that need conversion to TEXTAREA`);
    
    // Update all TEXT fields to TEXTAREA
    if (textFields.length > 0) {
      logger.info('Starting to update field types from TEXT to TEXTAREA...');
      
      for (const field of textFields) {
        await db
          .update(ky3pFields)
          .set({ field_type: 'TEXTAREA' })
          .where(eq(ky3pFields.id, field.id));
        
        logger.info(`Updated field ${field.id} (${field.field_key}) from TEXT to TEXTAREA`);
      }
      
      logger.info(`Successfully updated ${textFields.length} fields from TEXT to TEXTAREA`);
    } else {
      logger.info('No TEXT fields found that need conversion');
    }
    
    // Now count the fields by type to confirm changes
    const updatedFields = await db.select().from(ky3pFields);
    const typeCount = updatedFields.reduce((acc, field) => {
      acc[field.field_type] = (acc[field.field_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    logger.info('Field types after update:', typeCount);
  } catch (error) {
    logger.error('Error updating KY3P field types:', error);
    throw error;
  }
}

async function run() {
  try {
    await updateKy3pFieldTypes();
    logger.info('KY3P field type update completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('KY3P field type update failed:', error);
    process.exit(1);
  }
}

run();