import { db } from '../index';
import { sql } from 'drizzle-orm';

const sectionToRemove = 'Application and API Security';

const fieldsToRemoveBySection = {
  'Identity and Access Management': ['iam_single_sign_on_implementation'], // ID 77
  'Data Protection and Privacy': ['data_protection_impact_assessments'], // ID 83
  'Infrastructure and Cloud Security': ['infra_container_kubernetes_security'], // ID 95
  'Security Operations': ['secops_log_management'], // ID 101
  'Security Governance and Risk Management': [
    'gov_security_budget_resources', // ID 111
    'gov_security_organization_structure', // ID 110
    'gov_change_management_process', // ID 109
    'gov_physical_security_measures', // ID 108
    'gov_business_continuity_dr', // ID 107
  ]
};

const sectionRenameMap = {
  'Identity and Access Management': 'Identity & Access Management',
  'Data Protection and Privacy': 'Data Protection & Privacy',
  'Infrastructure and Cloud Security': 'Infrastructure & Cloud Security',
  'Security Operations': 'Security Operations',
  'Security Governance and Risk Management': 'Security Governance & Risk Management'
};

async function migrateSecurityFields() {
  console.log('[Migration] Starting security fields final update...');

  try {
    // Step 1: Remove the entire section we don't want to keep
    console.log(`[Migration] Removing section: ${sectionToRemove}`);
    
    await db.execute(
      sql`DELETE FROM security_fields WHERE section = ${sectionToRemove}`
    );

    // Step 2: Remove specific fields from other sections to get down to 5 questions per section
    for (const [section, fieldsToRemove] of Object.entries(fieldsToRemoveBySection)) {
      if (fieldsToRemove.length > 0) {
        const fieldsToRemoveStr = fieldsToRemove.map(f => `'${f}'`).join(',');
        console.log(`[Migration] Removing fields from ${section}: ${fieldsToRemoveStr}`);
        
        await db.execute(
          sql`DELETE FROM security_fields WHERE section = ${section} AND field_key IN (${sql.raw(fieldsToRemoveStr)})`
        );
      }
    }

    // Step 3: Rename sections to use & instead of and
    for (const [oldSection, newSection] of Object.entries(sectionRenameMap)) {
      console.log(`[Migration] Renaming section: ${oldSection} -> ${newSection}`);
      
      await db.execute(
        sql`UPDATE security_fields SET section = ${newSection} WHERE section = ${oldSection}`
      );
    }

    console.log('[Migration] Security fields final update complete.');
    
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
    console.error('[Migration] Error updating security fields:', error);
    throw error;
  }
}

async function main() {
  try {
    await migrateSecurityFields();
    console.log('[Migration] Security fields final update completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('[Migration] Migration failed:', error);
    process.exit(1);
  }
}

main();