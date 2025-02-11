import { db } from "@db";
import { sql } from "drizzle-orm";

export async function makeFirstnameNullable() {
  try {
    // Alter the first_name column to be nullable
    await db.execute(sql`
      ALTER TABLE users 
      ALTER COLUMN first_name DROP NOT NULL;
    `);

    console.log('Successfully made first_name nullable');
  } catch (error) {
    console.error('Error making first_name nullable:', error);
    throw error;
  }
}
