import { db } from "@db";
import { sql } from "drizzle-orm";
import { tasks, kybFields, kybResponses, KYBFieldType } from "@db/schema";

const NEW_KYB_FIELDS = [
  // Step 1: Legal Entity Name
  { key: 'legalEntityName', name: 'Legal Entity Name', question: 'What is the registered business name?', type: KYBFieldType.TEXT, group: 'Legal Entity Name', order: 1 },
  { key: 'registrationNumber', name: 'Registration Number', question: 'What is the corporation or business number?', type: KYBFieldType.TEXT, group: 'Legal Entity Name', order: 2 },
  { key: 'incorporationDate', name: 'Incorporation Date', question: 'When was the company incorporated?', type: KYBFieldType.DATE, group: 'Legal Entity Name', order: 3 },
  { key: 'registeredAddress', name: 'Registered Address', question: 'What is the registered business address?', type: KYBFieldType.TEXT, group: 'Legal Entity Name', order: 4 },
  { key: 'businessType', name: 'Business Type', question: 'What type of business entity is this?', type: KYBFieldType.TEXT, group: 'Legal Entity Name', order: 5 },
  { key: 'jurisdiction', name: 'Jurisdiction', question: 'In which jurisdiction is the company registered?', type: KYBFieldType.TEXT, group: 'Legal Entity Name', order: 6 },

  // Step 2: Directors & Officers
  { key: 'directorsAndOfficers', name: 'Directors and Officers', question: 'Who are the current directors and officers?', type: KYBFieldType.TEXT, group: 'Directors & Officers', order: 7 },
  { key: 'ultimateBeneficialOwners', name: 'Ultimate Beneficial Owners', question: 'Who are the ultimate beneficial owners?', type: KYBFieldType.TEXT, group: 'Directors & Officers', order: 8 },
  { key: 'authorizedSigners', name: 'Authorized Signers', question: 'Who are the authorized signers for the company?', type: KYBFieldType.TEXT, group: 'Directors & Officers', order: 9 },

  // Step 3: Corporate Registration
  { key: 'corporateRegistration', name: 'Corporate Registration', question: 'Can you provide corporate registration details?', type: KYBFieldType.TEXT, group: 'Corporate Registration', order: 10 },
  { key: 'goodStanding', name: 'Good Standing', question: 'Is the company in good standing with regulatory authorities?', type: KYBFieldType.BOOLEAN, group: 'Corporate Registration', order: 11 },
  { key: 'licenses', name: 'Licenses', question: 'What licenses and permits does the company hold?', type: KYBFieldType.TEXT, group: 'Corporate Registration', order: 12 },

  // Step 4: Tax Identification
  { key: 'taxId', name: 'Tax ID', question: 'What is the company\'s tax identification number?', type: KYBFieldType.TEXT, group: 'Tax Identification', order: 13 },
  { key: 'taxReceipts', name: 'Tax Receipts', question: 'Please provide the company\'s most recent tax receipts or fiscal year tax filings.', type: KYBFieldType.TEXT, group: 'Tax Identification', order: 14 },
  { 
    key: 'annualRecurringRevenue', 
    name: 'Annual Recurring Revenue', 
    question: 'What is the company\'s most recent Annual Recurring Revenue (ARR)?', 
    type: KYBFieldType.MULTIPLE_CHOICE, 
    group: 'Tax Identification', 
    order: 15,
    validation_rules: {
      options: [
        'Less than $1 million',
        '$1 million - $10 million',
        '$10 million - $50 million',
        'Greater than $50 million'
      ],
      mapping: {
        'Less than $1 million': 'small',
        '$1 million - $10 million': 'medium',
        '$10 million - $50 million': 'large',
        'Greater than $50 million': 'xlarge'
      }
    }
  },
  { key: 'monthlyRecurringRevenue', name: 'Monthly Recurring Revenue', question: 'What is the company\'s most recent Monthly Recurring Revenue (MRR)?', type: KYBFieldType.TEXT, group: 'Tax Identification', order: 16 },
  { key: 'marketCapitalization', name: 'Market Capitalization', question: 'What is the company\'s current market capitalization?', type: KYBFieldType.TEXT, group: 'Tax Identification', order: 17 },
  { key: 'lifetimeCustomerValue', name: 'Lifetime Customer Value', question: 'What is the company\'s average Lifetime Customer Value (LCV)?', type: KYBFieldType.TEXT, group: 'Tax Identification', order: 18 },
  { key: 'financialStatements', name: 'Financial Statements', question: 'Can you provide recent financial statements?', type: KYBFieldType.TEXT, group: 'Tax Identification', order: 19 },
  { key: 'operationalPolicies', name: 'Operational Policies', question: 'What are the key operational policies?', type: KYBFieldType.TEXT, group: 'Tax Identification', order: 20 },
  { key: 'dataVolume', name: 'Data Volume', question: 'How much data does the company currently manage?', type: KYBFieldType.TEXT, group: 'Tax Identification', order: 21 },
  { key: 'dataTypes', name: 'Data Types', question: 'Which types of data does the company need access to?', type: KYBFieldType.TEXT, group: 'Tax Identification', order: 22 },

  // Step 5: Sanctions & Adverse Media
  { key: 'sanctionsCheck', name: 'Sanctions Check', question: 'Has sanctions screening been completed?', type: KYBFieldType.TEXT, group: 'Sanctions & Adverse Media', order: 23 },
  { key: 'dueDiligence', name: 'Due Diligence', question: 'What due diligence has been performed?', type: KYBFieldType.TEXT, group: 'Sanctions & Adverse Media', order: 24 }
];

export async function updateKybFieldsComprehensive() {
  try {
    // Drop existing kyb_responses first due to foreign key constraints
    await db.execute(sql`DROP TABLE IF EXISTS kyb_responses CASCADE`);
    
    // Drop and recreate kyb_fields table
    await db.execute(sql`DROP TABLE IF EXISTS kyb_fields CASCADE`);
    
    // Create kyb_fields table
    await db.execute(sql`
      CREATE TABLE kyb_fields (
        id SERIAL PRIMARY KEY,
        field_key TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        field_type TEXT NOT NULL,
        question TEXT NOT NULL,
        "group" TEXT NOT NULL,
        required BOOLEAN NOT NULL DEFAULT true,
        "order" INTEGER NOT NULL,
        validation_rules JSONB,
        help_text TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE kyb_responses (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES tasks(id),
        field_id INTEGER NOT NULL REFERENCES kyb_fields(id),
        response_value TEXT,
        status TEXT NOT NULL DEFAULT 'empty',
        version INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX idx_kyb_responses_task_id ON kyb_responses(task_id);
      CREATE INDEX idx_kyb_responses_field_id ON kyb_responses(field_id);
    `);

    // Insert new KYB fields
    for (const field of NEW_KYB_FIELDS) {
      await db.execute(sql`
        INSERT INTO kyb_fields (
          field_key, 
          display_name, 
          field_type, 
          question, 
          "group", 
          "order",
          validation_rules
        )
        VALUES (
          ${field.key}, 
          ${field.name}, 
          ${field.type}, 
          ${field.question}, 
          ${field.group}, 
          ${field.order},
          ${field.validation_rules ? JSON.stringify(field.validation_rules) : null}
        );
      `);
    }

    console.log('Successfully updated KYB fields with comprehensive question list');
  } catch (error) {
    console.error('Error updating KYB fields:', error);
    throw error;
  }
}
