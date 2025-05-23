/**
 * ========================================
 * Document Processing Service Module
 * ========================================
 * 
 * Enterprise document processing service providing comprehensive
 * file analysis, content extraction, and intelligent document workflows.
 * Handles document uploads, AI-powered content processing, and
 * real-time progress tracking for enterprise compliance workflows.
 * 
 * Key Features:
 * - Queue-managed document processing with progress tracking
 * - AI-powered content extraction and analysis
 * - Enterprise-grade error handling and recovery
 * - Real-time processing status updates and monitoring
 * - Scalable architecture with singleton queue management
 * 
 * Dependencies:
 * - QueryClient: API request management and caching infrastructure
 * - CardService: Form field management and validation
 * 
 * @module DocumentProcessingService
 * @version 2.0.0
 * @since 2024-04-15
 */

// ========================================
// IMPORTS
// ========================================

// API request utilities for document processing coordination
import { apiRequest } from '@/lib/queryClient';
// Card field interfaces for form integration
import type { CardField } from './cardService';

// ========================================
// CONSTANTS
// ========================================

/**
 * Document processing configuration constants
 * Defines baseline values for processing management and performance
 */
const PROCESSING_CONFIG = {
  MAX_QUEUE_SIZE: 10,
  PROCESSING_TIMEOUT: 300000, // 5 minutes
  RETRY_ATTEMPTS: 3,
  PROGRESS_UPDATE_INTERVAL: 1000
} as const;

/**
 * Processing status types for comprehensive workflow management
 * Ensures consistent status tracking across the processing pipeline
 */
const PROCESSING_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing', 
  PROCESSED: 'processed',
  ERROR: 'error',
  CANCELLED: 'cancelled'
} as const;

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Processing result interface for comprehensive status tracking
 * 
 * Provides complete processing outcome information including
 * answer counts, status tracking, error details, and progress
 * monitoring for real-time document processing workflows.
 */
interface ProcessingResult {
  /** Number of answers successfully extracted from document */
  answersFound: number;
  /** Current processing status for workflow tracking */
  status: 'processing' | 'processed' | 'error';
  /** Error message for failed processing attempts */
  error?: string;
  /** Processing progress information for real-time updates */
  progress?: {
    /** Number of document chunks processed */
    chunksProcessed: number;
    /** Total number of chunks for processing */
    totalChunks: number;
  };
  /** Optional file identifier for tracking */
  fileId?: number;
}

/**
 * Custom error class for document processing failures
 * 
 * Extends standard Error with additional context for debugging
 * and comprehensive error tracking in enterprise workflows.
 */
class DocumentProcessingError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'DocumentProcessingError';
  }
}

// ========================================
// QUEUE MANAGEMENT
// ========================================

/**
 * Singleton processing queue manager for enterprise document workflows
 * 
 * Manages document processing queue with thread-safe operations,
 * progress tracking, and comprehensive error handling. Implements
 * singleton pattern for centralized queue management across the application.
 */
class ProcessingQueueManager {
  /** Singleton instance for centralized queue management */
  private static instance: ProcessingQueueManager;
  /** Processing state flag for concurrency control */
  private isProcessing = false;
  /** Document queue for ordered processing */
  private queue: number[] = [];
  /** Currently processing file identifier */
  private currentFileId: number | null = null;
  /** Progress callback for real-time updates */
  private onProgressCallback: ((result: ProcessingResult) => void) | null = null;

  /** Private constructor for singleton pattern */
  private constructor() {}

  /**
   * Get singleton instance with thread-safe initialization
   * 
   * @returns ProcessingQueueManager singleton instance
   */
  static getInstance(): ProcessingQueueManager {
    if (!ProcessingQueueManager.instance) {
      ProcessingQueueManager.instance = new ProcessingQueueManager();
    }
    return ProcessingQueueManager.instance;
  }

  /**
   * Set progress callback for real-time processing updates
   * 
   * @param callback Function to receive processing progress updates
   */
  setProgressCallback(callback: (result: ProcessingResult) => void): void {
    this.onProgressCallback = callback;
  }

  /**
   * Emit progress updates to registered callback handlers
   * 
   * @param status Current processing status
   * @param data Additional processing data for progress tracking
   */
  private emitProgress(status: ProcessingResult['status'], data: Partial<ProcessingResult> = {}): void {
    if (this.currentFileId && this.onProgressCallback) {
      this.onProgressCallback({
        fileId: this.currentFileId,
        answersFound: data.answersFound || 0,
        status,
        ...data
      });
    }
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
      // Format fields properly for processing
      const processResponse = await apiRequest('POST', `/api/documents/${this.currentFileId}/process`, {
        fields: this.cardFields.map(field => ({
          field_key: field.field_key,
          question: field.question,
          ai_search_instructions: field.ai_search_instructions
        }))
      });

      if (!processResponse.ok) {
        throw new Error(`Failed to start processing for file ${this.currentFileId}`);
      }

      const processData = await processResponse.json();

      // Initial progress update
      this.emitProgress('processing', {
        progress: {
          chunksProcessed: 0,
          totalChunks: processData.totalChunks
        }
      });

      // Poll for progress
      let isProcessing = true;
      while (isProcessing) {
        const progressResponse = await apiRequest('GET', `/api/documents/${this.currentFileId}/progress`);

        if (!progressResponse.ok) {
          throw new Error('Progress check failed');
        }

        const progressData = await progressResponse.json();

        this.emitProgress('processing', {
          answersFound: progressData.answersFound || 0,
          progress: progressData.progress
        });

        if (progressData.status === 'processed') {
          isProcessing = false;
          success = true;
          this.emitProgress('processed', {
            answersFound: progressData.answersFound || 0,
            progress: {
              chunksProcessed: progressData.progress.totalChunks,
              totalChunks: progressData.progress.totalChunks
            }
          });
        } else if (progressData.status === 'error') {
          throw new Error(progressData.error || 'Processing failed');
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

      this.emitProgress('error', {
        error: error instanceof Error ? error.message : 'Processing failed'
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

  // Store card fields for processing
  private cardFields: CardField[] = [];
  setCardFields(fields: CardField[]) {
    this.cardFields = fields;
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

    console.log('[DocumentProcessing] Starting processing:', {
      fileIds,
      fieldCount: cardFields.length,
      fieldKeys: cardFields.map(f => f.field_key),
      timestamp: new Date().toISOString()
    });

    const queueManager = ProcessingQueueManager.getInstance();
    queueManager.setProgressCallback(onProgress);
    queueManager.setCardFields(cardFields);

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

    const totalAnswersFound = results.reduce((sum, result) => sum + (result.answersFound || 0), 0);

    console.log('[DocumentProcessing] Processing complete:', {
      fileIds,
      totalAnswersFound,
      timestamp: new Date().toISOString()
    });

    return {
      answersFound: totalAnswersFound,
      status: 'processed'
    };

  } catch (error) {
    console.error('[DocumentProcessing] Processing error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });

    throw error;
  }
}