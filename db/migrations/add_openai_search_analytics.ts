import { db } from "@db";
import { sql } from "drizzle-orm";

export async function addOpenAISearchAnalytics() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS openai_search_analytics (
        id SERIAL PRIMARY KEY,
        search_type TEXT NOT NULL,
        company_id INTEGER REFERENCES companies(id),
        search_prompt TEXT NOT NULL,
        search_results JSONB NOT NULL,
        input_tokens INTEGER NOT NULL,
        output_tokens INTEGER NOT NULL,
        estimated_cost REAL NOT NULL,
        search_date TIMESTAMP NOT NULL DEFAULT NOW(),
        model TEXT NOT NULL,
        success BOOLEAN NOT NULL,
        error_message TEXT,
        duration INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX idx_openai_search_analytics_company_id ON openai_search_analytics(company_id);
      CREATE INDEX idx_openai_search_analytics_search_date ON openai_search_analytics(search_date);
    `);

    console.log('Successfully created openai_search_analytics table');
  } catch (error) {
    console.error('Error creating openai_search_analytics table:', error);
    throw error;
  }
}
