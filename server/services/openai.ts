import OpenAI from "openai";
import { companies } from "@db/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface CleanedCompanyData {
  name: string;
  stockTicker?: string;
  websiteUrl?: string;
  legalStructure?: string;
  hqAddress?: string;
  productsServices?: string;
  incorporationYear?: number;
  numEmployees?: number;
  category?: string;
  description?: string;
}

export async function validateAndCleanCompanyData(rawData: Partial<typeof companies.$inferInsert>): Promise<CleanedCompanyData> {
  try {
    const prompt = `
      As a financial data expert, analyze and clean the following company information. 
      Ensure data accuracy, fill in any missing fields if you can confidently derive them from other data, and format consistently.
      If you're not confident about a piece of information, leave it as null rather than guessing.
      
      Raw company data:
      ${JSON.stringify(rawData, null, 2)}
      
      Provide a cleaned version with:
      1. Consistent formatting (e.g., website URLs should be lowercase and include https://)
      2. Verified stock ticker if applicable
      3. Properly formatted legal structure (Corporation, LLC, etc.)
      4. Cleaned up products/services description
      5. Verified headquarters location
      6. Accurate employee count (use the most recent data)
      7. Concise but informative company description
      
      Respond with a JSON object matching the CleanedCompanyData interface.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a financial data expert helping to clean and validate company information.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const cleanedData = JSON.parse(response.choices[0].message.content) as CleanedCompanyData;

    // Additional validation to ensure numbers are properly typed
    if (cleanedData.incorporationYear) {
      cleanedData.incorporationYear = parseInt(String(cleanedData.incorporationYear));
    }
    if (cleanedData.numEmployees) {
      cleanedData.numEmployees = parseInt(String(cleanedData.numEmployees));
    }

    return cleanedData;
  } catch (error) {
    console.error("OpenAI validation error:", error);
    return rawData as CleanedCompanyData;
  }
}
