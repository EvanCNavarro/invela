/**
 * ========================================
 * Demo Tracking Fields Migration
 * ========================================
 * 
 * Adds comprehensive demo tracking capabilities to existing companies and users tables.
 * Creates new demo_sessions table for session-based grouping and management.
 * 
 * This migration enhances the existing is_demo boolean with detailed tracking
 * for session management, cleanup automation, and analytics.
 * 
 * @module db/migrations/add-demo-tracking-fields
 * @version 1.0.0
 * @since 2025-05-26
 */

import { db } from '../index';
import { sql } from 'drizzle-orm';

// ========================================
// MIGRATION EXECUTION
// ========================================

/**
 * Executes the demo tracking fields migration
 * Adds new fields and table while preserving existing data
 */
export async function addDemoTrackingFields(): Promise<void> {
  console.log('[Migration] Starting demo tracking fields migration...');
  
  try {
    // Create demo_sessions table first
    await createDemoSessionsTable();
    
    // Add demo tracking fields to companies table
    await addDemoFieldsToCompanies();
    
    // Add demo tracking fields to users table  
    await addDemoFieldsToUsers();
    
    // Create indexes for performance
    await createDemoIndexes();
    
    // Migrate existing demo data
    await migrateLegacyDemoData();
    
    console.log('[Migration] Demo tracking fields migration completed successfully');
  } catch (error) {
    console.error('[Migration] Demo tracking fields migration failed:', error);
    throw error;
  }
}

/**
 * Creates the demo_sessions table for session tracking
 */
async function createDemoSessionsTable(): Promise<void> {
  console.log('[Migration] Creating demo_sessions table...');
  
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS demo_sessions (
      session_id TEXT PRIMARY KEY,
      persona_type TEXT NOT NULL,
      user_agent TEXT,
      ip_address TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      completed_at TIMESTAMP,
      expires_at TIMESTAMP NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      entities_created TEXT[] DEFAULT '{}',
      flow_duration_ms BIGINT,
      cleanup_scheduled BOOLEAN DEFAULT FALSE,
      cleanup_attempted_at TIMESTAMP,
      cleanup_completed_at TIMESTAMP
    )
  `);
  
  console.log('[Migration] ✅ demo_sessions table created');
}

/**
 * Adds demo tracking fields to companies table
 */
async function addDemoFieldsToCompanies(): Promise<void> {
  console.log('[Migration] Adding demo tracking fields to companies table...');
  
  // Note: is_demo already exists, so we skip it
  const fields = [
    'demo_session_id TEXT',
    'demo_created_at TIMESTAMP',
    'demo_persona_type TEXT',
    'demo_expires_at TIMESTAMP',
    'demo_cleanup_eligible BOOLEAN DEFAULT TRUE'
  ];
  
  for (const field of fields) {
    try {
      await db.execute(sql.raw(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS ${field}`));
      console.log(`[Migration] ✅ Added companies.${field.split(' ')[0]}`);
    } catch (error) {
      console.log(`[Migration] ⚠️  Field ${field.split(' ')[0]} might already exist in companies`);
    }
  }
}

/**
 * Adds demo tracking fields to users table
 */
async function addDemoFieldsToUsers(): Promise<void> {
  console.log('[Migration] Adding demo tracking fields to users table...');
  
  const fields = [
    'is_demo_user BOOLEAN DEFAULT FALSE',
    'demo_session_id TEXT',
    'demo_created_at TIMESTAMP',
    'demo_persona_type TEXT',
    'demo_expires_at TIMESTAMP',
    'demo_cleanup_eligible BOOLEAN DEFAULT TRUE',
    'demo_last_login TIMESTAMP'
  ];
  
  for (const field of fields) {
    try {
      await db.execute(sql.raw(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${field}`));
      console.log(`[Migration] ✅ Added users.${field.split(' ')[0]}`);
    } catch (error) {
      console.log(`[Migration] ⚠️  Field ${field.split(' ')[0]} might already exist in users`);
    }
  }
}

/**
 * Creates performance indexes for demo tracking queries
 */
async function createDemoIndexes(): Promise<void> {
  console.log('[Migration] Creating demo tracking indexes...');
  
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_companies_demo_session ON companies(demo_session_id)',
    'CREATE INDEX IF NOT EXISTS idx_companies_demo_expires ON companies(demo_expires_at)',
    'CREATE INDEX IF NOT EXISTS idx_users_demo_session ON users(demo_session_id)', 
    'CREATE INDEX IF NOT EXISTS idx_users_demo_expires ON users(demo_expires_at)',
    'CREATE INDEX IF NOT EXISTS idx_demo_sessions_status ON demo_sessions(status)',
    'CREATE INDEX IF NOT EXISTS idx_demo_sessions_expires ON demo_sessions(expires_at)'
  ];
  
  for (const indexSql of indexes) {
    try {
      await db.execute(sql.raw(indexSql));
      console.log(`[Migration] ✅ Created index: ${indexSql.split(' ')[5]}`);
    } catch (error) {
      console.log(`[Migration] ⚠️  Index might already exist: ${indexSql.split(' ')[5]}`);
    }
  }
}

/**
 * Migrates existing demo data to new tracking system
 * Backfills demo tracking fields for existing demo companies/users
 */
async function migrateLegacyDemoData(): Promise<void> {
  console.log('[Migration] Migrating existing demo data...');
  
  try {
    // Create a legacy session for existing demo data
    const legacySessionId = `legacy-demo-${Date.now()}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
    
    // Create legacy demo session
    await db.execute(sql`
      INSERT INTO demo_sessions (
        session_id, 
        persona_type, 
        created_at, 
        expires_at, 
        status
      ) VALUES (
        ${legacySessionId},
        'legacy-demo',
        NOW(),
        ${expiresAt.toISOString()},
        'completed'
      )
      ON CONFLICT (session_id) DO NOTHING
    `);
    
    // Update existing demo companies
    await db.execute(sql`
      UPDATE companies 
      SET 
        demo_session_id = ${legacySessionId},
        demo_created_at = created_at,
        demo_persona_type = 'legacy-demo',
        demo_expires_at = ${expiresAt.toISOString()},
        demo_cleanup_eligible = TRUE
      WHERE is_demo = TRUE 
      AND demo_session_id IS NULL
    `);
    
    // Update users belonging to demo companies
    await db.execute(sql`
      UPDATE users 
      SET 
        is_demo_user = TRUE,
        demo_session_id = ${legacySessionId},
        demo_created_at = users.created_at,
        demo_persona_type = 'legacy-demo',
        demo_expires_at = ${expiresAt.toISOString()},
        demo_cleanup_eligible = TRUE
      FROM companies 
      WHERE users.company_id = companies.id 
      AND companies.is_demo = TRUE
      AND users.demo_session_id IS NULL
    `);
    
    console.log('[Migration] ✅ Legacy demo data migration completed');
    
  } catch (error) {
    console.error('[Migration] ❌ Legacy demo data migration failed:', error);
    // Don't throw here - migration can continue without legacy data migration
  }
}

/**
 * Rollback function to remove demo tracking fields (for development)
 */
export async function rollbackDemoTrackingFields(): Promise<void> {
  console.log('[Migration] Rolling back demo tracking fields...');
  
  try {
    // Drop columns from companies (except is_demo which existed before)
    const companyFields = [
      'demo_session_id',
      'demo_created_at', 
      'demo_persona_type',
      'demo_expires_at',
      'demo_cleanup_eligible'
    ];
    
    for (const field of companyFields) {
      await db.execute(sql.raw(`ALTER TABLE companies DROP COLUMN IF EXISTS ${field}`));
    }
    
    // Drop columns from users
    const userFields = [
      'is_demo_user',
      'demo_session_id',
      'demo_created_at',
      'demo_persona_type', 
      'demo_expires_at',
      'demo_cleanup_eligible',
      'demo_last_login'
    ];
    
    for (const field of userFields) {
      await db.execute(sql.raw(`ALTER TABLE users DROP COLUMN IF EXISTS ${field}`));
    }
    
    // Drop demo_sessions table
    await db.execute(sql`DROP TABLE IF EXISTS demo_sessions`);
    
    console.log('[Migration] ✅ Demo tracking fields rollback completed');
    
  } catch (error) {
    console.error('[Migration] ❌ Demo tracking fields rollback failed:', error);
    throw error;
  }
}

export default {
  addDemoTrackingFields,
  rollbackDemoTrackingFields
};