/**
 * Create sample Open Banking fields directly
 * 
 * This script creates sample Open Banking field definitions directly
 * in the database without relying on a CSV import
 */

import { db } from './db';
import { openBankingFields } from './db/schema';
import { fileURLToPath } from 'url';
import { Logger } from './server/utils/logger';

// Create a logger instance
const logger = new Logger('OpenBankingSample');

// Sample field data
const sampleOpenBankingFields = [
  {
    order: 1,
    field_key: 'ob_general_info_1',
    display_name: 'Open Banking API Provider',
    question: 'Does your organization provide Open Banking APIs to third parties?',
    group: 'General Information',
    field_type: 'SELECT',
    required: true,
    help_text: 'Select "Yes" if your organization exposes APIs for third-party access to financial data.',
    demo_autofill: 'Yes',
    answer_expectation: 'Yes',
    validation_type: 'SELECT',
    validation_rules: '["Yes", "No", "Planned"]',
    step_index: 0
  },
  {
    order: 2,
    field_key: 'ob_general_info_2',
    display_name: 'Open Banking API Consumer',
    question: 'Does your organization consume Open Banking APIs from other providers?',
    group: 'General Information',
    field_type: 'SELECT',
    required: true,
    help_text: 'Select "Yes" if your organization uses APIs to access financial data from other providers.',
    demo_autofill: 'Yes',
    answer_expectation: 'Yes',
    validation_type: 'SELECT',
    validation_rules: '["Yes", "No", "Planned"]',
    step_index: 0
  },
  {
    order: 3,
    field_key: 'ob_security_1',
    display_name: 'API Authentication Method',
    question: 'What authentication methods do you support for your Open Banking APIs?',
    group: 'Security',
    field_type: 'MULTISELECT',
    required: true,
    help_text: 'Select all authentication methods that your organization supports.',
    demo_autofill: 'OAuth 2.0, MTLS',
    answer_expectation: 'OAuth 2.0, MTLS',
    validation_type: 'MULTISELECT',
    validation_rules: '["OAuth 2.0", "MTLS", "FAPI", "Basic Auth", "API Keys", "Other"]',
    step_index: 1
  },
  {
    order: 4,
    field_key: 'ob_security_2',
    display_name: 'Data Encryption',
    question: 'Do you enforce TLS 1.2+ for all API communications?',
    group: 'Security',
    field_type: 'SELECT',
    required: true,
    help_text: 'TLS 1.2 or higher is required for secure API communications.',
    demo_autofill: 'Yes',
    answer_expectation: 'Yes',
    validation_type: 'SELECT',
    validation_rules: '["Yes", "No", "Partially"]',
    step_index: 1
  },
  {
    order: 5,
    field_key: 'ob_compliance_1',
    display_name: 'Regulatory Compliance',
    question: 'Which Open Banking regulatory frameworks does your organization comply with?',
    group: 'Compliance',
    field_type: 'MULTISELECT',
    required: true,
    help_text: 'Select all regulatory frameworks that your organization complies with.',
    demo_autofill: 'PSD2, CDR',
    answer_expectation: 'PSD2',
    validation_type: 'MULTISELECT',
    validation_rules: '["PSD2", "CDR", "FDX", "Open Banking UK", "Other"]',
    step_index: 2
  },
  {
    order: 6,
    field_key: 'ob_compliance_2',
    display_name: 'Consent Management',
    question: 'How does your organization manage customer consent for data sharing?',
    group: 'Compliance',
    field_type: 'TEXTAREA',
    required: true,
    help_text: 'Describe your consent management process, including how consents are obtained, stored, and revoked.',
    demo_autofill: 'We use a dedicated consent management platform that captures explicit customer consent before data sharing. Customers can review and revoke consent at any time through our online portal.',
    answer_expectation: 'Explicit customer consent management',
    validation_type: 'TEXT',
    validation_rules: null,
    step_index: 2
  },
  {
    order: 7,
    field_key: 'ob_integration_1',
    display_name: 'API Standards',
    question: 'Which API standards does your organization support?',
    group: 'Integration',
    field_type: 'MULTISELECT',
    required: true,
    help_text: 'Select all API standards that your organization supports.',
    demo_autofill: 'REST, JSON-API',
    answer_expectation: 'REST',
    validation_type: 'MULTISELECT',
    validation_rules: '["REST", "SOAP", "GraphQL", "JSON-API", "OData", "Other"]',
    step_index: 3
  },
  {
    order: 8,
    field_key: 'ob_integration_2',
    display_name: 'API Rate Limits',
    question: 'Do you implement rate limiting for your APIs? If yes, please describe.',
    group: 'Integration',
    field_type: 'TEXTAREA',
    required: true,
    help_text: 'Describe your rate limiting strategy, including limits per endpoint, per application, and throttling mechanisms.',
    demo_autofill: 'Yes, we implement rate limiting based on client application needs. Standard limits are 100 requests per minute for non-critical endpoints and 20 requests per minute for sensitive data endpoints.',
    answer_expectation: 'Implemented rate limiting',
    validation_type: 'TEXT',
    validation_rules: null,
    step_index: 3
  },
  {
    order: 9,
    field_key: 'ob_data_1',
    display_name: 'Data Categories',
    question: 'What categories of financial data does your organization share via Open Banking APIs?',
    group: 'Data Protection',
    field_type: 'MULTISELECT',
    required: true,
    help_text: 'Select all types of financial data that your organization shares.',
    demo_autofill: 'Account Information, Transaction History, Standing Orders',
    answer_expectation: 'Account Information, Transaction History',
    validation_type: 'MULTISELECT',
    validation_rules: '["Account Information", "Transaction History", "Standing Orders", "Payments", "Balances", "Credit Card Data", "Loans", "Investment Data"]',
    step_index: 4
  },
  {
    order: 10,
    field_key: 'ob_data_2',
    display_name: 'Data Retention',
    question: 'What is your organization\'s policy for retention of shared financial data?',
    group: 'Data Protection',
    field_type: 'TEXTAREA',
    required: true,
    help_text: 'Describe your data retention policy, including how long data is kept and how it is securely deleted.',
    demo_autofill: 'We retain data for the minimum time necessary for the authorized purpose. Most transaction data is retained for 12 months, after which it is securely deleted. Account information is retained only for the duration of active consent.',
    answer_expectation: 'Appropriate data retention policy',
    validation_type: 'TEXT',
    validation_rules: null,
    step_index: 4
  }
];

async function createSampleOpenBankingFields() {
  try {
    logger.info('[OpenBankingSample] Starting creation of sample Open Banking fields');
    
    // Skip checking for existing data for simplicity
    let hasExistingData = false;
    try {
      const existingRecords = await db.select().from(openBankingFields).limit(1);
      hasExistingData = existingRecords && existingRecords.length > 0;
      console.log('Existing records check:', existingRecords);
    } catch (error) {
      console.error('Error checking existing records:', error);
      // If there's an error, assume no existing data
      hasExistingData = false;
    }
    
    if (hasExistingData) {
      logger.info('[OpenBankingSample] Found existing data in openBankingFields table');
      // Ask for confirmation in real script, but we'll proceed in this sample
      console.log('WARNING: The open_banking_fields table already has data. Will not insert sample data.');
      return;
    }
    
    // Insert sample data
    let insertedCount = 0;
    
    for (const field of sampleOpenBankingFields) {
      try {
        await db.insert(openBankingFields).values(field);
        insertedCount++;
      } catch (error) {
        logger.error(`[OpenBankingSample] Error inserting field: ${field.field_key}`, { error });
        console.error('Error inserting field:', error);
      }
    }
    
    logger.info(`[OpenBankingSample] Successfully inserted ${insertedCount} out of ${sampleOpenBankingFields.length} fields`);
  } catch (error) {
    logger.error('[OpenBankingSample] Error creating sample Open Banking fields', { error });
    console.error('Detailed error:', error);
    throw error;
  }
}

async function run() {
  try {
    await createSampleOpenBankingFields();
    console.log('Sample Open Banking fields created successfully');
    process.exit(0);
  } catch (error) {
    logger.error('[OpenBankingSample] Failed to create sample fields', { error });
    console.error('Failed to create sample fields:', error);
    process.exit(1);
  }
}

// Run the sample creation
run();