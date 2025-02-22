import { db } from "@db";
import { sql } from "drizzle-orm";
import { tasks, kybFields, kybResponses, KYBFieldType } from "@db/schema";

const DEFAULT_KYB_FIELDS = [
  { key: 'legalEntityName', name: 'Legal Entity Name', question: 'What is the registered business name?', type: KYBFieldType.TEXT },
  { key: 'registrationNumber', name: 'Registration Number', question: 'What is the corporation or business number?', type: KYBFieldType.TEXT },
  { key: 'incorporationDate', name: 'Incorporation Date', question: 'When was the company incorporated?', type: KYBFieldType.DATE },
  { key: 'registeredAddress', name: 'Registered Address', question: 'What is the registered business address?', type: KYBFieldType.TEXT },
  { key: 'businessType', name: 'Business Type', question: 'What type of business entity is this?', type: KYBFieldType.TEXT },
  { key: 'jurisdiction', name: 'Jurisdiction', question: 'In which jurisdiction is the company registered?', type: KYBFieldType.TEXT },
  { key: 'directorsAndOfficers', name: 'Directors and Officers', question: 'Who are the current directors and officers?', type: KYBFieldType.TEXT },
  { key: 'ultimateBeneficialOwners', name: 'Ultimate Beneficial Owners', question: 'Who are the ultimate beneficial owners?', type: KYBFieldType.TEXT },
  { key: 'authorizedSigners', name: 'Authorized Signers', question: 'Who are the authorized signers for the company?', type: KYBFieldType.TEXT },
  { key: 'corporateRegistration', name: 'Corporate Registration', question: 'Can you provide corporate registration details?', type: KYBFieldType.TEXT },
  { key: 'goodStanding', name: 'Good Standing', question: 'Is the company in good standing with regulatory authorities?', type: KYBFieldType.BOOLEAN },
  { key: 'licenses', name: 'Licenses', question: 'What licenses and permits does the company hold?', type: KYBFieldType.TEXT },
  { key: 'taxId', name: 'Tax ID', question: 'What is the company\'s tax identification number?', type: KYBFieldType.TEXT },
  { key: 'financialStatements', name: 'Financial Statements', question: 'Can you provide recent financial statements?', type: KYBFieldType.TEXT },
  { key: 'operationalPolicies', name: 'Operational Policies', question: 'What are the key operational policies?', type: KYBFieldType.TEXT },
  { key: 'sanctionsCheck', name: 'Sanctions Check', question: 'Has sanctions screening been completed?', type: KYBFieldType.TEXT },
  { key: 'dueDiligence', name: 'Due Diligence', question: 'What due diligence has been performed?', type: KYBFieldType.TEXT },
];

export async function addKybFormTables() {
  try {
    // Create tables
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS kyb_fields (
        id SERIAL PRIMARY KEY,
        field_key TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        field_type TEXT NOT NULL,
        question TEXT NOT NULL,
        required BOOLEAN NOT NULL DEFAULT true,
        "order" INTEGER NOT NULL,
        validation_rules JSONB,
        help_text TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS kyb_responses (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES tasks(id),
        field_id INTEGER NOT NULL REFERENCES kyb_fields(id),
        response_value TEXT,
        status TEXT NOT NULL DEFAULT 'empty',
        version INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      DROP INDEX IF EXISTS idx_kyb_responses_task_id;
      DROP INDEX IF EXISTS idx_kyb_responses_field_id;

      CREATE INDEX idx_kyb_responses_task_id ON kyb_responses(task_id);
      CREATE INDEX idx_kyb_responses_field_id ON kyb_responses(field_id);
    `);

    // Insert default KYB fields
    for (const [index, field] of DEFAULT_KYB_FIELDS.entries()) {
      await db.execute(sql`
        INSERT INTO kyb_fields (field_key, display_name, field_type, question, "order")
        VALUES (${field.key}, ${field.name}, ${field.type}, ${field.question}, ${index + 1})
        ON CONFLICT (field_key) DO UPDATE
        SET question = ${field.question};
      `);
    }

    // Migrate existing KYB form data
    const kybTasks = await db.execute(sql`
      SELECT id, metadata::json
      FROM tasks
      WHERE task_type = 'company_kyb'
      AND metadata IS NOT NULL;
    `);

    for (const task of kybTasks.rows) {
      const metadata = task.metadata;

      // For each field in the metadata that matches our KYB fields
      for (const field of DEFAULT_KYB_FIELDS) {
        if (metadata && metadata[field.key]) {
          await db.execute(sql`
            INSERT INTO kyb_responses (
              task_id,
              field_id,
              response_value,
              status
            )
            SELECT 
              ${task.id},
              kf.id,
              ${metadata[field.key]},
              CASE 
                WHEN ${metadata[field.key]} IS NULL OR ${metadata[field.key]} = '' THEN 'empty'
                ELSE 'complete'
              END
            FROM kyb_fields kf
            WHERE kf.field_key = ${field.key}
            ON CONFLICT DO NOTHING;
          `);
        }
      }
    }

    console.log('Successfully created KYB form tables and migrated existing data');
  } catch (error) {
    console.error('Error creating KYB form tables:', error);
    throw error;
  }
}