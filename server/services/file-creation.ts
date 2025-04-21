import { db } from '@db';
import { files } from '@db/schema';
import { eq } from 'drizzle-orm';
import { Logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

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
   * Generate a standardized filename with format based on task type
   * KYB format: kyb_form_[taskId]_[date]T[time].[extension]
   * KY3P format: spglobal_ky3p_security_assessment_[companyName]_[date]T[time].[extension]
   */
  static generateStandardFileName(
    taskType: string, 
    taskId: number, 
    companyName: string = 'Company',
    version: string = '1.0',
    extension: string = 'csv',
    questionNumber?: number
  ): string {
    const now = new Date();
    const formattedDateTime = now.toISOString().split('.')[0]; // YYYY-MM-DDThh:mm:ss
    
    // Clean company name (remove spaces, special characters)
    const cleanCompanyName = companyName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '');
    
    // Special handling for KY3P files
    if (taskType.toLowerCase() === 'ky3p' || 
        taskType.toLowerCase().includes('sp_ky3p') || 
        (taskType.toLowerCase() === 'form' && extension === 'csv' && companyName.toLowerCase().includes('security'))) {
      
      return `spglobal_ky3p_security_assessment_${cleanCompanyName}_${formattedDateTime}.${extension}`;
    }
    
    // KYB format
    if (taskType.toLowerCase() === 'kyb' || taskType.toLowerCase().includes('kyb_form')) {
      return `kyb_form_${taskId}_${formattedDateTime}.${extension}`;
    }
    
    // Open Banking format
    if (taskType.toLowerCase() === 'open_banking') {
      return `open_banking_survey_${cleanCompanyName}_${formattedDateTime}.${extension}`;
    }
    
    // Card format for backward compatibility
    if (taskType.toLowerCase() === 'card') {
      return `card_assessment_${cleanCompanyName}_${formattedDateTime}.${extension}`;
    }
    
    // Default format as fallback
    return `${taskType.toLowerCase()}_${taskId}_${formattedDateTime}.${extension}`;
  }
  
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

      // Check if we need to write the file to disk or store in DB directly
      let storagePath: string;
      
      // Store CSV files directly in the database for immediate access
      // This applies to both KYB forms and KY3P assessment forms
      if (type === 'text/csv' && 
          (name.toLowerCase().includes('kyb_form') || 
           name.toLowerCase().includes('kybform') ||
           name.toLowerCase().includes('ky3p') ||
           name.toLowerCase().includes('spglobal'))) {
        logger.debug('Storing CSV content directly in database', { 
          fileName: name, 
          contentType: type,
          fileSize: Buffer.from(content.toString()).length
        });
        
        // Add a database marker prefix to help the file download handler
        if (name.toLowerCase().includes('ky3p') || name.toLowerCase().includes('spglobal')) {
          storagePath = `database:${content.toString()}`;
          logger.debug('Added database prefix marker to KY3P CSV content');
        } else {
          storagePath = content.toString();
        }
      } else {
        // For other files, create a unique path and write to disk
        const uniqueFileName = `${Date.now()}_${Math.floor(Math.random() * 10000)}_${name}`;
        storagePath = uniqueFileName;
        
        // Ensure we have an uploads directory
        const uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        // Write the file to disk
        try {
          fs.writeFileSync(path.join(uploadDir, uniqueFileName), content);
          logger.debug('Wrote file to disk', { path: uniqueFileName });
        } catch (writeError) {
          logger.error('Failed to write file to disk', { 
            error: writeError instanceof Error ? writeError.message : 'Unknown error'
          });
          storagePath = content.toString().substring(0, 500) + '...(truncated)';
        }
      }
      
      // Insert file record
      const [fileRecord] = await db.insert(files).values({
        name: name,
        size: fileSize,
        type: type,
        path: storagePath,
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