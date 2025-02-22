import { db } from "@db";
import { sql } from "drizzle-orm";
import { companies } from "@db/schema";

export async function addCompanyAvailableTabs() {
  try {
    // Add available_tabs column
    await db.execute(sql`
      ALTER TABLE companies 
      ADD COLUMN available_tabs TEXT[] NOT NULL DEFAULT ARRAY['task-center'];

      -- Update existing companies based on category
      UPDATE companies 
      SET available_tabs = ARRAY['task-center', 'dashboard', 'network', 'file-vault', 'insights', 'builder', 'playground']
      WHERE category IN ('Invela', 'Bank');
    `);

    console.log('Successfully added available_tabs column to companies table');
  } catch (error) {
    console.error('Error adding available_tabs column:', error);
    throw error;
  }
}
