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
      SET available_tabs = ARRAY['task-center', 'dashboard', 'network', 'file-vault', 'insights', 'claims', 'risk-score', 'builder', 'playground']
      WHERE category = 'Invela';

      UPDATE companies 
      SET available_tabs = ARRAY['task-center', 'dashboard', 'network', 'file-vault', 'insights', 'claims', 'risk-score', 'builder']
      WHERE category = 'Bank';

      -- All other companies (FinTech) will keep the default ['task-center']
    `);

    console.log('Successfully added available_tabs column to companies table');
  } catch (error) {
    console.error('Error adding available_tabs column:', error);
    throw error;
  }
}