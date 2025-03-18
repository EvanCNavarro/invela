import fs from 'fs';
import { extractTextFromFirstPages } from './pdf';
import { analyzeDocument } from './openai';

interface Chunk {
  content: string;
  index: number;
  startPosition: number;
  endPosition: number;
}

export class DocumentChunkingError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'DocumentChunkingError';
  }
}

export async function createDocumentChunks(
  filePath: string,
  mimeType: string,
  chunkSize: number = 4000
): Promise<Chunk[]> {
  try {
    console.log('[DocumentChunking] Starting document chunking:', {
      filePath,
      mimeType,
      chunkSize,
      timestamp: new Date().toISOString()
    });

    let content: string;

    // Handle different file types
    if (mimeType === 'application/pdf') {
      content = await extractTextFromFirstPages(filePath, 0); // 0 means all pages
    } else {
      content = fs.readFileSync(filePath, 'utf8');
    }

    // Split content into chunks
    const chunks: Chunk[] = [];
    let currentPosition = 0;

    while (currentPosition < content.length) {
      // Find a good breaking point
      let endPosition = Math.min(currentPosition + chunkSize, content.length);

      // Try to break at a natural point if we're not at the end
      if (endPosition < content.length) {
        const nextPeriod = content.indexOf('.', endPosition - 100);
        const nextNewline = content.indexOf('\n', endPosition - 100);

        if (nextPeriod !== -1 && nextPeriod < endPosition + 100) {
          endPosition = nextPeriod + 1;
        } else if (nextNewline !== -1 && nextNewline < endPosition + 100) {
          endPosition = nextNewline + 1;
        }
      }

      chunks.push({
        content: content.slice(currentPosition, endPosition),
        index: chunks.length,
        startPosition: currentPosition,
        endPosition
      });

      currentPosition = endPosition;

      console.log('[DocumentChunking] Created chunk:', {
        chunkIndex: chunks.length - 1,
        chunkSize: endPosition - currentPosition,
        totalChunks: chunks.length,
        timestamp: new Date().toISOString()
      });
    }

    console.log('[DocumentChunking] Chunks created:', {
      totalChunks: chunks.length,
      averageChunkSize: chunks.reduce((acc, chunk) => 
        acc + chunk.content.length, 0) / chunks.length,
      timestamp: new Date().toISOString()
    });

    return chunks;
  } catch (error) {
    console.error('[DocumentChunking] Error creating chunks:', {
      error,
      filePath,
      timestamp: new Date().toISOString()
    });

    throw new DocumentChunkingError(
      'Failed to create document chunks',
      { originalError: error }
    );
  }
}

export async function processChunk(
  chunk: Chunk,
  cardFields: string[]
): Promise<{
  answers: Array<{ field: string; answer: string; confidence: number }>;
  error?: string;
}> {
  try {
    console.log('[DocumentChunking] Processing chunk:', {
      chunkIndex: chunk.index,
      contentLength: chunk.content.length,
      fieldsCount: cardFields.length,
      timestamp: new Date().toISOString()
    });

    // Transform cardFields into the format expected by analyzeDocument
    const formattedFields = cardFields.map(field_key => ({
      field_key,
      question: `Find information about ${field_key}`,
      ai_search_instructions: `Look for content related to ${field_key}`
    }));

    // Process chunk with OpenAI
    const result = await analyzeDocument(chunk.content, formattedFields);

    console.log('[DocumentChunking] Chunk processed:', {
      chunkIndex: chunk.index,
      answersFound: result.answers.length,
      timestamp: new Date().toISOString()
    });

    return {
      answers: result.answers.map(answer => ({
        field: answer.field_key,
        answer: answer.answer,
        confidence: 0.9 // Default confidence for now
      }))
    };

  } catch (error) {
    console.error('[DocumentChunking] Error processing chunk:', {
      error,
      chunkIndex: chunk.index,
      timestamp: new Date().toISOString()
    });

    return {
      answers: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}