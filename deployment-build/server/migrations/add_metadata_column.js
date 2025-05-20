"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addMetadataColumn = addMetadataColumn;
const db_1 = require("../../db");
/**
 * Migration that adds the metadata column to the users table
 */
async function addMetadataColumn() {
    console.log("[Migration] Starting: Add metadata column to users table");
    try {
        console.log("[Migration] Checking if pool is available:", !!db_1.pool);
        // Check if column already exists to avoid errors
        console.log("[Migration] Running column check query");
        const columnCheck = await db_1.pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'metadata'
    `);
        console.log("[Migration] Column check result:", {
            rowCount: columnCheck.rowCount,
            rows: columnCheck.rows,
            columnExists: columnCheck.rows.length > 0
        });
        if (columnCheck.rows.length === 0) {
            console.log("[Migration] Metadata column doesn't exist, creating it now");
            // Add the metadata column using direct pool query instead of SQL template
            const alterResult = await db_1.pool.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb
      `);
            console.log("[Migration] Alter table result:", alterResult);
            console.log("[Migration] Successfully added metadata column to users table");
        }
        else {
            console.log("[Migration] Metadata column already exists, skipping");
        }
        return { success: true, message: "Migration completed successfully" };
    }
    catch (error) {
        console.error("[Migration] Error adding metadata column:", error);
        throw error;
    }
    finally {
        console.log("[Migration] Finished: Add metadata column to users table");
    }
}
// Execute the migration if this file is run directly
if (require.main === module) {
    addMetadataColumn()
        .then((result) => {
        console.log("[Migration] Result:", result);
        process.exit(0);
    })
        .catch((error) => {
        console.error("[Migration] Failed:", error);
        process.exit(1);
    });
}
