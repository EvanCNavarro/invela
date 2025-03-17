import { apiRequest } from '@/lib/queryClient';
import type { CardField } from './cardService';

interface ProcessingResult {
  answersFound: number;
  status: 'processing' | 'processed' | 'error';
  error?: string;
  progress?: {
    chunksProcessed: number;
    totalChunks: number;
  };
}

interface DocumentAnswer {
  field_key: string;
  answer: string;
  source_document: string;
  chunk_index?: number;
}

interface FileProcessingResult {
  fileId: number;
  fileName: string;
  answers?: DocumentAnswer[];
  error?: string;
  totalChunks?: number;
  processedChunks?: number;
}

class DocumentProcessingError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'DocumentProcessingError';
  }
}

export async function processDocuments(
  fileIds: number[],
  cardFields: CardField[],
  onProgress: (result: ProcessingResult) => void
): Promise<ProcessingResult> {
  try {
    // Validate inputs
    if (!fileIds?.length) {
      throw new DocumentProcessingError('No file IDs provided');
    }

    if (!cardFields?.length) {
      throw new DocumentProcessingError('No card fields provided');
    }

    console.log('[DocumentProcessingService] Starting document processing:', {
      fileIds,
      cardFieldCount: cardFields.length,
      timestamp: new Date().toISOString()
    });

    // Start processing
    onProgress({
      answersFound: 0,
      status: 'processing'
    });

    // Process each file sequentially
    let totalAnswersFound = 0;

    for (const fileId of fileIds) {
      try {
        // Start processing the file
        const processResponse = await apiRequest('POST', `/api/documents/${fileId}/process`, {
          fields: cardFields
        });

        const processData = await processResponse.json();

        console.log('[DocumentProcessingService] Processing started:', {
          fileId,
          totalChunks: processData.totalChunks,
          timestamp: new Date().toISOString()
        });

        // Track chunk processing progress
        for (let chunk = 0; chunk < processData.totalChunks; chunk++) {
          const progressResponse = await apiRequest('GET', `/api/documents/${fileId}/progress`);
          const progressData = await progressResponse.json();

          onProgress({
            answersFound: progressData.answersFound,
            status: 'processing',
            progress: {
              chunksProcessed: progressData.chunksProcessed,
              totalChunks: processData.totalChunks
            }
          });

          // Simulate waiting for chunk processing
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Get final results
        const resultsResponse = await apiRequest('GET', `/api/documents/${fileId}/results`);
        const results = await resultsResponse.json();

        console.log('[DocumentProcessingService] File processing complete:', {
          fileId,
          answersFound: results.answers.length,
          timestamp: new Date().toISOString()
        });

        totalAnswersFound += results.answers.length;

      } catch (error: any) {
        console.error('[DocumentProcessingService] Error processing file:', {
          fileId,
          error: error.message,
          timestamp: new Date().toISOString()
        });

        onProgress({
          answersFound: totalAnswersFound,
          status: 'error',
          error: `Error processing file: ${error.message}`
        });
      }
    }

    // All files processed
    console.log('[DocumentProcessingService] All files processed:', {
      totalAnswersFound,
      timestamp: new Date().toISOString()
    });

    return {
      answersFound: totalAnswersFound,
      status: 'processed'
    };

  } catch (error: any) {
    console.error('[DocumentProcessingService] Processing error:', {
      error: error.message,
      details: error.details,
      timestamp: new Date().toISOString()
    });

    onProgress({
      answersFound: 0,
      status: 'error',
      error: error instanceof DocumentProcessingError 
        ? error.message 
        : 'An unexpected error occurred while processing documents'
    });

    throw error;
  }
}