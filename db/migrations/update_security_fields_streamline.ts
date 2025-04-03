import { db } from '../index';
import { sql } from 'drizzle-orm';

async function migrateSecurity() {
  console.log('[Migration] Starting security fields streamlining...');

  try {
    // Step 1: Remove the sections we don't want to keep
    const sectionsToKeep = [
      'Identity and Access Management',
      'Data Protection and Privacy',
      'Application and API Security',
      'Infrastructure and Cloud Security',
      'Security Operations',
      'Security Governance and Risk Management'
    ];

    const sectionsToKeepStr = sectionsToKeep.map(s => `'${s}'`).join(',');
    
    console.log(`[Migration] Removing sections not in: ${sectionsToKeepStr}`);
    
    await db.execute(
      sql`DELETE FROM security_fields WHERE section NOT IN (${sql.raw(sectionsToKeepStr)})`
    );

    // Step 2: Update Security Governance and Risk Management to have 10 questions maximum
    // This is a precaution in case there are more than 10 questions
    await db.execute(
      sql`DELETE FROM security_fields 
          WHERE section = 'Security Governance and Risk Management' 
          AND id NOT IN (
            SELECT id FROM security_fields 
            WHERE section = 'Security Governance and Risk Management' 
            ORDER BY id LIMIT 10
          )`
    );

    console.log('[Migration] Security fields streamlining complete.');
    
    // Verify results
    const result = await db.execute(
      sql`SELECT section, COUNT(*) as question_count 
          FROM security_fields 
          GROUP BY section 
          ORDER BY section`
    );
    
    console.log('[Migration] Updated security sections:');
    console.log(result.rows);
    
    const totalCount = await db.execute(
      sql`SELECT COUNT(*) as total FROM security_fields`
    );
    
    console.log('[Migration] Total security fields:', totalCount.rows[0]);
    
  } catch (error) {
    console.error('[Migration] Error streamlining security fields:', error);
    throw error;
  }
}

async function main() {
  try {
    await migrateSecurity();
    console.log('[Migration] Security fields streamlining completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('[Migration] Migration failed:', error);
    process.exit(1);
  }
}

main();