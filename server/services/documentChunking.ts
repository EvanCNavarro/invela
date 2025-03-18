import fs from 'fs';
import { extractTextFromFirstPages } from './pdf';
import { analyzeDocument } from './openai';

interface Chunk {
  content: string;
  index: number;
  startPosition: number;
  endPosition: number;
}

interface Field {
  field_key: string;
  question: string;
  ai_search_instructions?: string;
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

      if (chunkContent.length >= 100) {
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
  fields: Field[]
): Promise<{
  answers: Array<{ field_key: string; answer: string }>;
  error?: string;
}> {
  try {
    if (chunk.content.length < 100) {
      throw new Error(`Chunk content too small: ${chunk.content.length} chars`);
    }

    console.log('[DocumentChunking] Processing chunk:', {
      chunkIndex: chunk.index,
      contentLength: chunk.content.length,
      fields: fields.map(f => f.field_key),
      timestamp: new Date().toISOString()
    });

    // Pass complete field information to OpenAI
    const result = await analyzeDocument(chunk.content, fields);

    console.log('[DocumentChunking] Chunk analysis complete:', {
      chunkIndex: chunk.index,
      answersFound: result.answers.length,
      answersByField: Object.fromEntries(
        fields.map(f => [
          f.field_key,
          result.answers.filter(a => a.field_key === f.field_key).length
        ])
      ),
      timestamp: new Date().toISOString()
    });

    return {
      answers: result.answers.map(answer => ({
        field_key: answer.field_key,
        answer: answer.answer
      }))
    };

  } catch (error) {
    console.error('[DocumentChunking] Chunk processing error:', {
      chunkIndex: chunk.index,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });

    return {
      answers: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}