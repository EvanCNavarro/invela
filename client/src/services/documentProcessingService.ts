import { apiRequest } from '@/lib/queryClient';
import type { CardField } from './cardService';

interface ProcessingResult {
  answersFound: number;
  status: 'processing' | 'classified';
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

export async function processDocuments(
  fileIds: number[],
  cardFields: CardField[],
  onProgress: (result: ProcessingResult) => void
): Promise<FileProcessingResult[]> {
  try {
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

    const data = await apiRequest('/api/documents/process', {
      method: 'POST',
      data: {
        fileIds,
        fields: cardFields.map(field => ({
          field_key: field.field_key,
          question: field.question,
          ai_search_instructions: field.ai_search_instructions
        }))
      }
    });

    console.log('[DocumentProcessingService] API response received:', {
      fileIds,
      status: data.status,
      timestamp: new Date().toISOString()
    });

    const results: FileProcessingResult[] = data.results;

    // Count total answers found across all files
    const totalAnswers = results.reduce((sum, result) => 
      sum + (result.answers?.length || 0), 0);

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

  } catch (error: unknown) {
    console.error('[DocumentProcessingService] Processing error:', {
      fileIds,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}