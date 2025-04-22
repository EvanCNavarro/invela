import { companies } from "@db/schema";
import { db } from "@db";
import { openaiSearchAnalytics } from "@db/schema";
import { openai, extractCompanyData, generateMissingDataPrompt, generateFieldSuggestionPrompt, logOpenAIUsage } from "../utils/openaiUtils";

// Export the Answer interface to match our aggregation expectations
export interface Answer {
  field_key: string;
  answer: string;
  source_document: string;
  confidence: number;
}

export interface DocumentAnswer {
  field_key: string;
  answer: string;
  source_document: string;
  confidence: number;
}

export interface FieldSuggestion {
  value: string;
  confidence: number;
  source?: string;
}

export interface FormFieldSuggestions {
  [key: string]: FieldSuggestion;
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

/**
 * Get AI-powered suggestions for form fields
 * This function focuses on the current form step only for better performance
 * and adds strict precautions against hallucination
 */
export async function getFormFieldSuggestions(
  companyInfo: Record<string, any>,
  formFields: Array<{ field_key: string; question: string; field_type: string }>,
  existingFormData: Record<string, any> = {}
): Promise<FormFieldSuggestions> {
  const startTime = Date.now();
  
  console.log('[OpenAI Service] Generating form field suggestions:', {
    companyName: companyInfo.name,
    fieldsCount: formFields.length,
    existingDataCount: Object.keys(existingFormData).length,
    timestamp: new Date().toISOString()
  });
  
  try {
    // Generate a prompt specifically for form field suggestions using the utility function
    const prompt = generateFieldSuggestionPrompt(companyInfo, formFields, existingFormData);

    // Call OpenAI with low temperature setting to reduce randomness
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system", 
          content: "You are a helpful assistant specializing in business data verification. You prioritize accuracy and never hallucinate data when uncertain."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1 // Low temperature for more deterministic, factual responses
    });

    const duration = Date.now() - startTime;
    
    if (!response.choices[0].message.content) {
      throw new Error("Empty response from OpenAI");
    }
    
    // Parse the response
    const suggestions = JSON.parse(response.choices[0].message.content) as FormFieldSuggestions;
    
    // Log analytics
    await logSearchAnalytics({
      searchType: 'form_suggestions',
      companyId: companyInfo.id,
      searchPrompt: prompt,
      searchResults: suggestions,
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
      estimatedCost: calculateOpenAICost(
        response.usage?.prompt_tokens || 0,
        response.usage?.completion_tokens || 0,
        'gpt-3.5-turbo'
      ),
      model: 'gpt-3.5-turbo',
      success: true,
      duration,
      searchDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    console.log('[OpenAI Service] Field suggestions generated successfully:', {
      duration,
      suggestionCount: Object.keys(suggestions).length,
      fields: Object.keys(suggestions),
      timestamp: new Date().toISOString()
    });
    
    return suggestions;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('[OpenAI Service] Error generating field suggestions:', {
      error: errorMessage,
      duration,
      timestamp: new Date().toISOString()
    });
    
    // Log error analytics
    await logSearchAnalytics({
      searchType: 'form_suggestions',
      companyId: companyInfo.id,
      searchPrompt: '',
      searchResults: {},
      inputTokens: 0,
      outputTokens: 0,
      estimatedCost: 0,
      model: 'gpt-3.5-turbo',
      success: false,
      errorMessage,
      duration,
      searchDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    // Return empty suggestions on error
    return {};
  }
}

// OpenAI API client is now imported from utils/openaiUtils.ts

// Document classification specific types
export enum DocumentCategory {
  SOC2_AUDIT = 'soc2_audit',
  ISO27001_CERT = 'iso27001_cert',
  PENTEST_REPORT = 'pentest_report',
  BUSINESS_CONTINUITY = 'business_continuity',
  OTHER = 'other'
}

export interface DocumentClassification {
  category: DocumentCategory;
  confidence: number;
  reasoning: string;
  suggestedName?: string;
}

const CLASSIFICATION_PROMPT = `As a security compliance expert, analyze this document and classify it into one of these categories:
- SOC 2 Audit Report
- ISO 27001 Certification  
- Penetration Test Report
- Business Continuity Plan
- Other Documents

Respond with a JSON object containing:
{
  "category": string (one of the above categories),
  "confidence": number (0-1),
  "reasoning": string (brief explanation),
  "suggestedName": string (optional)
}

Consider:
- Document structure and formatting
- Key terminology and phrases
- Standard compliance language
- Certification markers and dates`;

export const CONFIDENCE_THRESHOLDS = {
  AUTO_CLASSIFY: 0.85, // Automatically classify if confidence is above this
  SUGGEST: 0.60, // Suggest classification if confidence is above this
  MINIMUM: 0.30 // Show as "Other Documents" if below this
};

export async function classifyDocument(content: string): Promise<DocumentClassification> {
  const startTime = Date.now();

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Changed from gpt-4o to handle larger documents
      messages: [
        { role: "system", content: CLASSIFICATION_PROMPT },
        { role: "user", content }
      ],
      response_format: { type: "json_object" }
    });

    const duration = Date.now() - startTime;

    if (!response.choices[0].message.content) {
      throw new Error("Empty response from OpenAI");
    }

    const result = JSON.parse(response.choices[0].message.content);

    // Log analytics
    await logSearchAnalytics({
      searchType: 'document_classification',
      searchPrompt: CLASSIFICATION_PROMPT,
      searchResults: result,
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
      estimatedCost: calculateOpenAICost(
        response.usage?.prompt_tokens || 0,
        response.usage?.completion_tokens || 0,
        'gpt-3.5-turbo'
      ),
      model: 'gpt-3.5-turbo',
      success: true,
      duration,
      searchDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Apply confidence thresholds
    let category = result.category;
    const confidence = result.confidence;

    if (confidence < CONFIDENCE_THRESHOLDS.MINIMUM) {
      console.log('[OpenAI Service] Classification confidence too low, marking as OTHER:', {
        originalCategory: category,
        confidence,
        threshold: CONFIDENCE_THRESHOLDS.MINIMUM
      });
      category = DocumentCategory.OTHER;
    }

    if (confidence < CONFIDENCE_THRESHOLDS.AUTO_CLASSIFY) {
      console.log('[OpenAI Service] Classification needs review:', {
        category,
        confidence,
        threshold: CONFIDENCE_THRESHOLDS.AUTO_CLASSIFY
      });
    }

    return {
      category: mapToDocumentCategory(category),
      confidence: confidence,
      reasoning: result.reasoning,
      suggestedName: result.suggestedName
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[OpenAI Service] Document classification error:', error);

    await logSearchAnalytics({
      searchType: 'document_classification',
      searchPrompt: CLASSIFICATION_PROMPT,
      searchResults: {},
      inputTokens: 0,
      outputTokens: 0,
      estimatedCost: 0,
      model: 'gpt-3.5-turbo',
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      duration,
      searchDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    throw error;
  }
}

// Helper function to map classification response to DocumentCategory enum
function mapToDocumentCategory(category: string): DocumentCategory {
  const categoryMap: Record<string, DocumentCategory> = {
    'SOC 2 Audit Report': DocumentCategory.SOC2_AUDIT,
    'ISO 27001 Certification': DocumentCategory.ISO27001_CERT,
    'Penetration Test Report': DocumentCategory.PENTEST_REPORT,
    'Business Continuity Plan': DocumentCategory.BUSINESS_CONTINUITY,
    'Other Documents': DocumentCategory.OTHER
  };

  return categoryMap[category] || DocumentCategory.OTHER;
}

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
    },
    'gpt-3.5-turbo': {
      input: 0.001,
      output: 0.002,
    }
  };

  const modelPricing = PRICING[model as keyof typeof PRICING];
  if (!modelPricing) return 0;

  return (
    (inputTokens / 1000) * modelPricing.input +
    (outputTokens / 1000) * modelPricing.output
  );
}

// Local generateMissingDataPrompt function has been removed.
// Now using the imported function from utils/openaiUtils.ts

export async function findMissingCompanyData(
  companyInfo: Partial<CleanedCompanyData>,
  missingFields: string[]
): Promise<Partial<CleanedCompanyData>> {
  console.log("[OpenAI Search] 🚀 Starting search for missing company data");
  console.log("[OpenAI Search] 📊 Company:", companyInfo.name);
  console.log("[OpenAI Search] 🔍 Missing fields:", missingFields);

  const startTime = Date.now();
  // Use the imported utility function instead of the local one
  const prompt = generateMissingDataPrompt(companyInfo, missingFields);

  try {
    console.log("[OpenAI Search] 📤 Sending request to OpenAI");
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
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
        'gpt-3.5-turbo'
      ),
      model: 'gpt-3.5-turbo',
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
      model: 'gpt-3.5-turbo',
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
        model: "gpt-3.5-turbo",
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
          'gpt-3.5-turbo'
        ),
        model: 'gpt-3.5-turbo',
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
      model: "gpt-3.5-turbo",
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
        'gpt-3.5-turbo'
      ),
      model: 'gpt-3.5-turbo',
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

interface DocumentAnalysisResult {
  answers: DocumentAnswer[];
}

export async function analyzeDocument(
  documentText: string,
  fields: { field_key: string; question: string; ai_search_instructions: string }[]
): Promise<DocumentAnalysisResult> {
  const startTime = Date.now();

  try {
    console.log('[OpenAI Service] Starting document analysis:', {
      textLength: documentText.length,
      fieldsCount: fields.length,
      fieldKeys: fields.map(f => f.field_key),
      timestamp: new Date().toISOString()
    });

    // Determine if the content appears to be from a CSV file
    const isCSVContent = documentText.startsWith('CSV Document Content:') || 
                        documentText.includes('Headers:') && documentText.includes('Row ');
    
    // Customize prompt based on content type
    let documentTypeInstructions = '';
    if (isCSVContent) {
      documentTypeInstructions = `
      This document appears to be in CSV format. Pay special attention to:
      - The headers that define each column
      - Row numbers that indicate separate entries
      - Column-value pairs that match with field questions
      - Remember that each row may contain information relevant to different fields`;
    }

    const prompt = `
    As a compliance and security expert, analyze this document section and extract specific information for each field.
    You must maintain strict field key mapping throughout your analysis.

    Document Text:
    ${documentText}

    ${documentTypeInstructions}

    Instructions:
    1. For each field below, extract ONLY information that directly answers its specific question
    2. You MUST use the exact field_key provided for each answer
    3. Do not combine answers from different fields
    4. If no relevant information is found for a field, skip it
    5. Use high confidence scores (0.9+) only for exact matches

    Fields to analyze:
    ${fields.map(f => `
    Field Key: "${f.field_key}"
    Question: ${f.question}
    Search Instructions: ${f.ai_search_instructions || 'Look for relevant information in the document'}
    Look for:
    - Direct statements or claims
    - Specific dates, numbers, or procedures
    - Policy descriptions
    `).join('\n')}

    Return a JSON object in this format:
    {
      "answers": [
        {
          "field_key": "exact field_key from above",
          "answer": "exact quote or clear summary from document",
          "source_document": "relevant section from document that supports this answer",
          "confidence": number between 0 and 1
        }
      ]
    }

    Important:
    - Each answer MUST use one of these exact field keys: ${fields.map(f => `"${f.field_key}"`).join(', ')}
    - Do not create new field keys or combine multiple fields
    - Confidence scoring:
      * 0.9+ for exact matches with clear evidence
      * 0.7-0.8 for strong indirect matches
      * 0.5-0.6 for relevant but indirect matches
      * Skip if confidence would be below 0.5
    `;

    console.log('[OpenAI Service] Sending request with field keys:', { 
      fieldKeys: fields.map(f => f.field_key),
      isCSVContent,
      timestamp: new Date().toISOString() 
    });

    // Use GPT-4o for better CSV parsing when available
    const model = "gpt-3.5-turbo";  // Fall back to 3.5 as default
    
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: "You are a compliance document analysis expert specializing in security and risk assessment."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    const duration = Date.now() - startTime;

    if (!response.choices[0].message.content) {
      throw new Error("Empty response from OpenAI");
    }

    const result = JSON.parse(response.choices[0].message.content);

    // Validate field keys in response
    const validFieldKeys = new Set(fields.map(f => f.field_key));
    result.answers = result.answers.filter(answer => {
      const isValidKey = validFieldKeys.has(answer.field_key);
      if (!isValidKey) {
        console.warn('[OpenAI Service] Invalid field key found:', {
          invalidKey: answer.field_key,
          validKeys: Array.from(validFieldKeys),
          answer: answer.answer.substring(0, 100) + '...'
        });
      }
      return isValidKey;
    });

    console.log('[OpenAI Service] Answers by field:', {
      total: result.answers.length,
      byField: Object.fromEntries(
        Array.from(validFieldKeys).map(key => [
          key,
          result.answers.filter(a => a.field_key === key).length
        ])
      ),
      timestamp: new Date().toISOString()
    });

    return result;
  } catch (error) {
    console.error('[OpenAI Service] Document analysis error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}