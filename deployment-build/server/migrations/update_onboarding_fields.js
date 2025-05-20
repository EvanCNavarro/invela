"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOnboardingFields = updateOnboardingFields;
const _db_1 = require("@db");
const drizzle_orm_1 = require("drizzle-orm");
async function updateOnboardingFields() {
    try {
        // First rename the user onboarding column
        await _db_1.db.execute((0, drizzle_orm_1.sql) `
      ALTER TABLE users 
      RENAME COLUMN onboarding_completed TO onboarding_user_completed;
    `);
        // Add company onboarding column
        await _db_1.db.execute((0, drizzle_orm_1.sql) `
      ALTER TABLE companies 
      ADD COLUMN IF NOT EXISTS onboarding_company_completed BOOLEAN NOT NULL DEFAULT true;
    `);
        // Set TestCompany's onboarding_company_completed to false
        await _db_1.db.execute((0, drizzle_orm_1.sql) `
      UPDATE companies 
      SET onboarding_company_completed = false 
      WHERE LOWER(name) = LOWER('TestCompany');
    `);
        console.log('Successfully updated onboarding fields');
    }
    catch (error) {
        console.error('Error updating onboarding fields:', error);
        throw error;
    }
}
