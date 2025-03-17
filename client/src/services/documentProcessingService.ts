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
) {
  try {
    console.log('[DocumentProcessingService] Starting document processing:', {
      fileIds,
      timestamp: new Date().toISOString()
    });

    // Set initial processing state
    onProgress({
      answersFound: 0,
      status: 'processing'
    });

    // Make API call to process documents
    const response = await apiRequest('/api/documents/process', {
      method: 'POST',
      body: JSON.stringify({
        fileIds,
        fields: cardFields.map(field => ({
          field_key: field.field_key,
          question: field.question,
          ai_search_instructions: field.ai_search_instructions
        }))
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to process documents: ${response.statusText}`);
    }

    const data = await response.json();
    const results: FileProcessingResult[] = data.results;

    // Count total answers found across all files
    const totalAnswers = results.reduce((sum, result) => 
      sum + (result.answers?.length || 0), 0);

    // Update with results
    onProgress({
      answersFound: totalAnswers,
      status: 'classified'
    });

    console.log('[DocumentProcessingService] Document processing complete:', {
      fileCount: results.length,
      totalAnswers,
      timestamp: new Date().toISOString()
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