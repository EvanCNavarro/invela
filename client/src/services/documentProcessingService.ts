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

// Singleton queue manager
class ProcessingQueueManager {
  private static instance: ProcessingQueueManager;
  private isProcessing = false;
  private queue: number[] = [];
  private currentFileId: number | null = null;

  private constructor() {}

  static getInstance(): ProcessingQueueManager {
    if (!ProcessingQueueManager.instance) {
      ProcessingQueueManager.instance = new ProcessingQueueManager();
    }
    return ProcessingQueueManager.instance;
  }

  async addToQueue(fileId: number): Promise<void> {
    console.log('[ProcessingQueue] Adding file to queue:', {
      fileId,
      queueLength: this.queue.length + 1,
      timestamp: new Date().toISOString()
    });

    this.queue.push(fileId);
    await this.processNextIfIdle();
  }

  private async processNextIfIdle(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    this.currentFileId = this.queue[0];

    console.log('[ProcessingQueue] Starting file processing:', {
      fileId: this.currentFileId,
      queuePosition: 1,
      remainingFiles: this.queue.length - 1,
      timestamp: new Date().toISOString()
    });

    try {
      await this.processCurrentFile();
    } finally {
      this.isProcessing = false;
      this.currentFileId = null;
      this.queue.shift(); // Remove processed file

      // Process next file if any
      if (this.queue.length > 0) {
        await this.processNextIfIdle();
      } else {
        console.log('[ProcessingQueue] Queue empty', {
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  private async processCurrentFile(): Promise<void> {
    if (!this.currentFileId) return;

    const startTime = Date.now();
    let success = false;

    try {
      // Start processing
      const processResponse = await apiRequest('POST', `/api/documents/${this.currentFileId}/process`, {
        fields: ['all'] // This will be replaced with actual fields in the main function
      });

      if (!processResponse.ok) {
        throw new Error(`Failed to start processing for file ${this.currentFileId}`);
      }

      // Poll for progress
      let isProcessing = true;
      while (isProcessing) {
        const progressResponse = await apiRequest('GET', `/api/documents/${this.currentFileId}/progress`);

        if (!progressResponse.ok) {
          throw new Error('Progress check failed');
        }

        const progressData = await progressResponse.json();

        if (progressData.status === 'processed') {
          isProcessing = false;
          success = true;
        } else {
          // Wait before next check
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      console.error('[ProcessingQueue] Error processing file:', {
        fileId: this.currentFileId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } finally {
      const processingTime = Date.now() - startTime;
      console.log('[ProcessingQueue] File completed:', {
        fileId: this.currentFileId,
        success,
        processingTime,
        nextFileId: this.queue[1] || null,
        timestamp: new Date().toISOString()
      });
    }
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

    const queueManager = ProcessingQueueManager.getInstance();
    let totalAnswersFound = 0;

    // Add each file to the processing queue
    for (const fileId of fileIds) {
      await queueManager.addToQueue(fileId);
    }

    // Get final results after all files are processed
    const results = await Promise.all(
      fileIds.map(fileId =>
        apiRequest('GET', `/api/documents/${fileId}/results`)
          .then(res => res.json())
          .catch(() => ({ answersFound: 0 }))
      )
    );

    totalAnswersFound = results.reduce((sum, result) => sum + (result.answersFound || 0), 0);

    return {
      answersFound: totalAnswersFound,
      status: 'processed'
    };

  } catch (error) {
    console.error('[DocumentProcessingService] Processing error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });

    throw error;
  }
}