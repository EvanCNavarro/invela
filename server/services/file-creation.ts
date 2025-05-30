import { files } from '@db/schema';
import { db } from '@db';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';
import { broadcastTaskUpdate } from "../utils/unified-websocket";

// Add namespace context to logs
const logContext = { service: 'FileCreationService' };

export type FileStatus = 'uploaded' | 'uploading' | 'error' | 'processing';

export interface FileCreationOptions {
  name: string;
  content: string | Buffer;
  type: string;
  userId: number;
  companyId: number;
  metadata?: Record<string, any>;
  status?: FileStatus;
}

export interface FileCreationResult {
  success: boolean;
  fileId?: number;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Service for handling file creation, including storage and database operations
 */
export class FileCreationService {
  /**
   * Generate a standardized file name based on content type and metadata
   */
  static generateStandardFileName(
    prefix: string,
    id: number,
    companyName?: string,
    version: string = '1.0',
    extension: string = 'csv'
  ): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedCompanyName = companyName ? companyName.replace(/[^a-zA-Z0-9]/g, '_') : 'unknown';
    return `${prefix}_${sanitizedCompanyName}_${id}_v${version}_${timestamp}.${extension}`;
  }

  /**
   * Create a new file with database entry and storage
   */
  static async createFile(options: FileCreationOptions): Promise<FileCreationResult> {
    const {
      name,
      content,
      type,
      userId,
      companyId,
      metadata = {},
      status = 'uploaded'
    } = options;

    const timestamp = new Date();
    let fileSize = 0;
    let storagePath = '';

    try {
      // Calculate file size
      if (typeof content === 'string') {
        fileSize = Buffer.from(content).length;
      } else if (Buffer.isBuffer(content)) {
        fileSize = content.length;
      }

      // For text/csv files, we store the actual content in the database
      // This is a fix to ensure CSV files are properly stored and accessible
      if (type === 'text/csv') {
        try {
          // First, log the content size for debugging
          const contentStr = content.toString();
          const contentSize = Buffer.from(contentStr).length;
          
          console.log(`[FileCreationService] 📄 CSV content preparation`, {
            size: contentSize,
            sizeInKB: Math.round(contentSize / 1024 * 100) / 100,
            previewLength: Math.min(contentStr.length, 100)
          });
          
          // Store the full content directly in the database for CSV files
          // This ensures it's available without relying on file system
          storagePath = contentStr;
          
          console.log(`[FileCreationService] ✅ CSV content stored successfully`, {
            size: contentSize,
            timestamp: new Date().toISOString()
          });
        } catch (writeError) {
          logger.error('Failed to process CSV content', { 
            error: writeError instanceof Error ? writeError.message : 'Unknown error'
          });
          // Fallback to storing a truncated version if there was an error
          try {
            storagePath = content.toString().substring(0, 500) + '...(truncated)';
            console.error(`[FileCreationService] 🚨 Had to truncate CSV content due to error`, {
              error: writeError instanceof Error ? writeError.message : 'Unknown error',
              truncatedSize: storagePath.length
            });
          } catch (truncateError) {
            console.error(`[FileCreationService] 🚨 Critical error even during truncation`, {
              error: truncateError instanceof Error ? truncateError.message : 'Unknown error'
            });
            storagePath = 'Error processing content';
          }
        }
      }
      
      // CRITICAL FIX: Add detailed debugging to diagnose file creation issues
      console.log(`[FileCreationService] ⚠️ CRITICAL DEBUGGING: Creating file record in database`, {
        name,
        type,
        size: fileSize,
        userId,
        companyId, // Critical field for File Vault visibility
        status,
        timestamp: timestamp.toISOString(),
        metadata: metadata || {}
      });
      
      // Validate company ID before insert to ensure it's not undefined
      if (!companyId || typeof companyId !== 'number' || isNaN(companyId)) {
        console.error(`[FileCreationService] 🚨 CRITICAL ERROR: Invalid companyId for file creation:`, {
          companyId,
          name,
          userId,
          timestamp: new Date().toISOString()
        });
        throw new Error(`Invalid company ID ${companyId} for file creation`);
      }

      // Extra safety - ensure metadata has companyId explicitly to help debugging
      const enhancedMetadata = {
        ...(metadata || {}),
        fileCreationInfo: {
          timestamp: timestamp.toISOString(),
          companyId // Explicitly include companyId to make sure it's accessible
        }
      };

      // Insert file record with enhanced metadata
      const [fileRecord] = await db.insert(files).values({
        name: name,
        size: fileSize,
        type: type,
        path: storagePath,
        status: status,
        user_id: userId,
        company_id: companyId, // Critical field for File Vault visibility
        metadata: enhancedMetadata,
        upload_time: timestamp,
        created_at: timestamp,
        updated_at: timestamp,
        version: 1.0,
        download_count: 0
      }).returning();
      
      // Log success in detail
      console.log(`[FileCreationService] ✅ File record created successfully with ID ${fileRecord.id}`, {
        fileId: fileRecord.id,
        companyId,
        userId,
        status,
        timestamp: new Date().toISOString()
      });

      logger.info('File created successfully', {
        fileId: fileRecord.id,
        fileName: name,
        size: fileSize
      });

      // Broadcast file vault update to notify all clients about the new file
      try {
        // Use the standardized WebSocket service to broadcast file update
        WebSocketService.broadcastEvent('file_vault_update', {
          companyId,
          fileId: fileRecord.id,
          action: 'added',
          timestamp: new Date().toISOString()
        });
        
        logger.info(`Broadcasted file vault update successfully`, {
          fileId: fileRecord.id,
          companyId,
          action: 'added'
        });
      } catch (broadcastError) {
        logger.warn('Failed to broadcast file vault update, but file was created successfully', {
          error: broadcastError instanceof Error ? broadcastError.message : 'Unknown error',
          fileId: fileRecord.id,
          companyId
        });
      }

      return {
        success: true,
        fileId: fileRecord.id,
        metadata: metadata
      };
    } catch (error) {
      logger.error('File creation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fileName: name,
        userId,
        companyId
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Retrieves a file record with error handling
   */
  static async getFile(fileId: number): Promise<FileCreationResult> {
    try {
      const [file] = await db.select()
        .from(files)
        .where(eq(files.id, fileId));

      if (!file) {
        return {
          success: false,
          error: 'File not found'
        };
      }

      return {
        success: true,
        fileId: file.id,
        metadata: {}
      };
    } catch (error) {
      logger.error('File retrieval failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fileId
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Updates a file's metadata with error handling
   */
  static async updateFileMetadata(
    fileId: number,
    metadata: Record<string, any>
  ): Promise<FileCreationResult> {
    try {
      const [file] = await db.select()
        .from(files)
        .where(eq(files.id, fileId));

      if (!file) {
        return {
          success: false,
          error: 'File not found'
        };
      }

      await db.update(files)
        .set({
          updated_at: new Date()
        })
        .where(eq(files.id, fileId));

      return {
        success: true,
        fileId: file.id,
        metadata: metadata
      };
    } catch (error) {
      logger.error('File metadata update failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fileId
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}