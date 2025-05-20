"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeTypeColumn = removeTypeColumn;
const _db_1 = require("@db");
const drizzle_orm_1 = require("drizzle-orm");
async function removeTypeColumn() {
    try {
        // First update existing records to use category as type
        await _db_1.db.execute((0, drizzle_orm_1.sql) `
      UPDATE companies 
      SET type = category 
      WHERE type IS NULL;
    `);
        // Remove the type column
        await _db_1.db.execute((0, drizzle_orm_1.sql) `
      ALTER TABLE companies 
      DROP COLUMN IF EXISTS type;
    `);
        console.log('Successfully removed type column from companies table');
    }
    catch (error) {
        console.error('Error removing type column:', error);
        throw error;
    }
}
