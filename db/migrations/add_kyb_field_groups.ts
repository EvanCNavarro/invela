import { db } from "@db";
import { sql } from "drizzle-orm";
import { kybFields } from "@db/schema";

export async function addKybFieldGroups() {
  try {
    // Add group column
    await db.execute(sql`
      ALTER TABLE kyb_fields
      ADD COLUMN IF NOT EXISTS "group" TEXT NOT NULL DEFAULT 'Entity Identification';
    `);

    // Update existing fields with their groups
    await db.execute(sql`
      UPDATE kyb_fields
      SET "group" = CASE
        WHEN "order" BETWEEN 1 AND 6 THEN 'Entity Identification'
        WHEN "order" BETWEEN 7 AND 9 THEN 'Ownership & Management'
        WHEN "order" BETWEEN 10 AND 12 THEN 'Official Documentation'
        WHEN "order" BETWEEN 13 AND 15 THEN 'Financial & Operational'
        WHEN "order" BETWEEN 16 AND 17 THEN 'Compliance & Risk'
        ELSE 'Entity Identification'
      END;
    `);

    console.log('Successfully added and populated group column for KYB fields');
  } catch (error) {
    console.error('Error adding group column to KYB fields:', error);
    throw error;
  }
}
