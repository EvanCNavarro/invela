import { db } from "@db";
import { sql } from "drizzle-orm";
import { tasks, cardFields, cardResponses } from "@db/schema";
import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";

// Read and parse the CSV file
const CSV_PATH = "./attached_assets/card_questions_v1.csv";

export async function addCardFormTables() {
  try {
    // Create tables
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS card_fields (
        id SERIAL PRIMARY KEY,
        field_key TEXT NOT NULL UNIQUE,
        wizard_section TEXT NOT NULL,
        question_label TEXT NOT NULL,
        question TEXT NOT NULL,
        example_response TEXT,
        ai_search_instructions TEXT,
        partial_risk_score_max INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS card_responses (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES tasks(id),
        field_id INTEGER NOT NULL REFERENCES card_fields(id),
        response_value TEXT,
        ai_suspicion_level REAL NOT NULL DEFAULT 0,
        partial_risk_score INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'empty',
        version INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      DROP INDEX IF EXISTS idx_card_responses_task_id;
      DROP INDEX IF EXISTS idx_card_responses_field_id;

      CREATE INDEX idx_card_responses_task_id ON card_responses(task_id);
      CREATE INDEX idx_card_responses_field_id ON card_responses(field_id);
    `);

    // Read CSV and insert questions
    const fileContent = readFileSync(CSV_PATH, { encoding: 'utf-8' });
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    });

    for (const [index, record] of records.entries()) {
      const fieldKey = `${record['Wizard Section Label'].toLowerCase().replace(/\s+/g, '_')}_${record['Question Label'].toLowerCase().replace(/\s+/g, '_')}`;
      
      await db.execute(sql`
        INSERT INTO card_fields (
          field_key,
          wizard_section,
          question_label,
          question,
          example_response,
          ai_search_instructions,
          partial_risk_score_max
        )
        VALUES (
          ${fieldKey},
          ${record['Wizard Section Label']},
          ${record['Question Label']},
          ${record['Question']},
          ${record['Example Response']},
          ${record['AI Search Instructions']},
          ${parseInt(record['Partial Risk Score Max'])}
        )
        ON CONFLICT (field_key) DO UPDATE
        SET question = ${record['Question']},
            example_response = ${record['Example Response']},
            ai_search_instructions = ${record['AI Search Instructions']},
            partial_risk_score_max = ${parseInt(record['Partial Risk Score Max'])};
      `);
    }

    console.log('Successfully created CARD form tables and inserted questions');
  } catch (error) {
    console.error('Error creating CARD form tables:', error);
    throw error;
  }
}
