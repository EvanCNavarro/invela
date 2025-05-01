import { files } from '@db/schema';
import { db } from '@db';
import { z } from 'zod';
import getLogger from '../utils/logger';

// Set up logger
const logger = getLogger('FileCreationService');

// Validation schema for file metadata
const fileMetadataSchema = z.object({
  taskType: z.enum(['company_kyb', 'company_card', 'sp_ky3p_assessment', 'open_banking', 'open_banking_survey']),
  taskId: z.number(),
  companyName: z.string(),
  additionalData: z.record(z.unknown()).optional(),
  // Add originalType to support data forwarded from other endpoints
  originalType: z.string().optional()
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
  /**
   * Generate a standardized filename for form file exports
   * 
   * This method creates consistent, sanitized filenames for different form types
   * with proper naming conventions and timestamp formatting.
   * 
   * @param metadata FileMetadata object with taskType, companyName, etc.
   * @returns Sanitized filename with timestamp
   */
  private generateFileName(metadata: FileMetadata): string {
    // Create a consistent timestamp format
    const timestamp = new Date().toISOString().replace(/[:.]/g, '');
    
    // Sanitize the company name for safe filenames
    const sanitizedCompanyName = (metadata.companyName || 'company')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_') // Collapse multiple underscores
      .substring(0, 30); // Limit length
    
    // Remove the "company_" prefix from the task type if present
    const taskType = (metadata.taskType || '').replace('company_', '');
    
    // For KY3P assessments, create CSV files
    if (metadata.taskType === 'sp_ky3p_assessment') {
      return `spglobal_ky3p_security_assessment_${sanitizedCompanyName}_${timestamp}.csv`;
    }
    
    // For Open Banking assessments
    if (metadata.taskType === 'open_banking' || 
        metadata.taskType === 'open_banking_survey') {
      return `open_banking_survey_${sanitizedCompanyName}_${timestamp}.json`;
    }
    
    // Check originalType if provided (for form types passed from other handlers)
    if (metadata.originalType === 'open_banking' ||
        metadata.originalType === 'open_banking_survey') {
      return `open_banking_survey_${sanitizedCompanyName}_${timestamp}.json`;
    }
    
    // Default to JSON for other assessment types
    return `${taskType}_assessment_${sanitizedCompanyName}_${timestamp}.json`;
  }
  
  /**
   * Convert form data to CSV format for KY3P assessments
   * 
   * This method transforms form data and field definitions into a properly formatted CSV file
   * with consistent field ordering, numbering, and proper CSV escaping.
   * 
   * @param data - The form data to convert to CSV format
   * @param fields - Optional array of field definitions with metadata
   * @returns Formatted CSV string with headers and data rows
   */
  private generateCSV(data: Record<string, any>, fields: any[] = []): string {
    logger.info('Generating CSV for KY3P assessment');
    
    // Create CSV header in KYB format
    let csv = 'Question Number,Group,Question,Answer,Type\n';
    
    // Create a field key map for easier lookup
    const fieldMap = new Map();
    if (Array.isArray(fields)) {
      logger.info(`Processing ${fields.length} fields for CSV generation`);
      
      // Sort fields by order to ensure consistent question numbering
      const sortedFields = [...fields].sort((a, b) => (a.order || 0) - (b.order || 0));
      
      sortedFields.forEach((field, idx) => {
        // Handle different field key properties based on the schema
        // KY3P fields use field_key in the database schema
        const key = field.field_key || field.key;
        if (key) {
          // Add index to field for question numbering
          fieldMap.set(key, { ...field, index: idx + 1 });
        } else {
          logger.warn(`Field missing both field_key and key properties:`, { field });
        }
      });
    }
    
    logger.info('Field map created for CSV generation', {
      fieldMapSize: fieldMap.size,
      dataKeysCount: Object.keys(data).length
    });
    
    // Get sorted list of fields for consistent order
    let sortedFieldKeys: string[] = [];
    
    // Ensure we process ALL fields in correct order, not just those in the data object
    if (Array.isArray(fields) && fields.length > 0) {
      // Create a sorted list of all field keys from field definitions
      sortedFieldKeys = fields
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(field => field.field_key || field.key)
        .filter(key => !!key); // Filter out any undefined keys
        
      logger.info(`Using ${sortedFieldKeys.length} sorted field keys for CSV generation`);
    } else {
      // Fallback to using keys from data object if field definitions aren't available
      sortedFieldKeys = Object.keys(data);
      logger.info(`No field definitions available, using ${sortedFieldKeys.length} data keys`);
    }
    
    // Track which keys we've already processed
    const processedKeys = new Set<string>();
    
    // Process fields in correct order
    for (const key of sortedFieldKeys) {
      // Skip if we've already processed this key (shouldn't happen with sorted unique keys)
      if (processedKeys.has(key)) continue;
      
      // Mark this key as processed
      processedKeys.add(key);
      
      // Get the value from data object if it exists (otherwise empty string)
      const value = data[key] ?? '';
      
      // Find field metadata if available
      const field = fieldMap.get(key);
      
      // Handle various field schema possibilities - KY3P fields use group/section differently
      const group = field?.group || '';
      // Determine the field type (default to TEXT if not specified)
      const fieldType = field?.field_type || 'TEXT';
      // Ensure we get the question text from various possible field names
      const question = field?.question || field?.display_name || field?.label || key;
      // Use the index from the field map or just incremental order
      const questionNumber = field?.index || sortedFieldKeys.indexOf(key) + 1 || '?';
      
      // Escape quotes in CSV fields
      const escapedQuestionNumber = String(questionNumber).replace(/"/g, '""');
      const escapedQuestion = question.replace(/"/g, '""');
      const escapedValue = String(value ?? '').replace(/"/g, '""');
      const escapedGroup = group.replace(/"/g, '""');
      const escapedType = fieldType.toUpperCase().replace(/"/g, '""');
      
      // Add row with KYB format: Question Number,Group,Question,Answer,Type
      csv += `"${escapedQuestionNumber}","${escapedGroup}","${escapedQuestion}","${escapedValue}","${escapedType}"\n`;
    }
    
    // Log the final CSV size
    logger.info(`Final CSV contains ${csv.split('\n').length - 1} rows`);
    
    return csv;
  }

  /**
   * Creates a file for a task - KYB, KY3P or other form task
   * 
   * This method handles special case for KY3P CSV files to ensure
   * they are properly stored in the database and can be downloaded later.
   * 
   * The method has been enhanced with better error handling and logging.
   * 
   * @param userId - The ID of the user creating the file
   * @param companyId - The ID of the company the file belongs to
   * @param content - The form data content to store in the file
   * @param metadata - Metadata about the file (taskType, taskId, etc.)
   * @returns A promise resolving to the file creation result
   */
  async createTaskFile(
    userId: number,
    companyId: number,
    content: any,
    metadata: FileMetadata
  ): Promise<FileCreationResult> {
    try {
      logger.info('Starting file creation', {
        userId,
        companyId,
        taskType: metadata.taskType,
        taskId: metadata.taskId,
        timestamp: new Date().toISOString()
      });

      // Validate metadata
      const validatedMetadata = fileMetadataSchema.safeParse(metadata);
      if (!validatedMetadata.success) {
        logger.error('Metadata validation failed', {
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
        // Extract fields from additionalData safely
        const fields = metadata.additionalData?.fields;
        // Convert fields to array if necessary
        const fieldsArray = Array.isArray(fields) ? fields : [];
        
        fileContent = this.generateCSV(content, fieldsArray);
        contentType = 'text/csv';
        
        logger.info('Generated CSV content for KY3P assessment', {
          contentLength: fileContent.length,
          fieldsCount: fieldsArray.length
        });
      } else {
        // For other types, use JSON
        fileContent = JSON.stringify(content, null, 2);
        contentType = 'application/json';
      }
      
      const timestamp = new Date();

      logger.info('Creating file record', {
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
      
      // Open Banking file handling - standardize JSON format
      if (metadata.taskType === 'open_banking' || metadata.taskType === 'open_banking_survey' ||
          metadata.originalType === 'open_banking' || metadata.originalType === 'open_banking_survey') {
        logger.info('Processing Open Banking file content');
        // Ensure we have a proper JSON structure with all required fields
        if (typeof content === 'object' && content !== null) {
          // Add standard metadata fields if needed
          if (!content.metadata) {
            // Create a metadata object with the task details
            const contentMetadata = {
              taskId: metadata.taskId,
              companyName: metadata.companyName,
              taskType: metadata.taskType || metadata.originalType,
              timestamp: timestamp.toISOString()
            };
            
            // Add metadata to content object
            content = { ...content, metadata: contentMetadata };
            
            // Re-stringify with the added metadata
            fileContent = JSON.stringify(content, null, 2);
            
            logger.info('Added metadata to Open Banking file content');
          }
        }
      }
      
      try {
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

        logger.info('File created successfully', {
          fileId: fileRecord.id,
          fileName: fileRecord.name,
          companyId: companyId,
          timestamp: timestamp.toISOString()
        });
        
        // Broadcast file vault update to notify clients of the new file
        try {
          logger.info('Broadcasting file vault update', {
            companyId: companyId,
            fileId: fileRecord.id,
            action: 'added'
          });
          
          // Broadcast the update
          broadcastFileVaultUpdate(companyId, fileRecord.id, 'added');
          
          // Also broadcast a generic refresh message to ensure all clients update
          setTimeout(() => {
            broadcastFileVaultUpdate(companyId, undefined, 'refresh');
          }, 500);
        } catch (broadcastError) {
          // Don't fail the file creation if broadcasting fails
          logger.error('Error broadcasting file vault update', {
            error: broadcastError,
            message: broadcastError instanceof Error ? broadcastError.message : 'Unknown broadcast error',
            companyId,
            fileId: fileRecord.id
          });
        }

        return {
          success: true,
          fileId: fileRecord.id,
          fileName: fileRecord.name
        };
      } catch (dbError) {
        // Specific error handler for database errors
        logger.error('Database error creating file', {
          error: dbError,
          message: dbError instanceof Error ? dbError.message : 'Unknown database error',
          timestamp: new Date().toISOString()
        });
        
        return {
          success: false,
          error: {
            message: 'Failed to create file in database',
            details: dbError instanceof Error ? dbError.message : 'Unknown database error'
          }
        };
      }
    } catch (error) {
      logger.error('Error creating file', {
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
