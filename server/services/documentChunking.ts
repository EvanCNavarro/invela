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

interface ProcessingStats {
  answersFound: number;
  processedChunks: number;
  batchStartTime: number;
  lastLogTime: number;
}

export async function createDocumentChunks(
  filePath: string,
  mimeType: string,
  chunkSize: number = OPTIMAL_CHUNK_SIZE
): Promise<Chunk[]> {
  try {
    let content: string;

    if (mimeType === 'application/pdf') {
      content = await extractTextFromFirstPages(filePath);
    } else {
      content = fs.readFileSync(filePath, 'utf8');
    }

    if (!content?.length) {
      throw new DocumentChunkingError('No content extracted from document');
    }

    const chunks: Chunk[] = [];
    let currentPosition = 0;
    let invalidContentCount = 0;

    while (currentPosition < content.length) {
      let endPosition = Math.min(currentPosition + chunkSize, content.length);

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

    console.log('[DocumentChunking] Document prepared:', {
      fileName: filePath.split('/').pop(),
      totalChunks: chunks.length,
      totalContent: content.length,
      averageChunkSize: Math.round(content.length / chunks.length),
      invalidChunks: invalidContentCount,
      timestamp: new Date().toISOString()
    });

    return chunks;
  } catch (error) {
    console.error('[DocumentChunking] Preparation failed:', {
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

    const formattedFields = cardFields.map(field_key => ({
      field_key,
      question: `Find information about ${field_key}`,
      ai_search_instructions: `Look for content related to ${field_key}`
    }));

    const result = await analyzeDocument(chunk.content, formattedFields);

    // Only log batched results
    if (chunk.index % BATCH_SIZE === 0 || result.answers.length > 0) {
      console.log('[DocumentChunking] Processing status:', {
        chunkIndex: chunk.index,
        batchProgress: `${chunk.index + 1}-${Math.min(chunk.index + BATCH_SIZE, chunk.index + 1)}`,
        answersFound: result.answers.length,
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
    // Only log errors for failed chunks
    console.error('[DocumentChunking] Chunk error:', {
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