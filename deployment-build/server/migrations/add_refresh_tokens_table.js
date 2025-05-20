"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRefreshTokensTable = addRefreshTokensTable;
const db_1 = require("../../db");
/**
 * Migration that adds the refresh_tokens table
 */
async function addRefreshTokensTable() {
    console.log("[Migration] Starting: Add refresh_tokens table");
    try {
        console.log("[Migration] Checking if pool is available:", !!db_1.pool);
        // Verify database connectivity with a simple query
        const connCheck = await db_1.pool.query('SELECT 1 as connection_test');
        console.log("[Migration] Database connection test:", connCheck.rows);
        // Check if table already exists to avoid errors
        console.log("[Migration] Running table check query");
        const tableCheck = await db_1.pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'refresh_tokens'
    `);
        console.log("[Migration] Table check result:", {
            rowCount: tableCheck.rowCount,
            rows: tableCheck.rows,
            tableExists: tableCheck.rows.length > 0
        });
        if (tableCheck.rows.length === 0) {
            console.log("[Migration] refresh_tokens table doesn't exist, creating it now");
            // Create the refresh_tokens table
            const createResult = await db_1.pool.query(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          token TEXT NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
            console.log("[Migration] Create table result:", createResult);
            console.log("[Migration] Successfully created refresh_tokens table");
        }
        else {
            console.log("[Migration] refresh_tokens table already exists, skipping");
        }
        return { success: true, message: "Migration completed successfully" };
    }
    catch (error) {
        console.error("[Migration] Error creating refresh_tokens table:", error);
        throw error;
    }
    finally {
        console.log("[Migration] Finished: Add refresh_tokens table");
    }
}
// Execute the migration if this file is run directly
if (require.main === module) {
    addRefreshTokensTable()
        .then((result) => {
        console.log("[Migration] Result:", result);
        process.exit(0);
    })
        .catch((error) => {
        console.error("[Migration] Failed:", error);
        process.exit(1);
    });
}
