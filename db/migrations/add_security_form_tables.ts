import { db } from "@db";
import { sql } from "drizzle-orm";

/**
 * Adds the necessary tables for the Security Assessment feature
 */
export async function addSecurityFormTables() {
  console.log('[DB Migration] Creating security form tables...');
  
  try {
    // Create security_fields table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS security_fields (
        id SERIAL PRIMARY KEY,
        section VARCHAR(255) NOT NULL,
        field_key VARCHAR(255) NOT NULL UNIQUE,
        label TEXT NOT NULL,
        description TEXT,
        field_type VARCHAR(50) NOT NULL,
        is_required BOOLEAN NOT NULL DEFAULT false,
        options JSONB,
        validation_rules JSONB,
        metadata JSONB,
        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP
      )
    `);
    
    // Create security_responses table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS security_responses (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        field_id INTEGER NOT NULL REFERENCES security_fields(id) ON DELETE CASCADE,
        response TEXT,
        metadata JSONB,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP,
        UNIQUE(company_id, field_id)
      )
    `);
    
    // Add indices for improved query performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_security_fields_section ON security_fields(section);
      CREATE INDEX IF NOT EXISTS idx_security_fields_field_key ON security_fields(field_key);
      CREATE INDEX IF NOT EXISTS idx_security_fields_status ON security_fields(status);
      CREATE INDEX IF NOT EXISTS idx_security_responses_company_id ON security_responses(company_id);
      CREATE INDEX IF NOT EXISTS idx_security_responses_field_id ON security_responses(field_id);
      CREATE INDEX IF NOT EXISTS idx_security_responses_status ON security_responses(status);
    `);
    
    console.log('[DB Migration] Security form tables created successfully.');
    return true;
  } catch (error) {
    console.error('[DB Migration] Error creating security form tables:', error);
    throw error;
  }
}