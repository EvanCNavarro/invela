import fs from 'fs';
import { extractTextFromFirstPages } from './pdf';

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

    // Here we'll integrate with OpenAI processing
    // This is a placeholder that will be implemented next
    throw new Error('OpenAI processing not implemented yet');

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