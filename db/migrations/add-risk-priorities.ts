/**
 * Migration: Add risk_priorities column to companies table
 * 
 * This migration adds a JSONB column to store risk priority configuration
 */

import { db } from "../index";
import { sql } from "drizzle-orm";

async function run() {
  try {
    console.log("Running migration: add-risk-priorities");

    // Add the risk_priorities column to the companies table as a JSONB column
    await db.execute(sql`
      ALTER TABLE companies
      ADD COLUMN IF NOT EXISTS risk_priorities JSONB DEFAULT NULL;
    `);

    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

run().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
