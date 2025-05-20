"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeFirstnameNullable = makeFirstnameNullable;
const _db_1 = require("@db");
const drizzle_orm_1 = require("drizzle-orm");
async function makeFirstnameNullable() {
    try {
        // Alter the first_name column to be nullable
        await _db_1.db.execute((0, drizzle_orm_1.sql) `
      ALTER TABLE users 
      ALTER COLUMN first_name DROP NOT NULL;
    `);
        console.log('Successfully made first_name nullable');
    }
    catch (error) {
        console.error('Error making first_name nullable:', error);
        throw error;
    }
}
