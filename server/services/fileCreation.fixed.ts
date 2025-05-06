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
    
    logger.info(`Creating file for ${normalizedFormType} task ${taskId}`, { taskId, normalizedFormType });
    
    // Define headers for our CSV
    const headers = ['id', 'question', 'response', 'field_key', 'timestamp'];
    
    // Create rows array starting with headers
    let rows = [headers.join(',')];
    
    // Create current date for all rows
    const submissionDate = new Date().toISOString();
    
    // ─── STEP 1: FETCH RESPONSES ────────────────────────────────────────
    // First, get all responses directly without JOIN to avoid complexity
    const { pool } = require('../db');
    
    let responseQuery;
    let fieldQuery;
    let responseTable;
    let fieldTable;
    
    // Set the right tables based on form type
    if (normalizedFormType === 'kyb' || normalizedFormType === 'company_kyb') {
      responseTable = 'kyb_responses';
      fieldTable = 'kyb_fields';
    } else if (normalizedFormType === 'ky3p') {
      responseTable = 'ky3p_responses';
      fieldTable = 'ky3p_fields';
    } else if (normalizedFormType === 'open_banking' || normalizedFormType === 'openbanking') {
      responseTable = 'open_banking_responses';
      fieldTable = 'open_banking_fields';
    } else {
      logger.warn(`Unknown form type: ${normalizedFormType}, using fallback mechanism`, { taskId, normalizedFormType });
      responseTable = null;
      fieldTable = null;
    }
    
    logger.info(`Using database tables for form data`, { responseTable, fieldTable });
    
    // If we have valid tables, fetch the data
    let responses = [];
    let fields = {};
    
    if (responseTable && fieldTable) {
      try {
        // Step 1: Get all responses
        responseQuery = `
          SELECT id, field_id, response_value, status 
          FROM ${responseTable} 
          WHERE task_id = $1 AND status = 'COMPLETE'
        `;
        
        const responseResult = await pool.query(responseQuery, [taskId]);
        responses = responseResult.rows;
        logger.info(`Found ${responses.length} form responses`, { taskId, responseTable });
        
        // Step 2: Get all field definitions for these responses
        if (responses.length > 0) {
          // Extract field IDs
          const fieldIds = [...new Set(responses.map(r => r.field_id))];
          
          if (fieldIds.length > 0) {
            // For SQL parameter placeholders
            const placeholders = fieldIds.map((_, i) => `$${i + 1}`).join(',');
            
            fieldQuery = `
              SELECT id, field_key, display_name, question, field_type
              FROM ${fieldTable}
              WHERE id IN (${placeholders})
            `;
            
            const fieldResult = await pool.query(fieldQuery, fieldIds);
            
            // Convert to a map for easy lookup
            fieldResult.rows.forEach(field => {
              fields[field.id] = field;
            });
            
            logger.info(`Found ${Object.keys(fields).length} field definitions`, { taskId, fieldTable });
          }
        }
      } catch (dbError) {
        logger.error(`Database error fetching form data`, {
          error: dbError instanceof Error ? dbError.message : 'Unknown error',
          stack: dbError instanceof Error ? dbError.stack : undefined,
          taskId,
          formType: normalizedFormType
        });
      }
    }
    
    // ─── STEP 2: BUILD CSV ROWS ────────────────────────────────────────
    if (responses.length > 0 && Object.keys(fields).length > 0) {
      logger.info(`Building CSV from ${responses.length} responses`, { taskId });
      
      // Combine responses with field definitions
      responses.forEach((response, index) => {
        const field = fields[response.field_id] || { question: 'Unknown question', field_key: `field_${response.field_id}` };
        
        // Get the best available question text
        const question = field.question || field.display_name || field.field_key || `Question ${response.field_id}`;
        
        // Format the response value
        let formattedValue = response.response_value;
        if (typeof formattedValue === 'object' && formattedValue !== null) {
          formattedValue = JSON.stringify(formattedValue);
        } else if (formattedValue === undefined || formattedValue === null) {
          formattedValue = '';
        } else {
          formattedValue = String(formattedValue);
        }
        
        // Create a CSV row with proper escaping
        const rowValues = [
          index + 1,                                       // id (sequential number)
          `"${question.replace(/"/g, '""')}"`,          // question text
          `"${formattedValue.replace(/"/g, '""')}"`,    // response value
          `"${field.field_key || ''}"`,                  // field_key
          `"${submissionDate}"`                           // timestamp
        ];
        
        rows.push(rowValues.join(','));
      });
      
      logger.info(`Created ${rows.length - 1} data rows from database`, { taskId });
    } else {
      // Fallback if no database data is available
      logger.warn(`No database responses found, using submitted formData as fallback`, { taskId });
      
      // Extract fields from formData
      let formFields = {};
      
      // Handle case where formData might contain a JSON string
      if (formData.formData && typeof formData.formData === 'string') {
        try {
          formFields = JSON.parse(formData.formData);
          logger.info(`Parsed formData JSON with ${Object.keys(formFields).length} fields`, { taskId });
        } catch (e) {
          logger.error(`Error parsing formData JSON`, {
            error: e instanceof Error ? e.message : 'Unknown error',
            taskId
          });
        }
      }
      
      // If we don't have fields from the formData string, use the whole object
      if (Object.keys(formFields).length === 0) {
        formFields = { ...formData };
        // Remove metadata fields
        delete formFields.formData;
        delete formFields.formType;
        delete formFields.taskId;
        delete formFields.companyId;
        
        logger.info(`Using flat formData with ${Object.keys(formFields).length} fields`, { taskId });
      }
      
      // Convert form fields to CSV rows
      Object.entries(formFields).forEach(([key, value], index) => {
        let formattedValue;
        if (typeof value === 'object' && value !== null) {
          formattedValue = JSON.stringify(value);
        } else if (value === undefined || value === null) {
          formattedValue = '';
        } else {
          formattedValue = String(value);
        }
        
        const rowValues = [
          index + 1,                                      // id
          `"${key.replace(/"/g, '""')}"`,              // key as question
          `"${formattedValue.replace(/"/g, '""')}"`,   // value
          `"${key.replace(/"/g, '""')}"`,              // key as field_key
          `"${submissionDate}"`                          // timestamp
        ];
        
        rows.push(rowValues.join(','));
      });
    }
    
    // ─── STEP 3: ADD METADATA ROWS ────────────────────────────────────
    // Always add metadata rows at the end
    const metaStartIndex = rows.length;
    
    // Add task, company and form type info
    rows.push([metaStartIndex, '"Task ID"', `"${taskId}"`, '"task_id"', `"${submissionDate}"`].join(','));
    rows.push([metaStartIndex + 1, '"Company ID"', `"${companyId}"`, '"company_id"', `"${submissionDate}"`].join(','));
    rows.push([metaStartIndex + 2, '"Form Type"', `"${normalizedFormType}"`, '"form_type"', `"${submissionDate}"`].join(','));
    
    // Check if we have enough data
    if (rows.length <= 4) {
      logger.warn(`Warning: CSV only has ${rows.length - 1} rows. Expected more data.`, { taskId });      
    } else {
      logger.info(`Created CSV with ${rows.length - 1} rows (${rows.length - 4} form fields + 3 metadata rows)`, { taskId });  
    }
    
    // Join all rows to create the CSV content
    content = rows.join('\n');
    
    console.log(`[FileCreation] Created standard CSV file with ${rows.length - 1} data rows for task ${taskId}`);
    
    // Log a sample of the data for debugging
    console.log(`[FileCreation] CSV file created with ${rows.length - 1} fields:`, {
      rowCount: rows.length,
      headerRow: headers,
      contentLength: content.length
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
