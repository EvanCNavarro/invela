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

    // Process each file sequentially
    let totalAnswersFound = 0;

    for (const fileId of fileIds) {
      try {
        // Start processing
        const processResponse = await apiRequest('POST', `/api/documents/${fileId}/process`, {
          fields: cardFields.map(f => f.key)
        });

        if (!processResponse.ok) {
          throw new Error(`Failed to start processing for file ${fileId}`);
        }

        const processData = await processResponse.json();

        console.log('[DocumentProcessingService] Processing started:', {
          fileId,
          totalChunks: processData.totalChunks,
          timestamp: new Date().toISOString()
        });

        // Poll for progress
        let isProcessing = true;
        let retryCount = 0;
        const maxRetries = 3;

        while (isProcessing && retryCount < maxRetries) {
          try {
            const progressResponse = await apiRequest('GET', `/api/documents/${fileId}/progress`);

            if (!progressResponse.ok) {
              throw new Error('Progress check failed');
            }

            const progressData = await progressResponse.json();

            onProgress({
              answersFound: progressData.answersFound || 0,
              status: 'processing',
              progress: progressData.progress
            });

            if (progressData.status === 'processed') {
              isProcessing = false;
            } else {
              // Wait before next check
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (error) {
            retryCount++;
            if (retryCount >= maxRetries) {
              throw error;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        // Get final results
        const resultsResponse = await apiRequest('GET', `/api/documents/${fileId}/results`);

        if (!resultsResponse.ok) {
          throw new Error('Failed to get processing results');
        }

        const results = await resultsResponse.json();

        console.log('[DocumentProcessingService] File processing complete:', {
          fileId,
          answersFound: results.answersFound,
          timestamp: new Date().toISOString()
        });

        totalAnswersFound += results.answersFound || 0;

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

    throw error;
  }
}