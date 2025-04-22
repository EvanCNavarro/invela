import OpenAI from "openai";
import { calculateOpenAICost } from "../../client/src/utils/openaiUtils";

// Create OpenAI instance with proper error handling for API key
export const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

// Log OpenAI configuration at startup to verify API key is available
console.log('[OpenAI] Service initialized with API key:', 
  process.env.OPENAI_API_KEY ? 'API key is set' : 'API key is missing');

// Add timeout and retry for OpenAI requests
let isApiKeyValid = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 10;

/**
 * Safely extracts company data needed for AI processing
 * @param companyData The raw company data from database or API
 * @returns Sanitized company data for AI processing
 */
export function extractCompanyData(companyData: Record<string, any>): Record<string, any> {
  if (!companyData) return {};

  // List of fields to exclude from AI processing
  const excludedFields = [
    'category', 'riskScore', 'accreditationStatus', 'onboardingCompanyCompleted',
    'registryDate', 'filesPublic', 'filesPrivate', 'createdAt', 'updatedAt',
    'id', 'logoId', 'created_at', 'updated_at', 'logo_id', 'files_public', 'files_private'
  ];

  // Create a new object with only the allowed fields
  const sanitizedData: Record<string, any> = {};
  
  Object.entries(companyData).forEach(([key, value]) => {
    if (!excludedFields.includes(key) && value !== null && value !== undefined) {
      sanitizedData[key] = value;
    }
  });

  return sanitizedData;
}

/**
 * Generate a prompt for missing company data
 */
export function generateMissingDataPrompt(companyInfo: Record<string, any>, missingFields: string[]): string {
  // Remove excluded fields to avoid sending sensitive data
  const relevantInfo = extractCompanyData(companyInfo);
  
  // Filter out excluded fields from missing fields list too
  const excludedFields = [
    'category', 'riskScore', 'accreditationStatus', 'onboardingCompanyCompleted',
    'registryDate', 'filesPublic', 'filesPrivate', 'createdAt', 'updatedAt',
    'id', 'logoId'
  ];
  
  const relevantMissingFields = missingFields.filter(field => !excludedFields.includes(field));

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

/**
 * Generate a form field suggestion prompt
 */
export function generateFieldSuggestionPrompt(
  companyInfo: Record<string, any>,
  formFields: Array<{ field_key: string; question: string; field_type: string }>,
  existingFormData: Record<string, any> = {}
): string {
  // Extract relevant company data for AI
  const sanitizedCompanyData = extractCompanyData(companyInfo);
  
  return `
I need accurate suggestions for a form related to this company:

Company Information:
${Object.entries(sanitizedCompanyData)
  .filter(([_, value]) => value !== null && value !== undefined && value !== '')
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

Form Questions:
${formFields.map(q => `- ${q.field_key}: ${q.question} (${q.field_type})`).join('\n')}

Existing Form Data:
${Object.entries(existingFormData)
  .filter(([_, value]) => value !== null && value !== undefined && value !== '')
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

Instructions:
1. Provide suggestions ONLY for the questions listed above.
2. If you don't have enough information for a confident answer, DO NOT suggest a value.
3. Only suggest verifiable information about this company. NEVER invent or hallucinate data.
4. DO NOT make up addresses, phone numbers, dates, or any factual information.
5. For each field, provide:
   - The value (exact information from context)
   - A confidence score (0.0-1.0)
   - The source of information (if available)

Format your response as a JSON object like this:
{
  "field_key1": {
    "value": "suggested value",
    "confidence": 0.9,
    "source": "Company information"
  },
  "field_key2": {
    "value": "another suggestion",
    "confidence": 0.7,
    "source": "Company profile"
  }
}

Only include fields where you have at least 70% confidence (0.7).
`;
}

/**
 * Log OpenAI API usage for analytics
 */
export async function logOpenAIUsage(
  db: any,
  searchType: string,
  companyId: number | undefined,
  prompt: string,
  result: any,
  inputTokens: number,
  outputTokens: number,
  model: string,
  success: boolean,
  errorMessage?: string,
  duration?: number
): Promise<void> {
  try {
    if (!db || !db.insert) {
      console.error("Database not available for logging OpenAI usage");
      return;
    }
    
    // Calculate estimated cost
    const estimatedCost = calculateOpenAICost(inputTokens, outputTokens, model);
    
    // Log to analytics table
    await db.insert("openai_search_analytics").values({
      search_type: searchType || 'missing_data',
      company_id: companyId,
      search_prompt: prompt,
      search_results: result,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost: estimatedCost,
      model: model,
      success: success,
      error_message: errorMessage,
      duration: duration || 0,
      search_date: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    });
  } catch (error) {
    console.error('[OpenAI Utils] Failed to log usage analytics:', error);
  }
}

export default {
  openai,
  extractCompanyData,
  generateMissingDataPrompt,
  generateFieldSuggestionPrompt,
  logOpenAIUsage,
  calculateOpenAICost
};