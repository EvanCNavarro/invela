/**
 * Unified File Creation Service
 * 
 * This service provides standardized file creation, naming, and handling
 * across all assessment types (KYB, KY3P, Open Banking, CARD).
 */

import { db } from "@db";
import { files } from "@db/schema";
import { eq } from "drizzle-orm";
import path from 'path';
import fs from 'fs';
import { FileDetectionService } from './file-detection';

export type FileStatus = 'uploaded' | 'uploading' | 'error' | 'processing' | 'processed';

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

export interface FileNameOptions {
  assessmentType: string;
  companyName: string;
  taskId: number;
  originalName: string;
  format: string;
}

export class FileCreationService {
  /**
   * Generate a standardized filename with a unified format for all assessment types
   * Format: [assessment_type]_[company_name]_[taskId]_[timestamp].[extension]
   */
  static generateStandardFileName(options: FileNameOptions): string {
    const { assessmentType, companyName, taskId, originalName, format } = options;
    
    // Sanitize company name for filename (remove special chars, limit length)
    const sanitizedCompanyName = companyName
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 30);
    
    // Standardize assessment type names
    const assessmentTypeMap = {
      'kyb': 'kyb_assessment',
      'ky3p': 'spglobal_ky3p_assessment',
      'open_banking': 'open_banking_assessment',
      'card': 'card_assessment',
      'form': 'form'
    };
    
    // Get standardized type or use the original if not in map
    const standardizedType = assessmentTypeMap[assessmentType.toLowerCase()] || assessmentType;
    
    // Generate timestamp
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
    
    // Determine extension based on format or original file
    let extension = format || 'csv';
    if (extension === 'form') extension = 'csv';
    
    // Create standardized filename
    return `${standardizedType}_${sanitizedCompanyName}_${taskId || 0}_${timestamp}.${extension}`;
  }

  /**
   * Creates a file record with standardized error handling and logging
   */
  static async createFile(options: FileCreationOptions): Promise<FileCreationResult> {
    try {
      console.log('[FileCreation] Creating file:', {
        name: options.name,
        type: options.type,
        size: options.content.length,
        userId: options.userId,
        companyId: options.companyId,
        timestamp: new Date().toISOString()
      });
      
      // Detect assessment type
      const detection = FileDetectionService.detectAssessmentType(
        options.name,
        options.metadata?.path || ''
      );

      // Set metadata with assessment type information
      const enhancedMetadata = {
        ...options.metadata,
        assessmentType: detection.assessmentType,
        fileDetection: {
          isKyb: detection.isKyb,
          isKy3p: detection.isKy3p, 
          isOpenBanking: detection.isOpenBanking,
          isCard: detection.isCard,
          detectedAt: new Date().toISOString()
        }
      };
      
      // Create upload directory if needed
      const uploadDir = path.join(process.cwd(), 'uploads', 'documents');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      // Generate a unique filename
      const filename = `${Date.now()}_${options.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = path.join(uploadDir, filename);
      
      // Write file to disk
      await fs.promises.writeFile(filePath, options.content);
      
      // Create file record in database
      const [fileRecord] = await db.insert(files)
        .values({
          name: options.name,
          path: filename,
          type: options.type,
          size: Buffer.isBuffer(options.content) ? options.content.length : options.content.length,
          user_id: options.userId,
          company_id: options.companyId,
          status: options.status || 'uploaded',
          created_at: new Date(),
          updated_at: new Date(),
          upload_time: new Date(),
          download_count: 0,
          version: 1,
          metadata: enhancedMetadata
        })
        .returning();
      
      console.log('[FileCreation] File created successfully:', {
        fileId: fileRecord.id,
        name: fileRecord.name,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        fileId: fileRecord.id,
        metadata: fileRecord.metadata
      };
    } catch (error) {
      console.error('[FileCreation] Error creating file:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during file creation'
      };
    }
  }

  /**
   * Retrieves a file record with error handling
   */
  static async getFile(fileId: number): Promise<FileCreationResult> {
    try {
      const fileRecord = await db.query.files.findFirst({
        where: eq(files.id, fileId)
      });
      
      if (!fileRecord) {
        return {
          success: false,
          error: `File with ID ${fileId} not found`
        };
      }
      
      return {
        success: true,
        fileId: fileRecord.id,
        metadata: fileRecord.metadata
      };
    } catch (error) {
      console.error('[FileCreation] Error retrieving file:', {
        fileId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred retrieving file'
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
      // Get current metadata
      const fileRecord = await db.query.files.findFirst({
        where: eq(files.id, fileId)
      });
      
      if (!fileRecord) {
        return {
          success: false,
          error: `File with ID ${fileId} not found`
        };
      }
      
      // Merge with existing metadata
      const updatedMetadata = {
        ...fileRecord.metadata,
        ...metadata,
        lastUpdated: new Date().toISOString()
      };
      
      // Update database
      await db.update(files)
        .set({
          metadata: updatedMetadata,
          updated_at: new Date()
        })
        .where(eq(files.id, fileId));
      
      return {
        success: true,
        fileId,
        metadata: updatedMetadata
      };
    } catch (error) {
      console.error('[FileCreation] Error updating file metadata:', {
        fileId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred updating file metadata'
      };
    }
  }
}