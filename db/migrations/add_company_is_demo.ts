import { db } from "@db";
import { sql } from "drizzle-orm";

export async function addCompanyIsDemo() {
  try {
    // Add is_demo column (this might already exist from the manual SQL operation we did)
    await db.execute(sql`
      DO $$
      BEGIN
        -- Check if is_demo column exists
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'companies' AND column_name = 'is_demo'
        ) THEN
          -- Add is_demo column with default FALSE
          ALTER TABLE companies ADD COLUMN is_demo BOOLEAN DEFAULT FALSE;
        END IF;
      END$$;
    `);

    // Set is_demo to NULL for Invela and Bank companies
    await db.execute(sql`
      UPDATE companies 
      SET is_demo = NULL 
      WHERE category IN ('Invela', 'Bank');
    `);

    // Set is_demo to FALSE for all FinTech companies (default)
    await db.execute(sql`
      UPDATE companies 
      SET is_demo = FALSE 
      WHERE category = 'FinTech';
    `);

    console.log('Successfully added is_demo column to companies table');
  } catch (error) {
    console.error('Error adding is_demo column:', error);
    throw error;
  }
}