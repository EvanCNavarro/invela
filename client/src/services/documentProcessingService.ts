import { apiRequest } from '@/lib/queryClient';
import type { CardField } from './cardService';

const PDF_CHUNK_SIZE = 16000; // ~3 pages worth of text

interface ProcessingResult {
  answersFound: number;
  status: 'processing' | 'classified';
}

export async function startDocumentProcessing(
  file: File,
  cardFields: CardField[],
  onProgress: (result: ProcessingResult) => void
) {
  try {
    console.log('[DocumentProcessingService] Starting document processing:', {
      fileName: file.name,
      fileSize: file.size,
      timestamp: new Date().toISOString()
    });

    // Create form data to send file and fields
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fields', JSON.stringify(cardFields.map(field => ({
      field_key: field.field_key,
      question: field.question,
      ai_search_instructions: field.ai_search_instructions
    }))));

    // Set processing state
    onProgress({
      answersFound: 0,
      status: 'processing'
    });

    // Make API call to process document
    const response = await fetch('/api/documents/process', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Failed to process document: ${response.statusText}`);
    }

    const result = await response.json();

    // Update with results
    onProgress({
      answersFound: result.answersFound,
      status: 'classified'
    });

    console.log('[DocumentProcessingService] Document processing complete:', {
      fileName: file.name,
      answersFound: result.answersFound,
      timestamp: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error('[DocumentProcessingService] Processing error:', {
      fileName: file.name,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}