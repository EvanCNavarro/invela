import { db } from "@db";
import { sql } from "drizzle-orm";

export async function addCompanyNameUnique() {
  try {
    // First, identify and handle existing duplicate company names
    await db.execute(sql`
      WITH duplicate_companies AS (
        SELECT name, MIN(id) as keep_id
        FROM companies
        GROUP BY name
        HAVING COUNT(*) > 1
      )
      UPDATE companies c
      SET name = c.name || ' ' || c.id
      WHERE name IN (SELECT name FROM duplicate_companies)
      AND id NOT IN (SELECT keep_id FROM duplicate_companies);
    `);

    // Add unique constraint
    await db.execute(sql`
      ALTER TABLE companies 
      ADD CONSTRAINT companies_name_unique UNIQUE (name);
    `);

    console.log('Successfully added unique constraint to company name');
  } catch (error) {
    console.error('Error adding unique constraint:', error);
    throw error;
  }
}
