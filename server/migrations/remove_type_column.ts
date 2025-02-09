import { db } from "@db";
import { sql } from "drizzle-orm";

export async function removeTypeColumn() {
  try {
    // First update existing records to use category as type
    await db.execute(sql`
      UPDATE companies 
      SET type = category 
      WHERE type IS NULL;
    `);

    // Remove the type column
    await db.execute(sql`
      ALTER TABLE companies 
      DROP COLUMN IF EXISTS type;
    `);

    console.log('Successfully removed type column from companies table');
  } catch (error) {
    console.error('Error removing type column:', error);
    throw error;
  }
}
