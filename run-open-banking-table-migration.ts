/**
 * Run Open Banking Survey table migration
 * 
 * This script creates the Open Banking Survey fields table directly using SQL
 * to ensure the table exists before trying to import data
 */

import { db, pool } from './db';
import { openBankingFields, openBankingResponses } from './db/schema';
import { sql } from 'drizzle-orm';
import { logger } from './server/utils/logger';

async function createOpenBankingTables() {
  try {
    logger.info('[OpenBankingMigration] Checking if openBankingFields table exists');
    
    // Check if table exists
    const tableCheckResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'open_banking_fields'
      );
    `);

    const tableExists = tableCheckResult.rows[0].exists;
    
    if (tableExists) {
      logger.info('[OpenBankingMigration] openBankingFields table already exists, skipping creation');
    } else {
      logger.info('[OpenBankingMigration] Creating openBankingFields table');
      
      // Create the fields table
      await pool.query(`
        CREATE TABLE "open_banking_fields" (
          "id" SERIAL PRIMARY KEY,
          "order" INTEGER NOT NULL,
          "field_key" TEXT NOT NULL,
          "display_name" TEXT NOT NULL,
          "question" TEXT NOT NULL,
          "help_text" TEXT,
          "demo_autofill" TEXT,
          "group" TEXT NOT NULL,
          "field_type" TEXT NOT NULL,
          "required" BOOLEAN NOT NULL DEFAULT true,
          "answer_expectation" TEXT,
          "validation_type" TEXT,
          "validation_rules" TEXT,
          "step_index" INTEGER DEFAULT 0,
          "created_at" TIMESTAMP DEFAULT NOW(),
          "updated_at" TIMESTAMP DEFAULT NOW()
        );
      `);
      
      logger.info('[OpenBankingMigration] Successfully created openBankingFields table');
    }
    
    // Check if responses table exists
    const responsesTableCheckResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'open_banking_responses'
      );
    `);

    const responsesTableExists = responsesTableCheckResult.rows[0].exists;
    
    if (responsesTableExists) {
      logger.info('[OpenBankingMigration] openBankingResponses table already exists, skipping creation');
    } else {
      logger.info('[OpenBankingMigration] Creating openBankingResponses table');
      
      // Create the responses table
      await pool.query(`
        CREATE TABLE "open_banking_responses" (
          "id" SERIAL PRIMARY KEY,
          "task_id" INTEGER NOT NULL REFERENCES "tasks"("id"),
          "field_id" INTEGER NOT NULL REFERENCES "open_banking_fields"("id"),
          "response_value" TEXT,
          "ai_suspicion_level" REAL NOT NULL DEFAULT 0,
          "partial_risk_score" INTEGER NOT NULL DEFAULT 0,
          "reasoning" TEXT,
          "status" TEXT NOT NULL DEFAULT 'empty',
          "version" INTEGER NOT NULL DEFAULT 1,
          "created_at" TIMESTAMP DEFAULT NOW(),
          "updated_at" TIMESTAMP DEFAULT NOW()
        );
      `);
      
      logger.info('[OpenBankingMigration] Successfully created openBankingResponses table');
    }
    
    logger.info('[OpenBankingMigration] Table migration completed successfully');
    
  } catch (error) {
    logger.error('[OpenBankingMigration] Error in table migration', { error });
    throw error;
  }
}

async function run() {
  try {
    await createOpenBankingTables();
    process.exit(0);
  } catch (error) {
    logger.error('[OpenBankingMigration] Failed to run migration', { error });
    process.exit(1);
  }
}

// Run the migration
run();