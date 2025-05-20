"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openai = void 0;
exports.findMissingCompanyData = findMissingCompanyData;
exports.validateAndCleanCompanyData = validateAndCleanCompanyData;
const openai_1 = __importDefault(require("openai"));
const db_adapter_1 = require("../utils/db-adapter");
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
exports.openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
// Define lazy-loaded schema variables to avoid initialization at import time
let companiesSchema;
let openaiSearchAnalyticsSchema;
// Helper function to ensure schemas are loaded when needed
function ensureSchemas() {
    if (!companiesSchema || !openaiSearchAnalyticsSchema) {
        const schemas = (0, db_adapter_1.getSchemas)();
        companiesSchema = schemas.companies;
        openaiSearchAnalyticsSchema = schemas.openaiSearchAnalytics;
    }
    return { companies: companiesSchema, openaiSearchAnalytics: openaiSearchAnalyticsSchema };
}
// Helper function to parse PostgreSQL array string
function parsePostgresArray(arrayStr) {
    if (!arrayStr)
        return [];
    // Remove PostgreSQL array braces and split by comma
    return arrayStr
        .replace(/^\{|\}$/g, '')
        .split(',')
        .map(item => item.trim().replace(/^"/, '').replace(/"$/, ''))
        .filter(Boolean);
}
// Helper function to extract data from OpenAI response
function extractDataFromResponse(result) {
    const extracted = {};
    for (const [key, value] of Object.entries(result)) {
        if (!value)
            continue;
        if (typeof value === 'object' && 'data' in value) {
            extracted[key] = value.data;
        }
        else if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
            try {
                // Try to parse as JSON first
                extracted[key] = JSON.parse(value);
            }
            catch {
                // If not valid JSON, might be a PostgreSQL array
                extracted[key] = parsePostgresArray(value);
            }
        }
        else {
            extracted[key] = value;
        }
    }
    return extracted;
}
// Update helper function to handle URL formatting
function formatWebsiteUrl(url) {
    if (!url)
        return '';
    // Remove any existing protocol and www
    let cleanUrl = url.replace(/^(https?:\/\/)?(www\.)?/, '');
    // Remove any paths or query parameters
    cleanUrl = cleanUrl.split('/')[0];
    // Add https://www. prefix
    return `https://www.${cleanUrl}`;
}
// Helper function to clean OpenAI response data
function cleanOpenAIResponse(result) {
    const cleanedData = {};
    // First extract the actual data from the OpenAI response format
    const extractedData = extractDataFromResponse(result);
    // Helper function to clean array or string values
    const cleanArrayOrString = (value) => {
        if (!value)
            return [];
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
    Object.entries(extractedData).forEach(([key, value]) => {
        if (!value)
            return;
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
                }
                else if (typeof value === 'number') {
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
                }
                else {
                    cleanedData[key] = value;
                }
                break;
            case 'fundingStage':
                if (typeof value === 'string') {
                    const match = value.match(/Series [A-Z]/i);
                    cleanedData[key] = match ? match[0] : value;
                }
                else {
                    cleanedData[key] = value;
                }
                break;
            default:
                if (typeof value === 'string') {
                    // @ts-ignore - type safety handled at runtime
                    cleanedData[key] = value.trim();
                }
                else {
                    // @ts-ignore - type safety handled at runtime
                    cleanedData[key] = value;
                }
        }
    });
    return cleanedData;
}
async function logSearchAnalytics(analytics) {
    try {
        const { openaiSearchAnalytics } = ensureSchemas();
        await (0, db_adapter_1.getDb)().insert(openaiSearchAnalytics).values({
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
    }
    catch (error) {
        console.error('[OpenAI Analytics] Failed to log search analytics:', error);
    }
}
function calculateOpenAICost(inputTokens, outputTokens, model) {
    const PRICING = {
        'gpt-4o': {
            input: 0.01,
            output: 0.03,
        }
    };
    const modelPricing = PRICING[model];
    if (!modelPricing)
        return 0;
    return ((inputTokens / 1000) * modelPricing.input +
        (outputTokens / 1000) * modelPricing.output);
}
function generateMissingDataPrompt(companyInfo, missingFields) {
    console.log("[OpenAI Search] 📋 Generating search prompt for fields:", missingFields);
    // Filter out excluded fields from company info
    const relevantInfo = { ...companyInfo };
    const excludedFields = [
        'category', 'riskScore', 'accreditationStatus', 'onboardingCompanyCompleted',
        'registryDate', 'filesPublic', 'filesPrivate', 'createdAt', 'updatedAt',
        'id', 'logoId'
    ];
    console.log("[OpenAI Search] 🔍 Filtering out excluded fields:", excludedFields);
    excludedFields.forEach(field => delete relevantInfo[field]);
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
async function findMissingCompanyData(companyInfo, missingFields) {
    console.log("[OpenAI Search] 🚀 Starting search for missing company data");
    console.log("[OpenAI Search] 📊 Company:", companyInfo.name);
    console.log("[OpenAI Search] 🔍 Missing fields:", missingFields);
    const startTime = Date.now();
    const prompt = generateMissingDataPrompt(companyInfo, missingFields);
    try {
        console.log("[OpenAI Search] 📤 Sending request to OpenAI");
        const response = await exports.openai.chat.completions.create({
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
        const content = response.choices[0].message.content;
        const rawResult = content ? JSON.parse(content) : {};
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
            estimatedCost: calculateOpenAICost(response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0, 'gpt-4o'),
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
    }
    catch (error) {
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
async function validateAndCleanCompanyData(rawData) {
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
            const response = await exports.openai.chat.completions.create({
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
            const content = response.choices[0].message.content;
            const rawResult = content ? JSON.parse(content) : {};
            const cleanedData = cleanOpenAIResponse(rawResult);
            await logSearchAnalytics({
                searchType: 'data_cleaning',
                companyId: rawData.id,
                searchPrompt: prompt,
                searchResults: rawResult,
                inputTokens: response.usage?.prompt_tokens || 0,
                outputTokens: response.usage?.completion_tokens || 0,
                estimatedCost: calculateOpenAICost(response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0, 'gpt-4o'),
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
            return cleanedData;
        }
        catch (error) {
            lastError = error;
            console.error(`OpenAI API attempt ${4 - retries} failed:`, error);
            if (error instanceof Error && error.message.includes('429')) {
                console.log("Rate limit hit, returning original data");
                return rawData;
            }
            retries--;
            if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, 4 - retries) * 1000));
            }
        }
    }
    console.error("All OpenAI validation attempts failed:", lastError);
    return rawData;
}
