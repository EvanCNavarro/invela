import { db } from "@db";
import { sql } from "drizzle-orm";
import { tasks, kybFields, kybResponses, KYBFieldType } from "@db/schema";

const DEFAULT_KYB_FIELDS = [
  { key: 'legalEntityName', name: 'Legal Entity Name', type: KYBFieldType.TEXT },
  { key: 'registrationNumber', name: 'Registration Number', type: KYBFieldType.TEXT },
  { key: 'incorporationDate', name: 'Incorporation Date', type: KYBFieldType.DATE },
  { key: 'registeredAddress', name: 'Registered Address', type: KYBFieldType.TEXT },
  { key: 'businessType', name: 'Business Type', type: KYBFieldType.TEXT },
  { key: 'jurisdiction', name: 'Jurisdiction', type: KYBFieldType.TEXT },
  { key: 'directorsAndOfficers', name: 'Directors and Officers', type: KYBFieldType.TEXT },
  { key: 'ultimateBeneficialOwners', name: 'Ultimate Beneficial Owners', type: KYBFieldType.TEXT },
  { key: 'authorizedSigners', name: 'Authorized Signers', type: KYBFieldType.TEXT },
  { key: 'corporateRegistration', name: 'Corporate Registration', type: KYBFieldType.TEXT },
  { key: 'goodStanding', name: 'Good Standing', type: KYBFieldType.BOOLEAN },
  { key: 'licenses', name: 'Licenses', type: KYBFieldType.TEXT },
  { key: 'taxId', name: 'Tax ID', type: KYBFieldType.TEXT },
  { key: 'financialStatements', name: 'Financial Statements', type: KYBFieldType.TEXT },
  { key: 'operationalPolicies', name: 'Operational Policies', type: KYBFieldType.TEXT },
  { key: 'sanctionsCheck', name: 'Sanctions Check', type: KYBFieldType.TEXT },
  { key: 'dueDiligence', name: 'Due Diligence', type: KYBFieldType.TEXT },
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
        INSERT INTO kyb_fields (field_key, display_name, field_type, "order")
        VALUES (${field.key}, ${field.name}, ${field.type}, ${index + 1})
        ON CONFLICT (field_key) DO NOTHING;
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