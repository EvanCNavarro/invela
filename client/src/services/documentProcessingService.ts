import { apiRequest } from '@/lib/queryClient';
import type { CardField } from './cardService';

interface ProcessingResult {
  answersFound: number;
  status: 'processing' | 'classified' | 'error';
  error?: string;
}

interface DocumentAnswer {
  field_key: string;
  answer: string;
  source_document: string;
}

interface FileProcessingResult {
  fileId: number;
  fileName: string;
  answers?: DocumentAnswer[];
  error?: string;
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
): Promise<FileProcessingResult[]> {
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

    // Set initial processing state
    onProgress({
      answersFound: 0,
      status: 'processing'
    });

    console.log('[DocumentProcessingService] Preparing API request:', {
      endpoint: '/api/documents/process',
      fileIds,
      fieldCount: cardFields.length,
      timestamp: new Date().toISOString()
    });

    try {
      const requestData = {
        fileIds,
        fields: cardFields.map(field => ({
          field_key: field.field_key,
          question: field.question,
          ai_search_instructions: field.ai_search_instructions
        }))
      };

      const response = await apiRequest('POST', '/api/documents/process', requestData);
      const data = await response.json();

      console.log('[DocumentProcessingService] API response received:', {
        fileIds,
        status: response.status,
        timestamp: new Date().toISOString()
      });

      if (!data.results) {
        throw new DocumentProcessingError('Invalid API response format', { data });
      }

      const results: FileProcessingResult[] = data.results;

      // Validate results
      if (!Array.isArray(results)) {
        throw new DocumentProcessingError('Invalid results format', { results });
      }

      // Count total answers found across all files
      const totalAnswers = results.reduce((sum, result) => {
        if (result.error) {
          console.error('[DocumentProcessingService] File processing error:', {
            fileId: result.fileId,
            fileName: result.fileName,
            error: result.error,
            timestamp: new Date().toISOString()
          });
        }
        return sum + (result.answers?.length || 0);
      }, 0);

      console.log('[DocumentProcessingService] Processing complete:', {
        fileCount: results.length,
        totalAnswers,
        results: results.map(r => ({
          fileId: r.fileId,
          fileName: r.fileName,
          answersCount: r.answers?.length || 0,
          hasError: !!r.error
        })),
        timestamp: new Date().toISOString()
      });

      // Update with final results
      onProgress({
        answersFound: totalAnswers,
        status: 'classified'
      });

      return results;

    } catch (apiError: any) {
      // Handle API-specific errors
      console.error('[DocumentProcessingService] API error:', {
        error: apiError.message,
        details: apiError.details,
        timestamp: new Date().toISOString()
      });

      onProgress({
        answersFound: 0,
        status: 'error',
        error: `API Error: ${apiError.message}`
      });

      throw new DocumentProcessingError(
        'Failed to process documents through API',
        { cause: apiError }
      );
    }

  } catch (error: any) {
    // Handle all other errors
    console.error('[DocumentProcessingService] Processing error:', {
      fileIds,
      error: error instanceof Error ? error.message : String(error),
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