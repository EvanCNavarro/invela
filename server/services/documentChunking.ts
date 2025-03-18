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
const BATCH_SIZE = 5; // Number of chunks to process before logging
const PROCESSING_INTERVAL = 1000; // Milliseconds between processing batches

export async function createDocumentChunks(
  filePath: string,
  mimeType: string,
  chunkSize: number = OPTIMAL_CHUNK_SIZE
): Promise<Chunk[]> {
  try {
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

    // Split content into chunks
    const chunks: Chunk[] = [];
    let currentPosition = 0;
    let invalidContentCount = 0;

    while (currentPosition < content.length) {
      let endPosition = Math.min(currentPosition + chunkSize, content.length);

      // Try to break at a natural point if we're not at the end
      if (endPosition < content.length) {
        const searchWindow = content.slice(endPosition - 100, endPosition + 100);
        const periodMatch = searchWindow.match(/\.\s+/);
        const newlineMatch = searchWindow.match(/\n\s*\n/);

        if (newlineMatch && newlineMatch.index !== undefined) {
          endPosition = endPosition - 100 + newlineMatch.index + newlineMatch[0].length;
        } else if (periodMatch && periodMatch.index !== undefined) {
          endPosition = endPosition - 100 + periodMatch.index + periodMatch[0].length;
        }
      }

      const chunkContent = content.slice(currentPosition, endPosition).trim();

      if (chunkContent.length >= MIN_CHUNK_SIZE) {
        chunks.push({
          content: chunkContent,
          index: chunks.length,
          startPosition: currentPosition,
          endPosition
        });
      } else {
        invalidContentCount++;
      }

      currentPosition = endPosition;
    }

    if (chunks.length === 0) {
      throw new DocumentChunkingError('No valid chunks created from document');
    }

    // Log only final summary
    console.log('[PDF Service] Extraction complete:', {
      fileName: filePath.split('/').pop(),
      totalPages: content.length > 0 ? Math.ceil(content.length / 3000) : 0,
      extractedPages: chunks.length,
      totalContent: content.length,
      averageContentPerPage: Math.round(content.length / chunks.length),
      invalidContentItems: invalidContentCount,
      timestamp: new Date().toISOString()
    });

    return chunks;
  } catch (error) {
    console.error('[PDF Service] Extraction failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      fileName: filePath.split('/').pop(),
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

export async function processChunk(
  chunk: Chunk,
  cardFields: string[]
): Promise<{
  answers: Array<{ field_key: string; answer: string }>;
  error?: string;
}> {
  try {
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

    // Only log when answers are found
    if (result.answers.length > 0) {
      console.log('[DocumentChunking] Answers found:', {
        chunkIndex: chunk.index,
        answerCount: result.answers.length,
        timestamp: new Date().toISOString()
      });
    }

    return {
      answers: result.answers.map(answer => ({
        field_key: answer.field_key,
        answer: answer.answer
      }))
    };

  } catch (error) {
    console.error('[DocumentChunking] Processing error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      chunkIndex: chunk.index,
      timestamp: new Date().toISOString()
    });

    return {
      answers: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}