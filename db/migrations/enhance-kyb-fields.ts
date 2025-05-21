/**
 * KYB Fields Enhancement Migration
 * 
 * This migration enhances the KYB fields table with new metadata columns from
 * the normalized fields data and updates field ordering to match the
 * normalized structure.
 */

import pg from 'pg';
const { Pool } = pg;

// Create a more compatible and simpler version of the migration
export async function migrate() {
  console.log('[KYB Fields Enhancement] Starting migration...');
  
  // Get a direct database pool connection for raw SQL queries
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    // Step 1: Add new columns if they don't exist
    const columnCheckResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'kyb_fields' 
      AND column_name IN ('answer_expectation', 'demo_autofill', 'validation_type')
    `);
    
    const existingColumns = columnCheckResult.rows.map(row => row.column_name);
    
    // Add columns that don't exist yet
    if (!existingColumns.includes('answer_expectation')) {
      console.log('[KYB Fields Enhancement] Adding answer_expectation column...');
      await pool.query(`ALTER TABLE kyb_fields ADD COLUMN answer_expectation TEXT`);
    }
    
    if (!existingColumns.includes('demo_autofill')) {
      console.log('[KYB Fields Enhancement] Adding demo_autofill column...');
      await pool.query(`ALTER TABLE kyb_fields ADD COLUMN demo_autofill TEXT`);
    }
    
    if (!existingColumns.includes('validation_type')) {
      console.log('[KYB Fields Enhancement] Adding validation_type column...');
      await pool.query(`ALTER TABLE kyb_fields ADD COLUMN validation_type TEXT`);
    }
    
    // Step 2: Update field content and order
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update field legalEntityName (id 1)
      await client.query(`
        UPDATE kyb_fields
        SET 
          "order" = 1,
          answer_expectation = 'Provide the full legal business name exactly as it appears in official registration documents.',
          demo_autofill = 'FinTech Innovations LLC',
          validation_type = '3rd-Party or Internal Document'
        WHERE field_key = 'legalEntityName'
      `);
      
      // Update field registrationNumber (id 2)
      await client.query(`
        UPDATE kyb_fields
        SET 
          "order" = 2,
          answer_expectation = 'Provide the official Employer Identification Number (EIN) or State-issued entity ID number.',
          demo_autofill = '12-3456789',
          validation_type = '3rd-Party or Internal Document'
        WHERE field_key = 'registrationNumber'
      `);
      
      // Update field incorporationDate (id 3)
      await client.query(`
        UPDATE kyb_fields
        SET 
          "order" = 3,
          answer_expectation = 'Specify the exact incorporation date in MM/DD/YYYY format.',
          demo_autofill = '5/12/10',
          validation_type = '3rd-Party or Internal Document'
        WHERE field_key = 'incorporationDate'
      `);
      
      // Update field businessType (id 4)
      await client.query(`
        UPDATE kyb_fields
        SET 
          "order" = 4,
          answer_expectation = 'Indicate the type of legal business entity (e.g., LLC, Corporation, Partnership).',
          demo_autofill = 'Limited Liability Company (LLC)',
          validation_type = '3rd-Party or Internal Document'
        WHERE field_key = 'businessType'
      `);
      
      // Update field jurisdiction (id 5)
      await client.query(`
        UPDATE kyb_fields
        SET 
          "order" = 5,
          answer_expectation = 'Provide the official jurisdiction (state/country) of company registration.',
          demo_autofill = 'Delaware, United States',
          validation_type = '3rd-Party or Internal Document'
        WHERE field_key = 'jurisdiction'
      `);
      
      // Update field registeredAddress (id 6) 
      await client.query(`
        UPDATE kyb_fields
        SET 
          "order" = 6,
          answer_expectation = 'Provide the company''s official registered address, including street, city, state, and zip/postal code.',
          demo_autofill = '123 Market Street, Wilmington, DE 19801',
          validation_type = '3rd-Party or Internal Document'
        WHERE field_key = 'registeredAddress'
      `);
      
      // Update field companyPhone (id 7)
      await client.query(`
        UPDATE kyb_fields
        SET 
          "order" = 7,
          answer_expectation = 'Provide the official phone number for business inquiries or contact purposes.',
          demo_autofill = '(302) 555-1234',
          validation_type = '3rd-Party or Internal Document'
        WHERE field_key = 'companyPhone'
      `);
      
      // Update field priorNames (id 13 → 8)
      await client.query(`
        UPDATE kyb_fields
        SET 
          "order" = 8,
          answer_expectation = 'List any previous names under which the company has operated within the past five years. If none, state "None."',
          demo_autofill = 'None',
          validation_type = '3rd-Party or Internal Document'
        WHERE field_key = 'priorNames'
      `);
      
      // Update field contactEmail (id 8 → 18)
      await client.query(`
        UPDATE kyb_fields
        SET 
          "order" = 18,
          answer_expectation = 'Provide the email address of the primary company representative completing this form.',
          demo_autofill = 'contact@fintechinnovations.com',
          validation_type = '3rd-Party or Internal Document'
        WHERE field_key = 'contactEmail'
      `);
      
      // Update remaining fields...
      await client.query(`
        UPDATE kyb_fields
        SET 
          "order" = 9,
          answer_expectation = 'Provide the full names of all individuals authorized to sign or represent the company officially.',
          demo_autofill = 'John Smith, Jane Doe',
          validation_type = '3rd-Party or Internal Document'
        WHERE field_key = 'licenses'
      `);
      
      await client.query(`
        UPDATE kyb_fields
        SET 
          "order" = 10,
          answer_expectation = 'Indicate whether the company is current and in good standing with relevant regulatory authorities. Answer "Yes" or "No."',
          demo_autofill = 'Yes',
          validation_type = '3rd-Party or Internal Document'
        WHERE field_key = 'goodStanding'
      `);
      
      await client.query(`
        UPDATE kyb_fields
        SET 
          "order" = 11,
          answer_expectation = 'Specify if the company is owned or controlled by any government or governmental entity. Answer with "Yes" or "No."',
          demo_autofill = 'No',
          validation_type = '3rd-Party or Internal Document'
        WHERE field_key = 'corporateRegistration'
      `);
      
      await client.query(`
        UPDATE kyb_fields
        SET 
          "order" = 12,
          answer_expectation = 'Specify if the company is publicly traded. Answer with "Yes" or "No."',
          demo_autofill = 'No',
          validation_type = '3rd-Party or Internal Document'
        WHERE field_key = 'externalAudit'
      `);
      
      await client.query(`
        UPDATE kyb_fields
        SET 
          "order" = 13,
          answer_expectation = 'Provide the full names and titles of all members serving on the company''s board of directors.',
          demo_autofill = 'John Smith (Chairman), Jane Doe (Director), Mike Johnson (Director)',
          validation_type = '3rd-Party or Internal Document'
        WHERE field_key = 'controlEnvironment'
      `);
      
      await client.query(`
        UPDATE kyb_fields
        SET 
          "order" = 14,
          answer_expectation = 'Provide the total number of full-time employees currently working for the company.',
          demo_autofill = '150',
          validation_type = '3rd-Party or Internal Document'
        WHERE field_key = 'authorizedSigners'
      `);
      
      await client.query(`
        UPDATE kyb_fields
        SET 
          "order" = 15,
          answer_expectation = 'Specify the total number of contractors or part-time employees currently associated with the company.',
          demo_autofill = '25',
          validation_type = '3rd-Party or Internal Document'
        WHERE field_key = 'governmentOwnership'
      `);
      
      await client.query(`
        UPDATE kyb_fields
        SET 
          "order" = 16,
          answer_expectation = 'Provide details of any affiliated or subsidiary companies associated with your organization. If none, state "None."',
          demo_autofill = 'None',
          validation_type = '3rd-Party or Internal Document'
        WHERE field_key = 'ultimateBeneficialOwners'
      `);
      
      await client.query(`
        UPDATE kyb_fields
        SET 
          "order" = 17,
          answer_expectation = 'Describe briefly the company''s primary business activities and service offerings.',
          demo_autofill = 'Financial data aggregation and analytics services',
          validation_type = '3rd-Party or Internal Document'
        WHERE field_key = 'directorsAndOfficers'
      `);
      
      // Financial section
      await client.query(`
        UPDATE kyb_fields
        SET 
          "order" = 19,
          answer_expectation = 'Indicate whether the company has liability insurance coverage. Answer "Yes" or "No."',
          demo_autofill = 'Yes',
          validation_type = '3rd-Party or Internal Document'
        WHERE field_key = 'marketCapitalization'
      `);
      
      await client.query(`
        UPDATE kyb_fields
        SET 
          "order" = 20,
          answer_expectation = 'Provide the company''s annual revenue from the most recent fiscal year, in USD.',
          demo_autofill = '5,000,000',
          validation_type = '3rd-Party or Internal Document'
        WHERE field_key = 'annualRecurringRevenue'
      `);
      
      await client.query(`
        UPDATE kyb_fields
        SET 
          "order" = 21,
          answer_expectation = 'Provide the name and contact information of the company''s primary financial institution or bank.',
          demo_autofill = 'First National Bank, (302) 555-7890',
          validation_type = '3rd-Party or Internal Document'
        WHERE field_key = 'lifetimeCustomerValue'
      `);
      
      await client.query(`
        UPDATE kyb_fields
        SET 
          "order" = 22,
          answer_expectation = 'State the company''s total assets from the most recent fiscal year-end, in USD.',
          demo_autofill = '12,500,000',
          validation_type = '3rd-Party or Internal Document'
        WHERE field_key = 'monthlyRecurringRevenue'
      `);
      
      // Operations section
      await client.query(`
        UPDATE kyb_fields
        SET 
          "order" = 23,
          answer_expectation = 'Provide the company''s net income or net loss from the most recent fiscal year, in USD. Indicate clearly if it is a loss.',
          demo_autofill = '800,000',
          validation_type = '3rd-Party or Internal Document'
        WHERE field_key = 'investigationsIncidents'
      `);
      
      await client.query(`
        UPDATE kyb_fields
        SET 
          "order" = 24,
          answer_expectation = 'Indicate if the company has undergone a non-financial external audit within the past 18 months. Answer "Yes" or "No."',
          demo_autofill = 'Yes',
          validation_type = '3rd-Party or Internal Document'
        WHERE field_key = 'financialStatements'
      `);
      
      await client.query(`
        UPDATE kyb_fields
        SET 
          "order" = 25,
          answer_expectation = 'Provide the name of the audit firm and date of the most recent non-financial external audit, if applicable. If none, state "None."',
          demo_autofill = 'Audit Partners LLC, 08/20/2024',
          validation_type = '3rd-Party or Internal Document'
        WHERE field_key = 'operationalPolicies'
      `);
      
      await client.query(`
        UPDATE kyb_fields
        SET 
          "order" = 26,
          answer_expectation = 'Indicate if the company has undergone a SOC 2 audit within the past 18 months. Answer "Yes" or "No."',
          demo_autofill = 'Yes',
          validation_type = '3rd-Party or Internal Document'
        WHERE field_key = 'dataVolume'
      `);
      
      await client.query(`
        UPDATE kyb_fields
        SET 
          "order" = 27,
          answer_expectation = 'Provide the name of the audit firm and date of the most recent SOC 2 audit, if applicable. If none, state "None."',
          demo_autofill = 'SecureAudit LLP, 09/15/2024',
          validation_type = '3rd-Party or Internal Document'
        WHERE field_key = 'dataTypes'
      `);
      
      await client.query(`
        UPDATE kyb_fields
        SET 
          "order" = 28,
          answer_expectation = 'Estimate the volume of sensitive data (in records or transactions) the company currently manages on a monthly basis.',
          demo_autofill = 'Approximately 2 million records per month',
          validation_type = '3rd-Party or Internal Document'
        WHERE field_key = 'sanctionsCheck'
      `);
      
      await client.query(`
        UPDATE kyb_fields
        SET 
          "order" = 29,
          answer_expectation = 'Indicate if the company operates under a single unified control environment for all services. Answer "Yes" or "No."',
          demo_autofill = 'Yes',
          validation_type = '3rd-Party or Internal Document'
        WHERE field_key = 'dueDiligence'
      `);
      
      await client.query(`
        UPDATE kyb_fields
        SET 
          "order" = 30,
          answer_expectation = 'Indicate if the company has a formal cybersecurity policy documented. Answer "Yes" or "No."',
          demo_autofill = 'Yes',
          validation_type = '3rd-Party or Internal Document'
        WHERE field_key = 'regulatoryActions'
      `);
      
      await client.query('COMMIT');
      console.log('[KYB Fields Enhancement] Successfully updated kyb_fields table');
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[KYB Fields Enhancement] Error updating kyb_fields:', error);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[KYB Fields Enhancement] Migration failed:', error);
    throw error;
  } finally {
    // Close the pool connection to prevent hanging
    await pool.end();
  }
  
  console.log('[KYB Fields Enhancement] Migration completed successfully');
}

export async function rollback() {
  console.log('[KYB Fields Enhancement] Starting rollback...');
  
  // Use a direct pool connection for the rollback as well
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    // Only drop the new columns, don't revert the order changes to avoid data inconsistency
    await pool.query(`
      ALTER TABLE kyb_fields 
      DROP COLUMN IF EXISTS answer_expectation,
      DROP COLUMN IF EXISTS demo_autofill,
      DROP COLUMN IF EXISTS validation_type
    `);
    
    console.log('[KYB Fields Enhancement] Rollback completed successfully');
  } catch (error) {
    console.error('[KYB Fields Enhancement] Failed to roll back column additions:', error);
    throw error;
  } finally {
    await pool.end();
  }
}