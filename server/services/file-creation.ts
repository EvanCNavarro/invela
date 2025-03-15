import { db } from '@db';
import { files } from '@db/schema';
import { eq } from 'drizzle-orm';
import { Logger } from '../utils/logger';

const logger = new Logger('FileCreationService');

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

export class FileCreationService {
  /**
   * Creates a file record with standardized error handling and logging
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

    try {
      logger.debug('Starting file creation', {
        fileName: name,
        fileType: type,
        userId,
        companyId
      });

      // Validate inputs
      if (!name || !content || !type || !userId || !companyId) {
        throw new Error('Missing required file creation parameters');
      }

      // Convert content to Buffer if it's a string
      const contentBuffer = typeof content === 'string' ? Buffer.from(content) : content;
      const fileSize = contentBuffer.length;

      // Create timestamp
      const timestamp = new Date();

      // Insert file record
      const [fileRecord] = await db.insert(files).values({
        name: name,
        size: fileSize,
        type: type,
        path: content.toString(),
        status: status,
        user_id: userId,
        company_id: companyId,
        upload_time: timestamp,
        created_at: timestamp,
        updated_at: timestamp,
        version: 1.0,
        download_count: 0
      }).returning();

      logger.info('File created successfully', {
        fileId: fileRecord.id,
        fileName: name,
        size: fileSize
      });

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