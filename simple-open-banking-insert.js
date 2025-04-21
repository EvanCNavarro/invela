/**
 * Simple script to insert Open Banking sample fields
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const sampleFields = [
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
  }
];

async function createSampleFields() {
  const client = await pool.connect();
  try {
    console.log('Checking if table has data...');
    const { rows } = await client.query('SELECT COUNT(*) FROM open_banking_fields');
    const count = parseInt(rows[0].count);
    
    if (count > 0) {
      console.log(`Table already has ${count} records. Not inserting sample data.`);
      return;
    }
    
    console.log('Inserting sample data...');
    for (const field of sampleFields) {
      const values = Object.values(field);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      const columns = Object.keys(field).join(', ');
      
      const query = `INSERT INTO open_banking_fields (${columns}) VALUES (${placeholders})`;
      
      try {
        await client.query(query, values);
        console.log(`Inserted field: ${field.field_key}`);
      } catch (err) {
        console.error(`Error inserting ${field.field_key}:`, err.message);
      }
    }
    
    console.log('Sample data insertion completed');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
  }
}

createSampleFields()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
