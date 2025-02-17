import OpenAI from "openai";
import { companies } from "@db/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
  marketPosition?: string;
  foundersAndLeadership?: string;
  revenue?: string;
  keyClientsPartners?: string[];
  investors?: string[];
  fundingStage?: string;
  exitStrategyHistory?: string;
  certificationsCompliance?: string[];
  riskScore?: number;
  accreditationStatus?: string;
}

/**
 * Generate a specialized prompt for finding missing company data
 */
function generateMissingDataPrompt(companyInfo: Partial<CleanedCompanyData>, missingFields: string[]): string {
  return `
    As a financial data expert, find accurate information about the company with these known details:
    ${JSON.stringify(companyInfo, null, 2)}

    Focus specifically on finding these missing fields:
    ${missingFields.join(', ')}

    Prioritize data from these sources in order:
    1. Wikipedia
    2. Company's official website
    3. LinkedIn
    4. Crunchbase
    5. ZoomInfo
    6. Dun & Bradstreet

    For each field, cite the source of the information.
    Return only the missing fields in a JSON object matching the CleanedCompanyData interface.
    If you're not confident about any piece of information, omit it rather than guessing.
  `;
}

export async function findMissingCompanyData(
  companyInfo: Partial<CleanedCompanyData>, 
  missingFields: string[]
): Promise<Partial<CleanedCompanyData>> {
  try {
    const prompt = generateMissingDataPrompt(companyInfo, missingFields);

    let retries = 3;
    let lastError = null;

    while (retries > 0) {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are a financial data expert specializing in company information research.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.5,
        });

        if (!response.choices[0].message.content) {
          throw new Error("Empty response from OpenAI");
        }

        const newData = JSON.parse(response.choices[0].message.content) as Partial<CleanedCompanyData>;

        // Additional validation for numeric fields
        if (newData.incorporationYear) {
          newData.incorporationYear = parseInt(String(newData.incorporationYear));
        }
        if (newData.numEmployees) {
          newData.numEmployees = parseInt(String(newData.numEmployees));
        }
        if (newData.riskScore) {
          newData.riskScore = parseInt(String(newData.riskScore));
        }

        return newData;
      } catch (error) {
        lastError = error;
        console.error(`OpenAI API attempt ${4 - retries} failed:`, error);

        if (error.status === 429) {
          console.log("Rate limit hit, waiting before retry");
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, 4 - retries) * 1000));
        }

        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    throw lastError || new Error('Failed to get response from OpenAI');
  } catch (error) {
    console.error("OpenAI data search error:", error);
    throw error;
  }
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

    // Add retries for OpenAI API calls
    let retries = 3;
    let lastError = null;

    while (retries > 0) {
      try {
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

        if (!response.choices[0].message.content) {
          throw new Error("Empty response from OpenAI");
        }

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
        lastError = error;
        console.error(`OpenAI API attempt ${4 - retries} failed:`, error);

        if (error.status === 429) {
          console.log("Rate limit hit, returning original data");
          return rawData as CleanedCompanyData;
        }

        retries--;
        if (retries > 0) {
          // Wait before retrying, with exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, 4 - retries) * 1000));
        }
      }
    }

    // If all retries failed, log the error and return the original data
    console.error("All OpenAI validation attempts failed:", lastError);
    return rawData as CleanedCompanyData;
  } catch (error) {
    console.error("OpenAI validation error:", error);
    return rawData as CleanedCompanyData;
  }
}