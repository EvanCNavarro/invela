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

      Validation rules and requirements:
      1. Website URL:
         - Must be the main company domain (e.g., tesla.com not ir.tesla.com)
         - Must include https:// prefix
         - Verify it's an active company website

      2. Stock Ticker:
         - Must be actual trading symbol
         - Include exchange if known (e.g., "TSLA" for Tesla)

      3. HQ Address:
         - Should be current global headquarters
         - Use standardized format: City, State/Region, Country

      4. Incorporation Year:
         - Must be historically accurate
         - Cannot be future date
         - For well-known companies, verify against public records

      5. Products/Services:
         - Provide comprehensive but concise list
         - Focus on main revenue streams
         - Use industry-standard terminology

      6. Legal Structure:
         - Must be one of: "Corporation", "LLC", "LLP", "Partnership"
         - Verify against official filings if possible

      7. Description:
         - Should be clear and informative
         - Include industry, main business activities
         - Maximum 2-3 sentences

      8. Employee Count:
         - Use most recent reliable data
         - Round to nearest significant figure

      Respond with a JSON object matching the CleanedCompanyData interface.
      For any field where the data cannot be verified or is uncertain, return null instead of guessing.
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