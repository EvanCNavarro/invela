/**
 * KYB Fields Enhancement Migration
 * 
 * This migration performs the following operations:
 * 1. Adds three new metadata columns to the kyb_fields table:
 *    - answer_expectation: Provides guidance text for users
 *    - demo_autofill: Contains sample values for demonstrations
 *    - validation_type: Indicates required documentation type
 * 2. Updates field ordering to match the normalized structure
 * 
 * IMPORTANT: This migration preserves all existing data and functionality while
 * enhancing the metadata and organization of KYB fields.
 */

import { Pool } from 'pg';
// No need for csv-parse - we've hard-coded the data from the CSV

/**
 * The following mapping contains the field_key and metadata from 
 * the KYB_Form_Fields_Sorted_Normalized.csv to use for migration.
 * 
 * Format:
 * field_key: {
 *   order: number,
 *   answer_expectation: string,
 *   demo_autofill: string,
 *   validation_type: string
 * }
 */
const fieldMetadata: Record<string, {
  order: number;
  answer_expectation: string;
  demo_autofill: string;
  validation_type: string;
}> = {
  'legalEntityName': {
    order: 1,
    answer_expectation: 'Provide the full legal business name exactly as it appears in official registration documents.',
    demo_autofill: 'FinTech Innovations LLC',
    validation_type: '3rd-Party or Internal Document'
  },
  'registrationNumber': {
    order: 2,
    answer_expectation: 'Provide the official Employer Identification Number (EIN) or State-issued entity ID number.',
    demo_autofill: '12-3456789',
    validation_type: '3rd-Party or Internal Document'
  },
  'incorporationDate': {
    order: 3,
    answer_expectation: 'Specify the exact incorporation date in MM/DD/YYYY format.',
    demo_autofill: '5/12/10',
    validation_type: '3rd-Party or Internal Document'
  },
  'businessType': {
    order: 4,
    answer_expectation: 'Indicate the type of legal business entity (e.g., LLC, Corporation, Partnership).',
    demo_autofill: 'Limited Liability Company (LLC)',
    validation_type: '3rd-Party or Internal Document'
  },
  'jurisdiction': {
    order: 5,
    answer_expectation: 'Provide the official jurisdiction (state/country) of company registration.',
    demo_autofill: 'Delaware, United States',
    validation_type: '3rd-Party or Internal Document'
  },
  'registeredAddress': {
    order: 6,
    answer_expectation: 'Provide the company\'s official registered address, including street, city, state, and zip/postal code.',
    demo_autofill: '123 Market Street, Wilmington, DE 19801',
    validation_type: '3rd-Party or Internal Document'
  },
  'companyPhone': {
    order: 7,
    answer_expectation: 'Provide the official phone number for business inquiries or contact purposes.',
    demo_autofill: '(302) 555-1234',
    validation_type: '3rd-Party or Internal Document'
  },
  'priorNames': {
    order: 8,
    answer_expectation: 'List any previous names under which the company has operated within the past five years. If none, state "None."',
    demo_autofill: 'None',
    validation_type: '3rd-Party or Internal Document'
  },
  'licenses': {
    order: 9,
    answer_expectation: 'Provide the full names of all individuals authorized to sign or represent the company officially.',
    demo_autofill: 'John Smith, Jane Doe',
    validation_type: '3rd-Party or Internal Document'
  },
  'goodStanding': {
    order: 10,
    answer_expectation: 'Indicate whether the company is current and in good standing with relevant regulatory authorities. Answer "Yes" or "No."',
    demo_autofill: 'Yes',
    validation_type: '3rd-Party or Internal Document'
  },
  'corporateRegistration': {
    order: 11,
    answer_expectation: 'Specify if the company is owned or controlled by any government or governmental entity. Answer with "Yes" or "No."',
    demo_autofill: 'No',
    validation_type: '3rd-Party or Internal Document'
  },
  'externalAudit': {
    order: 12,
    answer_expectation: 'Specify if the company is publicly traded. Answer with "Yes" or "No."',
    demo_autofill: 'No',
    validation_type: '3rd-Party or Internal Document'
  },
  'controlEnvironment': {
    order: 13,
    answer_expectation: 'Provide the full names and titles of all members serving on the company board of directors.',
    demo_autofill: 'John Smith (Chairman), Jane Doe (Director), Mike Johnson (Director)',
    validation_type: '3rd-Party or Internal Document'
  },
  'authorizedSigners': {
    order: 14,
    answer_expectation: 'Provide the total number of full-time employees currently working for the company.',
    demo_autofill: '150',
    validation_type: '3rd-Party or Internal Document'
  },
  'governmentOwnership': {
    order: 15,
    answer_expectation: 'Specify the total number of contractors or part-time employees currently associated with the company.',
    demo_autofill: '25',
    validation_type: '3rd-Party or Internal Document'
  },
  'ultimateBeneficialOwners': {
    order: 16,
    answer_expectation: 'Provide details of any affiliated or subsidiary companies associated with your organization. If none, state "None."',
    demo_autofill: 'None',
    validation_type: '3rd-Party or Internal Document'
  },
  'directorsAndOfficers': {
    order: 17,
    answer_expectation: 'Describe briefly the company primary business activities and service offerings.',
    demo_autofill: 'Financial data aggregation and analytics services',
    validation_type: '3rd-Party or Internal Document'
  },
  'contactEmail': {
    order: 18,
    answer_expectation: 'Provide the email address of the primary company representative completing this form.',
    demo_autofill: 'contact@fintechinnovations.com',
    validation_type: '3rd-Party or Internal Document'
  },
  'marketCapitalization': {
    order: 19,
    answer_expectation: 'Indicate whether the company has liability insurance coverage. Answer "Yes" or "No."',
    demo_autofill: 'Yes',
    validation_type: '3rd-Party or Internal Document'
  },
  'annualRecurringRevenue': {
    order: 20,
    answer_expectation: 'Provide the company annual revenue from the most recent fiscal year, in USD.',
    demo_autofill: '5,000,000',
    validation_type: '3rd-Party or Internal Document'
  },
  'lifetimeCustomerValue': {
    order: 21,
    answer_expectation: 'Provide the name and contact information of the company primary financial institution or bank.',
    demo_autofill: 'First National Bank, (302) 555-7890',
    validation_type: '3rd-Party or Internal Document'
  },
  'monthlyRecurringRevenue': {
    order: 22,
    answer_expectation: 'State the company total assets from the most recent fiscal year-end, in USD.',
    demo_autofill: '12,500,000',
    validation_type: '3rd-Party or Internal Document'
  },
  'investigationsIncidents': {
    order: 23,
    answer_expectation: 'Provide the company net income or net loss from the most recent fiscal year, in USD. Indicate clearly if it is a loss.',
    demo_autofill: '800,000',
    validation_type: '3rd-Party or Internal Document'
  },
  'financialStatements': {
    order: 24,
    answer_expectation: 'Indicate if the company has undergone a non-financial external audit within the past 18 months. Answer "Yes" or "No."',
    demo_autofill: 'Yes',
    validation_type: '3rd-Party or Internal Document'
  },
  'operationalPolicies': {
    order: 25,
    answer_expectation: 'Provide the name of the audit firm and date of the most recent non-financial external audit, if applicable. If none, state "None."',
    demo_autofill: 'Audit Partners LLC, 08/20/2024',
    validation_type: '3rd-Party or Internal Document'
  },
  'dataVolume': {
    order: 26,
    answer_expectation: 'Indicate if the company has undergone a SOC 2 audit within the past 18 months. Answer "Yes" or "No."',
    demo_autofill: 'Yes',
    validation_type: '3rd-Party or Internal Document'
  },
  'dataTypes': {
    order: 27,
    answer_expectation: 'Provide the name of the audit firm and date of the most recent SOC 2 audit, if applicable. If none, state "None."',
    demo_autofill: 'SecureAudit LLP, 09/15/2024',
    validation_type: '3rd-Party or Internal Document'
  },
  'sanctionsCheck': {
    order: 28,
    answer_expectation: 'Estimate the volume of sensitive data (in records or transactions) the company currently manages on a monthly basis.',
    demo_autofill: 'Approximately 2 million records per month',
    validation_type: '3rd-Party or Internal Document'
  },
  'dueDiligence': {
    order: 29,
    answer_expectation: 'Indicate if the company operates under a single unified control environment for all services. Answer "Yes" or "No."',
    demo_autofill: 'Yes',
    validation_type: '3rd-Party or Internal Document'
  },
  'regulatoryActions': {
    order: 30,
    answer_expectation: 'Indicate if the company has a formal cybersecurity policy documented. Answer "Yes" or "No."',
    demo_autofill: 'Yes',
    validation_type: '3rd-Party or Internal Document'
  }
};

export async function migrate() {
  console.log('[KYB Fields Migration] Starting migration...');
  
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
      console.log('[KYB Fields Migration] Adding answer_expectation column...');
      await pool.query(`ALTER TABLE kyb_fields ADD COLUMN answer_expectation TEXT`);
    }
    
    if (!existingColumns.includes('demo_autofill')) {
      console.log('[KYB Fields Migration] Adding demo_autofill column...');
      await pool.query(`ALTER TABLE kyb_fields ADD COLUMN demo_autofill TEXT`);
    }
    
    if (!existingColumns.includes('validation_type')) {
      console.log('[KYB Fields Migration] Adding validation_type column...');
      await pool.query(`ALTER TABLE kyb_fields ADD COLUMN validation_type TEXT`);
    }
    
    // Step 2: Begin a transaction for updating field data and ordering
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get all existing fields to make sure we only update what exists
      const existingFieldsResult = await client.query(`
        SELECT field_key FROM kyb_fields
      `);
      
      const existingFieldKeys = existingFieldsResult.rows.map(row => row.field_key);
      
      // Update metadata and ordering
      for (const fieldKey of existingFieldKeys) {
        const metadata = fieldMetadata[fieldKey];
        
        if (metadata) {
          // Update the field with new metadata
          await client.query(`
            UPDATE kyb_fields
            SET 
              answer_expectation = $1,
              demo_autofill = $2,
              validation_type = $3,
              "order" = $4
            WHERE field_key = $5
          `, [
            metadata.answer_expectation,
            metadata.demo_autofill,
            metadata.validation_type,
            metadata.order,
            fieldKey
          ]);
          
          console.log(`[KYB Fields Migration] Updated field ${fieldKey} with new metadata and order ${metadata.order}`);
        } else {
          console.log(`[KYB Fields Migration] Warning: No metadata found for field ${fieldKey}, skipping`);
        }
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
  } catch (error) {
    console.error('[KYB Fields Migration] Migration failed:', error);
    throw error;
  } finally {
    // Close the pool connection to prevent hanging
    await pool.end();
  }
  
  console.log('[KYB Fields Migration] Migration completed successfully');
}

export async function rollback() {
  console.log('[KYB Fields Migration] Starting rollback...');
  
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
    
    console.log('[KYB Fields Migration] Rollback completed successfully');
  } catch (error) {
    console.error('[KYB Fields Migration] Failed to roll back column additions:', error);
    throw error;
  } finally {
    await pool.end();
  }
}