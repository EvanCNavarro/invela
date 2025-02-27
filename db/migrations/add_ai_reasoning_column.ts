import { db } from "@db";
import { sql } from "drizzle-orm";

export async function addAiReasoningColumn() {
  try {
    await db.execute(sql`
      ALTER TABLE card_responses
      ADD COLUMN IF NOT EXISTS ai_reasoning TEXT;
    `);

    console.log('Successfully added ai_reasoning column to card_responses table');
  } catch (error) {
    console.error('Error adding ai_reasoning column:', error);
    throw error;
  }
}
