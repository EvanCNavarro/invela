/**
 * Status Value Migration Script
 * 
 * This script normalizes all field status values in the database to use lowercase,
 * ensuring consistency with our FieldStatus enum across all response tables.
 */

import { db } from '@db';
import { kybResponses, ky3pResponses, openBankingResponses } from '@db/schema';
import { eq, sql, and, or, like } from 'drizzle-orm';
import { FieldStatus } from '../server/utils/field-status';

async function checkForUppercaseStatusValues() {
  console.log('Checking for uppercase status values in the database...');
  
  // Check KYB responses
  const kybUppercase = await db.select({ count: sql<number>`count(*)` })
    .from(kybResponses)
    .where(
      and(
        or(
          like(kybResponses.status, '%COMPLETE%'),
          like(kybResponses.status, '%EMPTY%'),
          like(kybResponses.status, '%INCOMPLETE%'),
          like(kybResponses.status, '%INVALID%')
        ),
        sql`${kybResponses.status} != ${FieldStatus.COMPLETE} AND 
            ${kybResponses.status} != ${FieldStatus.EMPTY} AND 
            ${kybResponses.status} != ${FieldStatus.INCOMPLETE} AND 
            ${kybResponses.status} != ${FieldStatus.INVALID}`
      )
    );
  
  // Check KY3P responses
  const ky3pUppercase = await db.select({ count: sql<number>`count(*)` })
    .from(ky3pResponses)
    .where(
      and(
        or(
          like(ky3pResponses.status, '%COMPLETE%'),
          like(ky3pResponses.status, '%EMPTY%'),
          like(ky3pResponses.status, '%INCOMPLETE%'),
          like(ky3pResponses.status, '%INVALID%')
        ),
        sql`${ky3pResponses.status} != ${FieldStatus.COMPLETE} AND 
            ${ky3pResponses.status} != ${FieldStatus.EMPTY} AND 
            ${ky3pResponses.status} != ${FieldStatus.INCOMPLETE} AND 
            ${ky3pResponses.status} != ${FieldStatus.INVALID}`
      )
    );
  
  // Check Open Banking responses
  const obUppercase = await db.select({ count: sql<number>`count(*)` })
    .from(openBankingResponses)
    .where(
      and(
        or(
          like(openBankingResponses.status, '%COMPLETE%'),
          like(openBankingResponses.status, '%EMPTY%'),
          like(openBankingResponses.status, '%INCOMPLETE%'),
          like(openBankingResponses.status, '%INVALID%')
        ),
        sql`${openBankingResponses.status} != ${FieldStatus.COMPLETE} AND 
            ${openBankingResponses.status} != ${FieldStatus.EMPTY} AND 
            ${openBankingResponses.status} != ${FieldStatus.INCOMPLETE} AND 
            ${openBankingResponses.status} != ${FieldStatus.INVALID}`
      )
    );
  
  console.log('Found uppercase status values:');
  console.log(`- KYB Responses: ${kybUppercase[0].count}`);
  console.log(`- KY3P Responses: ${ky3pUppercase[0].count}`);
  console.log(`- Open Banking Responses: ${obUppercase[0].count}`);
  
  const total = kybUppercase[0].count + ky3pUppercase[0].count + obUppercase[0].count;
  console.log(`Total: ${total} status values need to be migrated`);
  
  return total > 0;
}

async function migrateStatusValues() {
  console.log('Starting status value migration to lowercase...');
  
  // Migrate KYB responses
  await db.update(kybResponses)
    .set({ status: FieldStatus.COMPLETE })
    .where(like(kybResponses.status, '%COMPLETE%'));
    
  await db.update(kybResponses)
    .set({ status: FieldStatus.EMPTY })
    .where(like(kybResponses.status, '%EMPTY%'));
    
  await db.update(kybResponses)
    .set({ status: FieldStatus.INCOMPLETE })
    .where(like(kybResponses.status, '%INCOMPLETE%'));
    
  await db.update(kybResponses)
    .set({ status: FieldStatus.INVALID })
    .where(like(kybResponses.status, '%INVALID%'));
  
  // Migrate KY3P responses
  await db.update(ky3pResponses)
    .set({ status: FieldStatus.COMPLETE })
    .where(like(ky3pResponses.status, '%COMPLETE%'));
    
  await db.update(ky3pResponses)
    .set({ status: FieldStatus.EMPTY })
    .where(like(ky3pResponses.status, '%EMPTY%'));
    
  await db.update(ky3pResponses)
    .set({ status: FieldStatus.INCOMPLETE })
    .where(like(ky3pResponses.status, '%INCOMPLETE%'));
    
  await db.update(ky3pResponses)
    .set({ status: FieldStatus.INVALID })
    .where(like(ky3pResponses.status, '%INVALID%'));
  
  // Migrate Open Banking responses
  await db.update(openBankingResponses)
    .set({ status: FieldStatus.COMPLETE })
    .where(like(openBankingResponses.status, '%COMPLETE%'));
    
  await db.update(openBankingResponses)
    .set({ status: FieldStatus.EMPTY })
    .where(like(openBankingResponses.status, '%EMPTY%'));
    
  await db.update(openBankingResponses)
    .set({ status: FieldStatus.INCOMPLETE })
    .where(like(openBankingResponses.status, '%INCOMPLETE%'));
    
  await db.update(openBankingResponses)
    .set({ status: FieldStatus.INVALID })
    .where(like(openBankingResponses.status, '%INVALID%'));
  
  console.log('Status value migration completed successfully');
}

async function run() {
  try {
    // Check if migration is needed
    const needsMigration = await checkForUppercaseStatusValues();
    
    if (needsMigration) {
      // Confirm with user before proceeding
      console.log('Would you like to proceed with the migration? (y/n)');
      // In production, implement user confirmation here
      
      // For now, proceed automatically
      await migrateStatusValues();
      
      // Verify migration was successful
      const stillNeedsMigration = await checkForUppercaseStatusValues();
      if (stillNeedsMigration) {
        console.log('Migration did not fix all uppercase status values. Please check the database manually.');
      } else {
        console.log('Migration verification completed: All status values are now lowercase');
      }
    } else {
      console.log('No migration needed: All status values are already using the correct case');
    }
  } catch (error) {
    console.error('Error during status value migration:', error);
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  run().then(() => process.exit(0)).catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}

export { checkForUppercaseStatusValues, migrateStatusValues };
