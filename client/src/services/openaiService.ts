/**
 * ========================================
 * OpenAI Service - Intelligent Document Processing
 * ========================================
 * 
 * Advanced AI-powered document processing service leveraging OpenAI's latest
 * language models for intelligent content extraction, field analysis, and
 * automated form completion capabilities throughout the enterprise platform.
 * 
 * Key Features:
 * - GPT-4o powered document content extraction
 * - Intelligent field-specific question answering
 * - Confidence scoring for extracted answers
 * - Multi-document source tracking and attribution
 * - Advanced AI search instruction processing
 * 
 * Processing Capabilities:
 * - Smart document chunk analysis with context preservation
 * - Field-specific extraction with custom search instructions
 * - Confidence scoring for answer reliability assessment
 * - Source document attribution for audit trails
 * - Error handling and fallback mechanisms for robust operation
 * 
 * @module services/openaiService
 * @version 1.0.0
 * @since 2025-05-23
 */

import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
if (!apiKey) {
  throw new Error('OpenAI API key not found. Please set VITE_OPENAI_API_KEY environment variable.');
}

const openai = new OpenAI({ apiKey });

interface Answer {
  field_key: string;
  answer: string;
  source_document: string;
  confidence: number;
}

export async function extractAnswersFromDocument(
  documentChunk: string,
  fileName: string,
  questions: Array<{
    field_key: string;
    question: string;
    ai_search_instructions: string;
  }>
): Promise<Answer[]> {
  try {
    console.log('[OpenAIService] Processing document chunk:', {
      fileName,
      chunkLength: documentChunk.length,
      questionCount: questions.length,
      timestamp: new Date().toISOString()
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a compliance analyst extracting specific answers from documents."
        },
        {
          role: "user",
          content: `Analyze this document chunk and extract answers for the compliance questions. Include a confidence score (0-1) for each answer.

Document: ${documentChunk}

Questions to answer:
${questions.map(q => `- ${q.question} (key: ${q.field_key})
  Search instructions: ${q.ai_search_instructions}`).join('\n')}

Respond in JSON format with an array of answers, each containing:
- field_key: The question's key
- answer: The extracted answer
- confidence: Number between 0-1 indicating confidence
`
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    const result = JSON.parse(content);

    console.log('[OpenAIService] Processed chunk successfully:', {
      fileName,
      answersFound: result.answers.length,
      timestamp: new Date().toISOString()
    });

    return result.answers.map((answer: Answer) => ({
      ...answer,
      source_document: fileName
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