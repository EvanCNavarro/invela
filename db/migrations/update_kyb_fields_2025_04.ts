import { sql } from "drizzle-orm";
import { db } from "@db";
import { KYBFieldType } from "../schema";

/**
 * Migration: update_kyb_fields_2025_04
 * 
 * This migration updates the KYB form fields based on the April 2025 revision.
 * It handles:
 * - Field modifications (question text, group, order)
 * - New field additions
 * - Field deletions
 * - Group reorganization
 * 
 * The migration preserves existing field keys where possible for data continuity.
 */

export async function updateKybFields2025April() {
  console.log('[KYB Migration] Starting April 2025 KYB fields update migration');
  try {
    // Check if we need to run this migration
    const migrationCheck = await db.execute(sql`
      SELECT COUNT(*) as count FROM kyb_fields 
      WHERE field_key = 'companyPhone' OR field_key = 'contactEmail'
    `);
    
    // Check if migration has been applied by looking at the first row's count value
    const countValue = migrationCheck.rows?.[0]?.count;
    const count = typeof countValue === 'number' ? countValue : 
                 typeof countValue === 'string' ? parseInt(countValue, 10) : 0;
    
    // Check for fields that we need to delete
    const taxFieldsCheck = await db.execute(sql`
      SELECT COUNT(*) as count FROM kyb_fields
      WHERE field_key IN ('taxId', 'taxReceipts')
    `);
    
    const taxFieldsCountValue = taxFieldsCheck.rows?.[0]?.count;
    const taxFieldsCount = typeof taxFieldsCountValue === 'number' ? taxFieldsCountValue : 
                          typeof taxFieldsCountValue === 'string' ? parseInt(taxFieldsCountValue, 10) : 0;
    
    // If we have both new fields and no tax fields, the full migration is already applied
    if (count > 0 && taxFieldsCount === 0) {
      console.log('[KYB Migration] Verifying field groupings and order');
      
      // Instead of skipping entirely, we'll just run the field updates to ensure
      // all groups and order values are correct, but skip adding/removing fields
    }
    
    console.log(`[KYB Migration] Migration status: new fields present (${count}), tax fields to remove (${taxFieldsCount})`);
    
    // Decide which parts of the migration to run
    const shouldAddNewFields = count === 0;
    const shouldRemoveTaxFields = taxFieldsCount > 0;

    // 1. First update existing fields (Edit operations) - Always do this
    console.log('[KYB Migration] Updating existing fields');
    
    // Update legalEntityName (ID: 1)
    await db.execute(sql`
      UPDATE kyb_fields SET 
        "group" = 'companyProfile',
        "order" = 1
      WHERE field_key = 'legalEntityName'
    `);
    
    // Update registrationNumber (ID: 2)
    await db.execute(sql`
      UPDATE kyb_fields SET 
        question = 'What is your company''s entity registration number (e.g., EIN or State Entity ID)?',
        "group" = 'companyProfile',
        "order" = 2
      WHERE field_key = 'registrationNumber'
    `);
    
    // Update incorporationDate (ID: 3)
    await db.execute(sql`
      UPDATE kyb_fields SET 
        "group" = 'companyProfile',
        "order" = 3
      WHERE field_key = 'incorporationDate'
    `);

    // Update businessType (ID: 5)
    await db.execute(sql`
      UPDATE kyb_fields SET 
        "group" = 'companyProfile',
        "order" = 4
      WHERE field_key = 'businessType'
    `);

    // Update jurisdiction (ID: 6)
    await db.execute(sql`
      UPDATE kyb_fields SET 
        "group" = 'companyProfile',
        "order" = 5
      WHERE field_key = 'jurisdiction'
    `);

    // Update registeredAddress (ID: 4)
    await db.execute(sql`
      UPDATE kyb_fields SET 
        "group" = 'companyProfile',
        "order" = 6
      WHERE field_key = 'registeredAddress'
    `);

    // Update directorsAndOfficers (ID: 7)
    await db.execute(sql`
      UPDATE kyb_fields SET 
        "group" = 'governanceLeadership',
        "order" = 9
      WHERE field_key = 'directorsAndOfficers'
    `);

    // Update ultimateBeneficialOwners (ID: 8)
    await db.execute(sql`
      UPDATE kyb_fields SET 
        "group" = 'governanceLeadership',
        "order" = 10
      WHERE field_key = 'ultimateBeneficialOwners'
    `);

    // Update authorizedSigners (ID: 9)
    await db.execute(sql`
      UPDATE kyb_fields SET 
        question = 'List the names of the company''s authorized signers.',
        "group" = 'governanceLeadership',
        "order" = 11
      WHERE field_key = 'authorizedSigners'
    `);

    // Update corporateRegistration (ID: 10)
    await db.execute(sql`
      UPDATE kyb_fields SET 
        "group" = 'governanceLeadership',
        "order" = 16
      WHERE field_key = 'corporateRegistration'
    `);

    // Update goodStanding (ID: 11)
    await db.execute(sql`
      UPDATE kyb_fields SET 
        question = 'Is the company currently in good standing with regulatory authorities?',
        "group" = 'governanceLeadership',
        "order" = 17
      WHERE field_key = 'goodStanding'
    `);

    // Update licenses (ID: 12)
    await db.execute(sql`
      UPDATE kyb_fields SET 
        question = 'List any licenses or permits the company currently holds.',
        "group" = 'governanceLeadership',
        "order" = 18
      WHERE field_key = 'licenses'
    `);

    // Update annualRecurringRevenue (ID: 15)
    await db.execute(sql`
      UPDATE kyb_fields SET 
        "group" = 'financialProfile',
        "order" = 19
      WHERE field_key = 'annualRecurringRevenue'
    `);

    // Update monthlyRecurringRevenue (ID: 16)
    await db.execute(sql`
      UPDATE kyb_fields SET 
        "group" = 'financialProfile',
        "order" = 20
      WHERE field_key = 'monthlyRecurringRevenue'
    `);

    // Update marketCapitalization (ID: 17)
    await db.execute(sql`
      UPDATE kyb_fields SET 
        question = 'What is the company''s current market cap?',
        "group" = 'financialProfile',
        "order" = 21
      WHERE field_key = 'marketCapitalization'
    `);

    // Update lifetimeCustomerValue (ID: 18)
    await db.execute(sql`
      UPDATE kyb_fields SET 
        "group" = 'financialProfile',
        "order" = 22
      WHERE field_key = 'lifetimeCustomerValue'
    `);

    // Update financialStatements (ID: 19)
    await db.execute(sql`
      UPDATE kyb_fields SET 
        "group" = 'operationsCompliance',
        "order" = 23
      WHERE field_key = 'financialStatements'
    `);

    // Update operationalPolicies (ID: 20)
    await db.execute(sql`
      UPDATE kyb_fields SET 
        question = 'List the company''s key operational policies.',
        "group" = 'operationsCompliance',
        "order" = 24
      WHERE field_key = 'operationalPolicies'
    `);

    // Update dataVolume (ID: 21)
    await db.execute(sql`
      UPDATE kyb_fields SET 
        question = 'Estimate the volume of data the company currently manages.',
        "group" = 'operationsCompliance',
        "order" = 25
      WHERE field_key = 'dataVolume'
    `);

    // Update dataTypes (ID: 22)
    await db.execute(sql`
      UPDATE kyb_fields SET 
        "group" = 'operationsCompliance',
        "order" = 26
      WHERE field_key = 'dataTypes'
    `);

    // Update sanctionsCheck (ID: 23)
    await db.execute(sql`
      UPDATE kyb_fields SET 
        question = 'Has the company completed sanctions screening?',
        "group" = 'operationsCompliance',
        "order" = 27
      WHERE field_key = 'sanctionsCheck'
    `);

    // Update dueDiligence (ID: 24)
    await db.execute(sql`
      UPDATE kyb_fields SET 
        question = 'What due diligence processes has the company completed?',
        "group" = 'operationsCompliance',
        "order" = 28
      WHERE field_key = 'dueDiligence'
    `);

    // 2. Add new fields if needed
    if (shouldAddNewFields) {
      console.log('[KYB Migration] Adding new fields');

      // Add companyPhone (ID: 7)
      await db.execute(sql`
        INSERT INTO kyb_fields (
          field_key, display_name, field_type, question, "group", "order", required
        ) VALUES (
          'companyPhone', 'Company Phone Number', 'text', 'What is the company''s phone number?', 
          'companyProfile', 7, true
        )
      `);

      // Add contactEmail (ID: 8)
      await db.execute(sql`
        INSERT INTO kyb_fields (
          field_key, display_name, field_type, question, "group", "order", required
        ) VALUES (
          'contactEmail', 'Representative Email', 'email', 'What is your email address?',
          'companyProfile', 8, true
        )
      `);

      // Add governmentOwnership (ID: 12)
      await db.execute(sql`
        INSERT INTO kyb_fields (
          field_key, display_name, field_type, question, "group", "order", required
        ) VALUES (
          'governmentOwnership', 'Government Ownership', 'boolean', 'Is the company owned or controlled by a government entity?',
          'governanceLeadership', 12, true
        )
      `);

      // Add priorNames (ID: 13)
      await db.execute(sql`
        INSERT INTO kyb_fields (
          field_key, display_name, field_type, question, "group", "order", required
        ) VALUES (
          'priorNames', 'Previous Name', 'text', 'List any names the company has operated under in the past five years.',
          'governanceLeadership', 13, true
        )
      `);

      // Add externalAudit (ID: 14)
      await db.execute(sql`
        INSERT INTO kyb_fields (
          field_key, display_name, field_type, question, "group", "order", required
        ) VALUES (
          'externalAudit', 'External Audit', 'boolean', 'Has the company had a non-financial external audit in the last 18 months?',
          'governanceLeadership', 14, true
        )
      `);

      // Add controlEnvironment (ID: 15)
      await db.execute(sql`
        INSERT INTO kyb_fields (
          field_key, display_name, field_type, question, "group", "order", required
        ) VALUES (
          'controlEnvironment', 'Control Environment', 'boolean', 'Does the company operate under a single control environment for all services?',
          'governanceLeadership', 15, true
        )
      `);

      // Add investigationsIncidents (ID: 29)
      await db.execute(sql`
        INSERT INTO kyb_fields (
          field_key, display_name, field_type, question, "group", "order", required
        ) VALUES (
          'investigationsIncidents', 'Legal Investigations', 'boolean', 'Has the company or any of its affiliates faced legal or regulatory investigations in the last five years?',
          'operationsCompliance', 29, true
        )
      `);

      // Add regulatoryActions (ID: 30)
      await db.execute(sql`
        INSERT INTO kyb_fields (
          field_key, display_name, field_type, question, "group", "order", required
        ) VALUES (
          'regulatoryActions', 'Regulatory Orders', 'boolean', 'Has the company been issued regulatory orders or been specifically cited for high-risk findings?',
          'operationsCompliance', 30, true
        )
      `);
    }

    // 3. Delete fields if needed
    if (shouldRemoveTaxFields) {
      console.log('[KYB Migration] Deleting unused fields');

      // Backup data from fields to be deleted for reference
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS kyb_fields_archive (
          id INTEGER,
          field_key TEXT,
          display_name TEXT,
          field_type TEXT,
          question TEXT,
          "group" TEXT,
          required BOOLEAN,
          "order" INTEGER,
          validation_rules JSONB,
          help_text TEXT,
          created_at TIMESTAMP,
          updated_at TIMESTAMP,
          archived_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Archive taxId (ID: 13)
      await db.execute(sql`
        INSERT INTO kyb_fields_archive
        SELECT *, NOW() as archived_at FROM kyb_fields
        WHERE field_key = 'taxId'
      `);

      // Archive taxReceipts (ID: 14)
      await db.execute(sql`
        INSERT INTO kyb_fields_archive
        SELECT *, NOW() as archived_at FROM kyb_fields
        WHERE field_key = 'taxReceipts'
      `);

      // Delete taxId and taxReceipts
      await db.execute(sql`
        DELETE FROM kyb_responses
        WHERE field_id IN (
          SELECT id FROM kyb_fields
          WHERE field_key IN ('taxId', 'taxReceipts')
        )
      `);

      await db.execute(sql`
        DELETE FROM kyb_fields
        WHERE field_key IN ('taxId', 'taxReceipts')
      `);
    } else {
      console.log('[KYB Migration] No fields to delete');
    }

    console.log('[KYB Migration] Successfully updated KYB fields for April 2025 revision');
  } catch (error) {
    console.error('[KYB Migration] Error updating KYB fields:', error);
    throw error;
  }
}