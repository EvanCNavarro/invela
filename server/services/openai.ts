import OpenAI from "openai";
import { companies } from "@db/schema";
import { db } from "@db";
import { openaiSearchAnalytics } from "@db/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface CleanedCompanyData {
  name: string;
  description?: string;
  stockTicker?: string;
  websiteUrl?: string;
  legalStructure?: string;
  marketPosition?: string;
  hqAddress?: string;
  productsServices?: string;
  incorporationYear?: number;
  foundersAndLeadership?: string;
  numEmployees?: number;
  revenue?: string;
  keyClientsPartners?: string[];
  investors?: string[];
  fundingStage?: string;
  exitStrategyHistory?: string;
  certificationsCompliance?: string[];
}

interface SearchAnalytics {
  searchType: string;
  companyId?: number;
  searchPrompt: string;
  searchResults: Record<string, any>;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  model: string;
  success: boolean;
  errorMessage?: string;
  duration: number;
}

async function logSearchAnalytics(analytics: SearchAnalytics) {
  try {
    await db.insert(openaiSearchAnalytics).values({
      searchType: analytics.searchType,
      companyId: analytics.companyId,
      searchPrompt: analytics.searchPrompt,
      searchResults: analytics.searchResults,
      inputTokens: analytics.inputTokens,
      outputTokens: analytics.outputTokens,
      estimatedCost: analytics.estimatedCost,
      model: analytics.model,
      success: analytics.success,
      errorMessage: analytics.errorMessage,
      duration: analytics.duration,
      searchDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('[OpenAI Analytics] Failed to log search analytics:', error);
  }
}

function calculateOpenAICost(inputTokens: number, outputTokens: number, model: string): number {
  const PRICING = {
    'gpt-4o': {
      input: 0.01,
      output: 0.03,
    }
  };

  const modelPricing = PRICING[model as keyof typeof PRICING];
  if (!modelPricing) return 0;

  return (
    (inputTokens / 1000) * modelPricing.input +
    (outputTokens / 1000) * modelPricing.output
  );
}

function generateMissingDataPrompt(companyInfo: Partial<CleanedCompanyData>, missingFields: string[]): string {
  // Filter out excluded fields from company info
  const relevantInfo = { ...companyInfo };
  delete relevantInfo.id;
  delete relevantInfo.category;
  delete relevantInfo.riskScore;
  delete relevantInfo.accreditationStatus;
  delete relevantInfo.onboardingCompanyCompleted;
  delete relevantInfo.registryDate;
  delete relevantInfo.filesPublic;
  delete relevantInfo.filesPrivate;
  delete relevantInfo.createdAt;
  delete relevantInfo.updatedAt;
  delete relevantInfo.logoId;

  // Filter out excluded fields from missing fields list
  const relevantMissingFields = missingFields.filter(field => ![
    'category', 'riskScore', 'accreditationStatus', 'onboardingCompanyCompleted',
    'registryDate', 'filesPublic', 'filesPrivate', 'createdAt', 'updatedAt',
    'id', 'logoId'
  ].includes(field));

  return `
As a financial data expert, use the following known details to find accurate company information. Focus on the missing fields and prioritize data from the sources listed below:

**Company Details:**
${JSON.stringify(relevantInfo, null, 2)}

**Missing Fields to Focus On:**
${relevantMissingFields.map(field => `- ${field}`).join('\n')}

**Sources (Prioritized Order):**
1. Wikipedia
2. Official Website
3. LinkedIn
4. Crunchbase
5. ZoomInfo
6. Dun & Bradstreet

**Instructions:**
1. Find and return the missing fields only, matching the CleanedCompanyData interface.
2. For each field, provide the source.
3. If unsure about a field, omit it. Do not guess.
4. Return data as a JSON object.
`;
}

export async function findMissingCompanyData(
  companyInfo: Partial<CleanedCompanyData>,
  missingFields: string[]
): Promise<Partial<CleanedCompanyData>> {
  const startTime = Date.now();
  const prompt = generateMissingDataPrompt(companyInfo, missingFields);

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

    const duration = Date.now() - startTime;
    const result = JSON.parse(response.choices[0].message.content);

    await logSearchAnalytics({
      searchType: 'missing_data',
      companyId: companyInfo.id,
      searchPrompt: prompt,
      searchResults: result,
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
      estimatedCost: calculateOpenAICost(
        response.usage?.prompt_tokens || 0,
        response.usage?.completion_tokens || 0,
        'gpt-4o'
      ),
      model: 'gpt-4o',
      success: true,
      duration,
    });

    if (result.incorporationYear) {
      result.incorporationYear = parseInt(String(result.incorporationYear));
    }
    if (result.numEmployees) {
      result.numEmployees = parseInt(String(result.numEmployees));
    }

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await logSearchAnalytics({
      searchType: 'missing_data',
      companyId: companyInfo.id,
      searchPrompt: prompt,
      searchResults: {},
      inputTokens: 0,
      outputTokens: 0,
      estimatedCost: 0,
      model: 'gpt-4o',
      success: false,
      errorMessage,
      duration,
    });

    throw error;
  }
}

export async function validateAndCleanCompanyData(rawData: Partial<typeof companies.$inferInsert>): Promise<CleanedCompanyData> {
  const startTime = Date.now();
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
      const duration = Date.now() - startTime;

      if (!response.choices[0].message.content) {
        throw new Error("Empty response from OpenAI");
      }

      const cleanedData = JSON.parse(response.choices[0].message.content) as CleanedCompanyData;

      await logSearchAnalytics({
        searchType: 'data_cleaning',
        companyId: rawData.id,
        searchPrompt: prompt,
        searchResults: cleanedData,
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        estimatedCost: calculateOpenAICost(
          response.usage?.prompt_tokens || 0,
          response.usage?.completion_tokens || 0,
          'gpt-4o'
        ),
        model: 'gpt-4o',
        success: true,
        duration,
      });

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

      if (error instanceof Error && error.message.includes('429')) {
        console.log("Rate limit hit, returning original data");
        return rawData as CleanedCompanyData;
      }

      retries--;
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, 4 - retries) * 1000));
      }
    }
  }

  console.error("All OpenAI validation attempts failed:", lastError);
  return rawData as CleanedCompanyData;
}