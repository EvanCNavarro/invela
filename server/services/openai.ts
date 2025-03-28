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
  search_type?: string;
  id?: number;
}

// Helper function to parse PostgreSQL array string
function parsePostgresArray(arrayStr: string): string[] {
  if (!arrayStr) return [];
  // Remove PostgreSQL array braces and split by comma
  return arrayStr
    .replace(/^\{|\}$/g, '')
    .split(',')
    .map(item => item.trim().replace(/^"/, '').replace(/"$/, ''))
    .filter(Boolean);
}

// Helper function to extract data from OpenAI response
function extractDataFromResponse(result: Record<string, any>): Record<string, any> {
  const extracted: Record<string, any> = {};

  for (const [key, value] of Object.entries(result)) {
    if (!value) continue;

    if (typeof value === 'object' && 'data' in value) {
      extracted[key] = value.data;
    } else if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
      try {
        // Try to parse as JSON first
        extracted[key] = JSON.parse(value);
      } catch {
        // If not valid JSON, might be a PostgreSQL array
        extracted[key] = parsePostgresArray(value);
      }
    } else {
      extracted[key] = value;
    }
  }

  return extracted;
}

// Update helper function to handle URL formatting
function formatWebsiteUrl(url: string): string {
  if (!url) return '';

  // Remove any existing protocol and www
  let cleanUrl = url.replace(/^(https?:\/\/)?(www\.)?/, '');

  // Remove any paths or query parameters
  cleanUrl = cleanUrl.split('/')[0];

  // Add https://www. prefix
  return `https://www.${cleanUrl}`;
}

// Helper function to clean OpenAI response data
function cleanOpenAIResponse(result: any): Partial<CleanedCompanyData> {
  const cleanedData: Partial<CleanedCompanyData> = {};

  // First extract the actual data from the OpenAI response format
  const extractedData = extractDataFromResponse(result);

  // Helper function to clean array or string values
  const cleanArrayOrString = (value: any): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.map(item => item.trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
      if (value.startsWith('{') && value.endsWith('}')) {
        return parsePostgresArray(value);
      }
      return value.split(',').map(item => item.trim()).filter(Boolean);
    }
    return [];
  };

  // Process each field from the extracted data
  Object.entries(extractedData).forEach(([key, value]: [string, any]) => {
    if (!value) return;

    switch (key) {
      case 'websiteUrl':
        cleanedData[key] = formatWebsiteUrl(value);
        break;

      case 'keyClientsPartners':
      case 'investors':
      case 'certificationsCompliance':
        cleanedData[key] = cleanArrayOrString(value);
        break;

      case 'numEmployees':
        if (typeof value === 'string') {
          const match = value.match(/\d+/);
          cleanedData[key] = match ? parseInt(match[0], 10) : undefined;
        } else if (typeof value === 'number') {
          cleanedData[key] = value;
        }
        break;

      case 'incorporationYear':
        if (typeof value === 'string' || typeof value === 'number') {
          const year = parseInt(String(value), 10);
          cleanedData[key] = !isNaN(year) && year > 1800 && year <= new Date().getFullYear() ? year : undefined;
        }
        break;

      case 'revenue':
        if (typeof value === 'string') {
          const match = value.match(/\$[\d.]+ [a-z]+ annually/i);
          cleanedData[key] = match ? match[0] : value;
        } else {
          cleanedData[key] = value;
        }
        break;

      case 'fundingStage':
        if (typeof value === 'string') {
          const match = value.match(/Series [A-Z]/i);
          cleanedData[key] = match ? match[0] : value;
        } else {
          cleanedData[key] = value;
        }
        break;

      default:
        if (typeof value === 'string') {
          cleanedData[key as keyof CleanedCompanyData] = value.trim();
        } else {
          cleanedData[key as keyof CleanedCompanyData] = value;
        }
    }
  });

  return cleanedData;
}

async function logSearchAnalytics(analytics: SearchAnalytics) {
  try {
    await db.insert(openaiSearchAnalytics).values({
      search_type: analytics.searchType || 'missing_data',
      company_id: analytics.companyId,
      search_prompt: analytics.searchPrompt,
      search_results: analytics.searchResults,
      input_tokens: analytics.inputTokens,
      output_tokens: analytics.outputTokens,
      estimated_cost: analytics.estimatedCost,
      model: analytics.model,
      success: analytics.success,
      error_message: analytics.errorMessage,
      duration: analytics.duration,
      search_date: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
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
  console.log("[OpenAI Search] 📋 Generating search prompt for fields:", missingFields);

  // Filter out excluded fields from company info
  const relevantInfo = { ...companyInfo };
  const excludedFields = [
    'category', 'riskScore', 'accreditationStatus', 'onboardingCompanyCompleted',
    'registryDate', 'filesPublic', 'filesPrivate', 'createdAt', 'updatedAt',
    'id', 'logoId'
  ];

  console.log("[OpenAI Search] 🔍 Filtering out excluded fields:", excludedFields);
  excludedFields.forEach(field => delete relevantInfo[field as keyof typeof relevantInfo]);

  // Filter out excluded fields from missing fields list
  const relevantMissingFields = missingFields.filter(field => !excludedFields.includes(field));
  console.log("[OpenAI Search] 🎯 Relevant missing fields to search for:", relevantMissingFields);

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
2. For each field, provide the source and data.
3. If unsure about a field, omit it. Do not guess.
4. Return data in this JSON format:
   {
     "fieldName": {
       "source": "Source Name",
       "data": "actual data or array"
     }
   }
`;
}

export async function findMissingCompanyData(
  companyInfo: Partial<CleanedCompanyData>,
  missingFields: string[]
): Promise<Partial<CleanedCompanyData>> {
  console.log("[OpenAI Search] 🚀 Starting search for missing company data");
  console.log("[OpenAI Search] 📊 Company:", companyInfo.name);
  console.log("[OpenAI Search] 🔍 Missing fields:", missingFields);

  const startTime = Date.now();
  const prompt = generateMissingDataPrompt(companyInfo, missingFields);

  try {
    console.log("[OpenAI Search] 📤 Sending request to OpenAI");
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
    console.log("[OpenAI Search] ⏱️ Search completed in", duration, "ms");

    // Parse and clean the OpenAI response
    const rawResult = JSON.parse(response.choices[0].message.content);
    console.log("[OpenAI Search] 📥 Received raw data:", rawResult);

    // Clean and format the data for storage
    const cleanedResult = cleanOpenAIResponse(rawResult);
    console.log("[OpenAI Search] 🧹 Cleaned data for storage:", cleanedResult);

    // Log analytics with raw result
    await logSearchAnalytics({
      searchType: 'missing_data',
      companyId: companyInfo.id,
      searchPrompt: prompt,
      searchResults: rawResult, // Store raw result in analytics for reference
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
      searchDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Parse numeric fields
    if (cleanedResult.incorporationYear) {
      console.log("[OpenAI Search] 📅 Parsing incorporation year:", cleanedResult.incorporationYear);
      cleanedResult.incorporationYear = parseInt(String(cleanedResult.incorporationYear));
    }
    if (cleanedResult.numEmployees) {
      console.log("[OpenAI Search] 👥 Parsing employee count:", cleanedResult.numEmployees);
      cleanedResult.numEmployees = parseInt(String(cleanedResult.numEmployees));
    }

    return cleanedResult;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("[OpenAI Search] ❌ Error during search:", error);
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
      searchDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
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

      const rawResult = JSON.parse(response.choices[0].message.content);
      const cleanedData = cleanOpenAIResponse(rawResult);

      await logSearchAnalytics({
        searchType: 'data_cleaning',
        companyId: rawData.id,
        searchPrompt: prompt,
        searchResults: rawResult,
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
        searchDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      if (cleanedData.incorporationYear) {
        cleanedData.incorporationYear = parseInt(String(cleanedData.incorporationYear));
      }
      if (cleanedData.numEmployees) {
        cleanedData.numEmployees = parseInt(String(cleanedData.numEmployees));
      }

      return cleanedData as CleanedCompanyData;
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

interface CardResponseAnalysis {
  suspicionLevel: number;  // 0-100 scale
  riskScore: number;      // Based on partial_risk_score_max
  reasoning: string;
}

export async function analyzeCardResponse(
  response: string,
  question: string,
  maxRiskScore: number,
  exampleResponse?: string
): Promise<CardResponseAnalysis> {
  const startTime = Date.now();

  console.log('[OpenAI Service] Starting response analysis:', {
    questionLength: question.length,
    responseLength: response.length,
    maxRiskScore,
    hasExample: !!exampleResponse,
    startTime: new Date().toISOString()
  });

  const prompt = `
As a security and compliance expert, analyze this response to a security practice question.
Compare it to best practices and the example response if provided.

Question: ${question}
User Response: ${response}
${exampleResponse ? `Example of Good Response: ${exampleResponse}` : ''}

Analyze for:
1. Completeness of security measures described
2. Alignment with industry best practices
3. Potential red flags or concerning omissions
4. Comparison with the example response (if provided)

Respond with a JSON object containing:
{
  "suspicionLevel": number (0-100, higher means more concerning),
  "reasoning": string (explanation of the analysis)
}
`;

  try {
    console.log('[OpenAI Service] Sending request to GPT-4:', {
      timestamp: new Date().toISOString()
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert in security compliance and risk assessment.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const duration = Date.now() - startTime;

    console.log('[OpenAI Service] Received raw response:', {
      content: response.choices[0].message.content,
      duration,
      timestamp: new Date().toISOString()
    });

    const result = JSON.parse(response.choices[0].message.content);

    // Validate and normalize the suspicion level
    const suspicionLevel = Math.min(100, Math.max(0, result.suspicionLevel));

    // Calculate risk score as percentage of max score, rounded up
    const riskScore = Math.ceil((suspicionLevel / 100) * maxRiskScore);

    console.log('[OpenAI Service] Calculated analysis result:', {
      suspicionLevel,
      riskScore,
      maxRiskScore,
      reasoningLength: result.reasoning?.length,
      duration,
      timestamp: new Date().toISOString()
    });

    // Log analytics
    await logSearchAnalytics({
      searchType: 'card_response_analysis',
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
      searchDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return {
      suspicionLevel,
      riskScore,
      reasoning: result.reasoning,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[OpenAI Service] Error during analysis:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      duration,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
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
  searchDate: Date;
  createdAt: Date;
  updatedAt: Date;
}