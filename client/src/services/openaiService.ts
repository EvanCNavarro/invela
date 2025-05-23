/**
 * ========================================
 * OpenAI Service Module
 * ========================================
 * 
 * Enterprise AI document processing service providing comprehensive
 * document analysis, answer extraction, and intelligent content processing.
 * Integrates with OpenAI GPT-4o for advanced natural language understanding
 * and automated compliance data extraction from business documents.
 * 
 * Key Features:
 * - GPT-4o powered document analysis and answer extraction
 * - Intelligent compliance question processing with confidence scoring
 * - Structured data extraction from unstructured document content
 * - Enterprise-grade error handling and API request management
 * - Real-time processing with comprehensive logging and monitoring
 * 
 * Dependencies:
 * - OpenAI: Advanced language model API for document processing
 * 
 * @module OpenAIService
 * @version 2.0.0
 * @since 2024-04-15
 */

// ========================================
// IMPORTS
// ========================================

// OpenAI SDK for advanced language model integration
import OpenAI from "openai";

// ========================================
// CONSTANTS
// ========================================

/**
 * OpenAI service configuration constants
 * Defines model settings and processing parameters for optimal performance
 */
const OPENAI_CONFIG = {
  MODEL: "gpt-4o", // Latest GPT-4o model released May 13, 2024
  MAX_TOKENS: 4000,
  TEMPERATURE: 0.1, // Low temperature for consistent, factual responses
  REQUEST_TIMEOUT: 60000,
  MAX_RETRY_ATTEMPTS: 3
} as const;

/**
 * Document processing configuration values
 * Optimizes chunk processing and confidence thresholds
 */
const PROCESSING_DEFAULTS = {
  MIN_CONFIDENCE_THRESHOLD: 0.7,
  MAX_CHUNK_SIZE: 8000,
  EXTRACTION_TIMEOUT: 30000
} as const;

// ========================================
// INITIALIZATION
// ========================================

/**
 * Initialize OpenAI client with secure API key management
 * Validates environment configuration and establishes authenticated connection
 */
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
if (!apiKey) {
  throw new Error('OpenAI API key not found. Please set VITE_OPENAI_API_KEY environment variable.');
}

const openai = new OpenAI({ 
  apiKey,
  timeout: OPENAI_CONFIG.REQUEST_TIMEOUT
});

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Answer extraction result interface for structured document processing
 * 
 * Defines the complete structure for AI-extracted answers including
 * confidence scoring, source tracking, and field mapping for
 * comprehensive compliance data management workflows.
 */
interface Answer {
  /** Field identifier for answer mapping */
  field_key: string;
  /** Extracted answer content from document */
  answer: string;
  /** Source document reference for audit trail */
  source_document: string;
  /** AI confidence score (0-1) for answer reliability */
  confidence: number;
}

/**
 * Question processing interface for AI instruction management
 * 
 * Structures compliance questions with AI search instructions for
 * optimized document processing and accurate answer extraction.
 */
interface ProcessingQuestion {
  /** Unique field identifier */
  field_key: string;
  /** Human-readable question text */
  question: string;
  /** AI-specific search and extraction instructions */
  ai_search_instructions: string;
}

// ========================================
// SERVICE IMPLEMENTATION
// ========================================

/**
 * Extract structured answers from document content using AI processing
 * 
 * Processes document chunks through GPT-4o to extract specific answers
 * to compliance questions. Implements intelligent parsing with confidence
 * scoring and comprehensive error handling for enterprise document workflows.
 * 
 * @param documentChunk Document text content for processing
 * @param fileName Source document filename for audit tracking
 * @param questions Array of structured questions for answer extraction
 * @returns Promise resolving to array of extracted answers with confidence scores
 * 
 * @throws {Error} When AI processing fails or invalid parameters provided
 */
export async function extractAnswersFromDocument(
  documentChunk: string,
  fileName: string,
  questions: ProcessingQuestion[]
): Promise<Answer[]> {
  try {
    // Validate input parameters for defensive programming
    if (!documentChunk || typeof documentChunk !== 'string' || documentChunk.length === 0) {
      throw new Error('Invalid document chunk provided for AI processing');
    }

    if (!fileName || typeof fileName !== 'string') {
      throw new Error('Invalid filename provided for document tracking');
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Invalid questions array provided for AI extraction');
    }

    console.log('[OpenAIService] Processing document chunk:', {
      fileName,
      chunkLength: documentChunk.length,
      questionCount: questions.length,
      timestamp: new Date().toISOString()
    });

    // Execute OpenAI API request with enterprise configuration
    const response = await openai.chat.completions.create({
      model: OPENAI_CONFIG.MODEL,
      temperature: OPENAI_CONFIG.TEMPERATURE,
      max_tokens: OPENAI_CONFIG.MAX_TOKENS,
      messages: [
        {
          role: "system",
          content: "You are an expert compliance analyst specializing in extracting precise answers from business documents. Always provide confidence scores and ensure accuracy in your responses."
        },
        {
          role: "user",
          content: `Analyze this document chunk and extract answers for the compliance questions below. For each question, provide a confidence score (0-1) indicating your certainty in the answer.

Document Content:
${documentChunk}

Compliance Questions:
${questions.map((q, index) => `${index + 1}. ${q.question} (Field Key: ${q.field_key})
   Search Instructions: ${q.ai_search_instructions}`).join('\n\n')}

IMPORTANT: Respond in valid JSON format with an "answers" array. Each answer must contain:
- field_key: The exact field key provided
- answer: The extracted answer (use "Not found" if no relevant information exists)
- confidence: Decimal number between 0 and 1 indicating confidence level

Example format:
{
  "answers": [
    {
      "field_key": "example_key",
      "answer": "extracted answer text",
      "confidence": 0.85
    }
  ]
}`
        }
      ],
      response_format: { type: "json_object" }
    });

    // Validate and parse API response with comprehensive error handling
    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content received from OpenAI API response');
    }

    let result;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error('[OpenAIService] Failed to parse OpenAI response:', content);
      throw new Error(`Invalid JSON response from OpenAI: ${parseError}`);
    }

    // Validate response structure and content
    if (!result.answers || !Array.isArray(result.answers)) {
      throw new Error('OpenAI response missing required "answers" array');
    }

    console.log('[OpenAIService] Document processing completed successfully:', {
      fileName,
      questionsProcessed: questions.length,
      answersExtracted: result.answers.length,
      avgConfidence: result.answers.reduce((sum: number, ans: any) => sum + (ans.confidence || 0), 0) / result.answers.length,
      timestamp: new Date().toISOString()
    });

    // Transform and validate individual answers
    return result.answers.map((answer: any, index: number) => {
      // Validate required answer properties
      if (!answer.field_key || typeof answer.field_key !== 'string') {
        console.warn(`[OpenAIService] Invalid field_key in answer ${index}:`, answer);
        return null;
      }

      if (!answer.answer || typeof answer.answer !== 'string') {
        console.warn(`[OpenAIService] Invalid answer content in answer ${index}:`, answer);
        return null;
      }

      const confidence = typeof answer.confidence === 'number' ? 
        Math.max(0, Math.min(1, answer.confidence)) : 0.5;

      return {
        field_key: answer.field_key.trim(),
        answer: answer.answer.trim(),
        source_document: fileName,
        confidence
    }));
  } catch (error: unknown) {
    console.error('[OpenAIService] Error processing document:', {
      fileName,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}