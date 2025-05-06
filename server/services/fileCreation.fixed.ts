/**
 * File Creation Service
 * 
 * This module provides functions for creating files from form data.
 * It standardizes file creation across different form types.
 * 
 * @module fileCreation
 */

import { db } from '@db';
import { files } from '@db/schema';
import { logger } from '../utils/logger';

/**
 * Options for file creation
 */
export interface FileCreationOptions {
  name: string;
  content: string;
  type: string;
  userId: number;
  companyId: number;
  metadata?: Record<string, any>;
  status?: string;
}

/**
 * Result of file creation
 */
export interface FileCreationResult {
  success: boolean;
  fileId?: number;
  fileName?: string;
  error?: string;
}

/**
 * Create a file in the database
 * 
 * @param options File creation options
 * @returns File creation result
 */
export async function createFile(options: FileCreationOptions): Promise<FileCreationResult> {
  try {
    logger.info(`Creating file: ${options.name}`, {
      companyId: options.companyId,
      userId: options.userId,
      fileType: options.type,
      fileSize: options.content ? Buffer.from(options.content).length : 0
    });
    
    // Log the file creation attempt
    console.log(`[FileCreation] Creating file for company ${options.companyId} by user ${options.userId}`, {
      fileName: options.name,
      fileType: options.type,
      fileSize: options.content ? Buffer.from(options.content).length : 0,
      timestamp: new Date().toISOString()
    });
    
    // CRITICAL FIX: Match DB schema column names
    // The schema uses user_id, not created_by/updated_by
    const result = await db.insert(files)
      .values({
        name: options.name,
        path: options.content,
        type: options.type,
        status: options.status || 'uploaded',
        company_id: options.companyId,
        user_id: options.userId, // Changed from created_by to match schema
        created_at: new Date(),
        updated_at: new Date(),
        size: options.content ? Buffer.from(options.content).length : 0,
        version: 1,
        metadata: options.metadata || {}
      })
      .returning({ id: files.id });
    
    if (!result || result.length === 0) {
      throw new Error('Failed to insert file');
    }
    
    const fileId = result[0].id;
    
    logger.info('File created successfully', {
      fileId,
      fileName: options.name,
      companyId: options.companyId
    });
    
    return {
      success: true,
      fileId,
      fileName: options.name
    };
  } catch (error) {
    logger.error('Error creating file', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      fileName: options.name,
      companyId: options.companyId
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Create a file from form data
 * 
 * This function creates a file in the database based on form data.
 * It handles different form types and generates appropriate file content.
 * 
 * @param taskId The ID of the task associated with the file
 * @param formType The type of form (e.g., 'kyb', 'ky3p', 'open_banking')
 * @param formData The form data to use for file creation
 * @param companyId The ID of the company the file belongs to
 * @param userId The ID of the user creating the file
 * @returns The result of the file creation operation
 */
export async function createTaskFile(
  taskId: number,
  formType: string,
  formData: Record<string, any>,
  companyId: number,
  userId: number
): Promise<FileCreationResult> {
  try {
    // Standardize form type to lowercase
    const normalizedFormType = formType.toLowerCase();
    
    // Generate file content based on form type
    let content = '';
    let fileType = 'text/csv';
    
    // Convert form data to proper CSV format with more detailed data
    
    // Enhanced data processing for CSV to include all field data
    // First, organize data by sections and questions
    console.log(`[FileCreation] Processing data for form type ${normalizedFormType} with ${Object.keys(formData).length} fields`);
    
    // RESTRUCTURED FORMAT: Create a tabular CSV with one field per row
    // This format is more readable and easier to analyze
    
    // First create metadata row for the task
    const metadata = {
      taskId,
      formType: normalizedFormType,
      companyId,
      submissionDate: new Date().toISOString()
    };
    
    // Define the CSV structure with headers
    const headers = ['question', 'answer', 'id', 'fieldKey'];
    
    // Start building rows with the CSV header
    let rows = [headers.join(',')];
    
    // First add form metadata as rows
    Object.entries(metadata).forEach(([key, value]) => {
      const rowValues = [
        `"Form Metadata: ${key}"`,  // question column
        `"${String(value).replace(/"/g, '""')}"`,  // answer column
        `"meta_${key}"`,  // id column
        `"${key}"`  // fieldKey column
      ];
      rows.push(rowValues.join(','));
    });
    
    // Then add each form field as a row
    Object.entries(formData).forEach(([key, value]) => {
      // Format the value based on its type
      let formattedValue;
      if (typeof value === 'object' && value !== null) {
        // For object values, stringify them to preserve their data
        formattedValue = JSON.stringify(value);
      } else if (value === undefined || value === null) {
        // Make empty values explicit for better CSV output
        formattedValue = '';
      } else {
        formattedValue = String(value);
      }
      
      // Create a row with the field data
      const rowValues = [
        `"${key}"`,  // question column
        `"${formattedValue.replace(/"/g, '""')}"`,  // answer column
        `"field_${key}"`,  // id column
        `"${key}"`  // fieldKey column
      ];
      rows.push(rowValues.join(','));
    });
    
    // Join all rows to create the CSV content
    content = rows.join('\n');
    
    console.log(`[FileCreation] Created tabular CSV file with ${rows.length - 1} rows for task ${taskId}`);
    
    // Log a sample of the data for debugging
    console.log(`[FileCreation] CSV file created with ${rows.length - 1} fields:`, {
      rowCount: rows.length,
      headerRow: headers,
      contentLength: content.length,
      timestamp: new Date().toISOString()
    });
    
    // Also save JSON version as a backup
    const jsonBackup = JSON.stringify(formData, null, 2);
    console.log(`[FileCreation] Created CSV file for task ${taskId}`);
    
    // Generate file name
    const fileName = generateStandardFileName(
      normalizedFormType,
      taskId,
      companyId,
      '1.0'
    );
    
    // Add enhanced metadata for better file discovery and task integration
    // These metadata fields are used by the status determination function
    // to detect if a task has been submitted and preserve its status
    const enhancedMetadata = {
      taskId,
      taskType: normalizedFormType,
      submissionDate: new Date().toISOString(),
      formType: normalizedFormType,
      formSubmission: true,  // Flag to indicate this is a form submission file
      fieldCount: Object.keys(formData).length,
      fileName: fileName,
      version: '1.0',
      jsonBackup: jsonBackup  // Store JSON backup in metadata for recovery if needed
    };

    // Log metadata for debugging
    console.log(`[FileCreation] Creating file with metadata for task ${taskId}:`, {
      taskId,
      formType: normalizedFormType,
      fileName,
      metadataFields: Object.keys(enhancedMetadata)
    });
    
    // Create the file with enhanced metadata
    return await createFile({
      name: fileName,
      content,
      type: fileType,
      userId,
      companyId,
      metadata: enhancedMetadata,
      status: 'uploaded'
    });
  } catch (error) {
    logger.error('Error creating task file', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      taskId,
      formType,
      companyId
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generate a standard file name for a form submission
 * 
 * @param formType The type of form (e.g., 'kyb', 'ky3p', 'open_banking')
 * @param taskId The ID of the task
 * @param companyIdOrName Company ID or name
 * @param version Version of the form
 * @param extension File extension (default: 'csv')
 * @returns Generated file name
 */
export function generateStandardFileName(
  formType: string,
  taskId: number,
  companyIdOrName: number | string | undefined,
  version: string = '1.0',
  extension: string = 'csv'
): string {
  // Normalize form type
  const normalizedFormType = formType.replace(/[^a-zA-Z0-9]/g, '');
  
  // Format company name/id
  const companyPart = companyIdOrName ? `_${companyIdOrName}` : '';
  
  // Create timestamp
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').substring(0, 14);
  
  // Generate file name
  return `${normalizedFormType}_${taskId}${companyPart}_v${version}_${timestamp}.${extension}`;
}
