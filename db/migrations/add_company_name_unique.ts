import { db } from "@db";
import { sql } from "drizzle-orm";

export async function addCompanyNameUnique() {
  try {
    // First identify any existing companies with duplicate names (case insensitive)
    const duplicates = await db.execute(sql`
      SELECT LOWER(name) as lower_name, COUNT(*) 
      FROM companies 
      GROUP BY LOWER(name) 
      HAVING COUNT(*) > 1;
    `);

    // If we found duplicates, append ID to their names to make them unique
    if (duplicates.rowCount > 0) {
      // Update all but the first instance of each duplicate name
      await db.execute(sql`
        WITH ranked_companies AS (
          SELECT 
            id,
            name,
            ROW_NUMBER() OVER (PARTITION BY LOWER(name) ORDER BY id) as rn
          FROM companies
        )
        UPDATE companies c
        SET name = CONCAT(c.name, '_', c.id)
        FROM ranked_companies rc
        WHERE c.id = rc.id AND rc.rn > 1;
      `);
    }

    // Now that duplicates are resolved, add the case-insensitive unique constraint
    await db.execute(sql`
      DROP INDEX IF EXISTS idx_companies_name_lower;
      CREATE UNIQUE INDEX idx_companies_name_lower ON companies (LOWER(name));
    `);

    console.log('Successfully added unique constraint to company name');
  } catch (error) {
    console.error('Error adding unique constraint:', error);
    throw error;
  }
}