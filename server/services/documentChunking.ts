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

const MIN_CHUNK_SIZE = 100; // Minimum characters per chunk
const OPTIMAL_CHUNK_SIZE = 4000; // Target size for chunks
const MAX_OVERLAP = 200; // Maximum overlap between chunks

export async function createDocumentChunks(
  filePath: string,
  mimeType: string,
  chunkSize: number = OPTIMAL_CHUNK_SIZE
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
      content = await extractTextFromFirstPages(filePath);
    } else {
      content = fs.readFileSync(filePath, 'utf8');
    }

    if (!content?.length) {
      throw new DocumentChunkingError('No content extracted from document');
    }

    console.log('[DocumentChunking] Content extracted:', {
      contentLength: content.length,
      mimeType,
      timestamp: new Date().toISOString()
    });

    // Split content into chunks
    const chunks: Chunk[] = [];
    let currentPosition = 0;

    while (currentPosition < content.length) {
      // Find a good breaking point
      let endPosition = Math.min(currentPosition + chunkSize, content.length);

      // Try to break at a natural point if we're not at the end
      if (endPosition < content.length) {
        const searchWindow = content.slice(endPosition - 100, endPosition + 100);

        // Look for sentence endings or paragraph breaks
        const periodMatch = searchWindow.match(/\.\s+/);
        const newlineMatch = searchWindow.match(/\n\s*\n/);

        if (newlineMatch && newlineMatch.index !== undefined) {
          endPosition = endPosition - 100 + newlineMatch.index + newlineMatch[0].length;
        } else if (periodMatch && periodMatch.index !== undefined) {
          endPosition = endPosition - 100 + periodMatch.index + periodMatch[0].length;
        }
      }

      const chunkContent = content.slice(currentPosition, endPosition).trim();

      // Validate chunk content
      if (chunkContent.length >= MIN_CHUNK_SIZE) {
        chunks.push({
          content: chunkContent,
          index: chunks.length,
          startPosition: currentPosition,
          endPosition
        });

        console.log('[DocumentChunking] Created chunk:', {
          chunkIndex: chunks.length - 1,
          chunkSize: chunkContent.length,
          startsWithWord: chunkContent.slice(0, 20),
          endsWithWord: chunkContent.slice(-20),
          timestamp: new Date().toISOString()
        });
      } else {
        console.warn('[DocumentChunking] Skipping small chunk:', {
          chunkSize: chunkContent.length,
          minRequired: MIN_CHUNK_SIZE,
          timestamp: new Date().toISOString()
        });
      }

      currentPosition = endPosition;
    }

    if (chunks.length === 0) {
      throw new DocumentChunkingError('No valid chunks created from document');
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
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
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

    if (chunk.content.length < MIN_CHUNK_SIZE) {
      throw new Error(`Chunk content too small: ${chunk.content.length} chars`);
    }

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
        confidence: answer.confidence || 0.9 // Default confidence if not provided
      }))
    };

  } catch (error) {
    console.error('[DocumentChunking] Error processing chunk:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      chunkIndex: chunk.index,
      timestamp: new Date().toISOString()
    });

    return {
      answers: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}