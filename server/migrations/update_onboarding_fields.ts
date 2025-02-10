import { db } from "@db";
import { sql } from "drizzle-orm";

export async function updateOnboardingFields() {
  try {
    // First rename the user onboarding column
    await db.execute(sql`
      ALTER TABLE users 
      RENAME COLUMN onboarding_completed TO onboarding_user_completed;
    `);

    // Add company onboarding column
    await db.execute(sql`
      ALTER TABLE companies 
      ADD COLUMN IF NOT EXISTS onboarding_company_completed BOOLEAN NOT NULL DEFAULT true;
    `);

    // Set TestCompany's onboarding_company_completed to false
    await db.execute(sql`
      UPDATE companies 
      SET onboarding_company_completed = false 
      WHERE LOWER(name) = LOWER('TestCompany');
    `);

    console.log('Successfully updated onboarding fields');
  } catch (error) {
    console.error('Error updating onboarding fields:', error);
    throw error;
  }
}
