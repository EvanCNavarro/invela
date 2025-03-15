import { files } from '@db/schema';
import { db } from '@db';
import { z } from 'zod';

// Validation schema for file metadata
const fileMetadataSchema = z.object({
  taskType: z.enum(['company_kyb', 'company_card']),
  taskId: z.number(),
  companyName: z.string(),
  additionalData: z.record(z.unknown()).optional()
});

export type FileMetadata = z.infer<typeof fileMetadataSchema>;

interface FileCreationResult {
  success: boolean;
  fileId?: number;
  fileName?: string;
  error?: {
    message: string;
    details?: string;
  };
}

export class FileCreationService {
  private generateFileName(metadata: FileMetadata): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '');
    const taskType = metadata.taskType.replace('company_', '');
    const sanitizedCompanyName = metadata.companyName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `${taskType}_assessment_${sanitizedCompanyName}_${timestamp}.json`;
  }

  async createTaskFile(
    userId: number,
    companyId: number,
    content: any,
    metadata: FileMetadata
  ): Promise<FileCreationResult> {
    try {
      console.log('[FileCreation] Starting file creation:', {
        userId,
        companyId,
        metadata,
        timestamp: new Date().toISOString()
      });

      // Validate metadata
      const validatedMetadata = fileMetadataSchema.safeParse(metadata);
      if (!validatedMetadata.success) {
        console.error('[FileCreation] Metadata validation failed:', {
          errors: validatedMetadata.error.errors,
          timestamp: new Date().toISOString()
        });
        return {
          success: false,
          error: {
            message: 'Invalid file metadata',
            details: validatedMetadata.error.message
          }
        };
      }

      const fileName = this.generateFileName(metadata);
      const fileContent = JSON.stringify(content, null, 2);
      const timestamp = new Date();

      console.log('[FileCreation] Creating file record:', {
        fileName,
        contentLength: fileContent.length,
        timestamp: timestamp.toISOString()
      });

      // Create file record in database
      const [fileRecord] = await db.insert(files)
        .values({
          name: fileName,
          size: Buffer.from(fileContent).length,
          type: 'application/json',
          path: fileContent, // Store content directly in path field as per existing pattern
          status: 'uploaded',
          user_id: userId,
          company_id: companyId,
          created_at: timestamp,
          updated_at: timestamp,
          upload_time: timestamp,
          version: 1.0,
          download_count: 0
        })
        .returning();

      console.log('[FileCreation] File created successfully:', {
        fileId: fileRecord.id,
        fileName: fileRecord.name,
        timestamp: timestamp.toISOString()
      });

      return {
        success: true,
        fileId: fileRecord.id,
        fileName: fileRecord.name
      };

    } catch (error) {
      console.error('[FileCreation] Error creating file:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        error: {
          message: 'Failed to create file',
          details: error instanceof Error ? error.message : 'Unknown error occurred'
        }
      };
    }
  }
}

// Export singleton instance
export const fileCreationService = new FileCreationService();
