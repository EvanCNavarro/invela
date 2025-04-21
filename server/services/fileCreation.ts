import { files } from '@db/schema';
import { db } from '@db';
import { z } from 'zod';

// Validation schema for file metadata
const fileMetadataSchema = z.object({
  taskType: z.enum(['company_kyb', 'company_card', 'sp_ky3p_assessment']),
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
    
    // For KY3P assessments, create CSV files
    if (metadata.taskType === 'sp_ky3p_assessment') {
      return `spglobal_ky3p_security_assessment_${sanitizedCompanyName}_${timestamp}.csv`;
    }
    
    // Default to JSON for other assessment types
    return `${taskType}_assessment_${sanitizedCompanyName}_${timestamp}.json`;
  }
  
  // Convert form data to CSV format for KY3P assessments
  private generateCSV(data: Record<string, any>, fields: any[] = []): string {
    console.log('[FileCreation] Generating CSV for KY3P assessment');
    
    // Create CSV header
    let csv = 'Question,Answer,Group,Section\n';
    
    // Create a field key map for easier lookup
    const fieldMap = new Map();
    if (Array.isArray(fields)) {
      console.log(`[FileCreation] Processing ${fields.length} fields for CSV generation`);
      
      // Log a sample field to debug schema
      if (fields.length > 0) {
        console.log('[FileCreation] Sample field structure:', 
          JSON.stringify(fields[0], null, 2).substring(0, 500)); // Limit output size
      }
      
      fields.forEach(field => {
        // Handle different field key properties based on the schema
        // KY3P fields use field_key in the database schema
        const key = field.field_key || field.key;
        if (key) {
          fieldMap.set(key, field);
        } else {
          console.warn('[FileCreation] Field missing both field_key and key properties:', field);
        }
      });
    }
    
    console.log(`[FileCreation] Field map created with ${fieldMap.size} entries`);
    
    // Add data rows
    for (const [key, value] of Object.entries(data)) {
      // Skip empty fields
      if (!value || value === '') continue;
      
      // Find field metadata if available
      const field = fieldMap.get(key);
      
      // Log field data if debugging
      if (field && process.env.NODE_ENV !== 'production') {
        console.log(`[FileCreation] Processing field ${key}:`, {
          fieldKeys: Object.keys(field).join(', '),
          fieldId: field.id,
          fieldKey: field.field_key || field.key
        });
      }
      
      // Handle various field schema possibilities - KY3P fields use group/section differently
      const group = field?.group || '';
      // Some schemas use section, others use step_index
      const section = field?.section || (field?.step_index ? `Step ${field.step_index}` : '');
      // Ensure we get the question text from various possible field names
      const question = field?.question || field?.display_name || field?.label || key;
      
      // Escape quotes in CSV fields
      const escapedQuestion = question.replace(/"/g, '""');
      const escapedValue = String(value).replace(/"/g, '""');
      const escapedGroup = group.replace(/"/g, '""');
      const escapedSection = section.replace(/"/g, '""');
      
      // Add row
      csv += `"${escapedQuestion}","${escapedValue}","${escapedGroup}","${escapedSection}"\n`;
    }
    
    return csv;
  }

  /**
   * Creates a file for a task - KYB, KY3P or other form task
   * This method handles special case for KY3P CSV files to ensure
   * they are properly stored in the database and can be downloaded later.
   */
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
      let fileContent: string;
      let contentType: string;
      
      // Generate content based on file type
      if (metadata.taskType === 'sp_ky3p_assessment') {
        // For KY3P assessments, generate CSV content
        fileContent = this.generateCSV(content, metadata.additionalData?.fields);
        contentType = 'text/csv';
        
        console.log('[FileCreation] Generated CSV content for KY3P assessment', {
          contentLength: fileContent.length,
          fieldsCount: metadata.additionalData?.fields?.length || 0
        });
      } else {
        // For other types, use JSON
        fileContent = JSON.stringify(content, null, 2);
        contentType = 'application/json';
      }
      
      const timestamp = new Date();

      console.log('[FileCreation] Creating file record:', {
        fileName,
        contentType,
        contentLength: fileContent.length,
        timestamp: timestamp.toISOString()
      });

      // For KY3P assessments, prepend a database marker to the content
      // This helps the file download handler identify it as inline content
      if (metadata.taskType === 'sp_ky3p_assessment') {
        fileContent = `database:${fileContent}`;
      }
      
      // Create file record in database
      const [fileRecord] = await db.insert(files)
        .values({
          name: fileName,
          size: Buffer.from(fileContent).length,
          type: contentType,
          path: fileContent, // Store content directly in path field as per existing pattern
          status: 'uploaded',
          user_id: userId,
          company_id: companyId,
          created_at: timestamp,
          updated_at: timestamp,
          upload_time: timestamp,
          version: 1.0,
          download_count: 0,
          metadata: {
            taskId: metadata.taskId,
            taskType: metadata.taskType,
            companyName: metadata.companyName
          }
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
