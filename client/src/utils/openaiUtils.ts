import { OpenAI } from 'openai';

/**
 * Singleton pattern for OpenAI client to ensure we have
 * only one instance throughout the application
 */
class OpenAIClientSingleton {
  private static instance: OpenAIClientSingleton;
  private client: OpenAI;

  private constructor() {
    // Initialize the OpenAI client
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      dangerouslyAllowBrowser: false // We don't use OpenAI in browser
    });
  }

  public static getInstance(): OpenAIClientSingleton {
    if (!OpenAIClientSingleton.instance) {
      OpenAIClientSingleton.instance = new OpenAIClientSingleton();
    }
    return OpenAIClientSingleton.instance;
  }

  public getClient(): OpenAI {
    return this.client;
  }
}

// Export a function to get the OpenAI client
export const getOpenAIClient = (): OpenAI => {
  return OpenAIClientSingleton.getInstance().getClient();
};

/**
 * Calculate the cost of an OpenAI API call
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @param model - The model used (e.g., 'gpt-3.5-turbo', 'gpt-4')
 * @returns Estimated cost in USD
 */
export const calculateOpenAICost = (
  inputTokens: number,
  outputTokens: number,
  model: string
): number => {
  // Pricing per 1K tokens (as of April 2025)
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4-32k': { input: 0.06, output: 0.12 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-4o': { input: 0.01, output: 0.03 },
  };

  const modelPricing = pricing[model] || pricing['gpt-3.5-turbo']; // Default to gpt-3.5-turbo pricing

  // Calculate cost
  const inputCost = (inputTokens / 1000) * modelPricing.input;
  const outputCost = (outputTokens / 1000) * modelPricing.output;

  return parseFloat((inputCost + outputCost).toFixed(6));
};

/**
 * Processes a field suggestion from OpenAI
 * @param suggestion The raw suggestion data
 * @param confidence The confidence score (0-1)
 * @returns Formatted suggestion or undefined if confidence too low
 */
export const processAISuggestion = (
  suggestion: string | undefined,
  confidence: number = 0.7
): { value: string; confidence: number } | undefined => {
  if (!suggestion || confidence < 0.7) {
    return undefined;
  }

  return {
    value: suggestion,
    confidence
  };
};

/**
 * Helper function to extract data from OpenAI response
 * @param result OpenAI response object
 * @returns Cleaned data
 */
export const extractDataFromOpenAIResponse = (result: Record<string, any>): Record<string, any> => {
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
        // If not valid JSON, treat as string
        extracted[key] = value;
      }
    } else {
      extracted[key] = value;
    }
  }

  return extracted;
};

export default {
  getOpenAIClient,
  calculateOpenAICost,
  processAISuggestion,
  extractDataFromOpenAIResponse
};