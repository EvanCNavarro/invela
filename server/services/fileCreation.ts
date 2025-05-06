/**
 * File Creation Service
 * 
 * This module provides functions for creating files from form data.
 * It standardizes file creation across different form types.
 * 
 * @module fileCreation
 */

import { db } from '@db';
import { files, tasks, kybResponses, kybFields, ky3pResponses, ky3pFields, openBankingResponses, openBankingFields } from '@db/schema';
import { eq } from 'drizzle-orm';
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
    
    // ─── STEP 1: FETCH RESPONSES USING DRIZZLE ORM ─────────────────────────
    let responseData: Array<{
      fieldKey: string;
      questionText: string;
      responseValue: any;
      status: string;
    }> = [];
    
    // Determine which tables to use based on form type and fetch data using Drizzle ORM
    if (normalizedFormType === 'kyb' || normalizedFormType === 'company_kyb') {
      const responses = await db.select({
        responseValue: kybResponses.response_value,
        fieldKey: kybFields.field_key,
        questionText: kybFields.question,
        displayName: kybFields.display_name,
        status: kybResponses.status,
        stepIndex: kybFields.step_index,
        displayOrder: kybFields.display_order,
        group: kybFields.group
      })
      .from(kybResponses)
      .innerJoin(kybFields, eq(kybResponses.field_id, kybFields.id))
      .where(eq(kybResponses.task_id, taskId))
      .orderBy(
        kybFields.step_index, 
        kybFields.display_order
      );
      
      // Transform to our internal format
      responseData = responses.map(r => ({
        fieldKey: r.fieldKey,
        questionText: r.questionText || r.displayName || r.fieldKey,
        responseValue: r.responseValue,
        status: r.status,
        stepIndex: r.stepIndex || 0,
        displayOrder: r.displayOrder || 0,
        group: r.group || 'Other'
      }));
      
      console.log(`[FileCreation] Retrieved ${responses.length} KYB responses for task ${taskId} ordered by UI form order`);
    } 
    else if (normalizedFormType === 'ky3p') {
      const responses = await db.select({
        responseValue: ky3pResponses.response_value,
        fieldKey: ky3pFields.field_key,
        questionText: ky3pFields.question,
        displayName: ky3pFields.display_name, 
        status: ky3pResponses.status,
        stepIndex: ky3pFields.step_index,
        displayOrder: ky3pFields.display_order,
        group: ky3pFields.group
      })
      .from(ky3pResponses)
      .innerJoin(ky3pFields, eq(ky3pResponses.field_id, ky3pFields.id))
      .where(eq(ky3pResponses.task_id, taskId))
      .orderBy(
        ky3pFields.step_index, 
        ky3pFields.display_order
      );
      
      // Transform to our internal format
      responseData = responses.map(r => ({
        fieldKey: r.fieldKey,
        questionText: r.questionText || r.displayName || r.fieldKey,
        responseValue: r.responseValue,
        status: r.status,
        stepIndex: r.stepIndex || 0,
        displayOrder: r.displayOrder || 0,
        group: r.group || 'Other'
      }));
      
      console.log(`[FileCreation] Retrieved ${responses.length} KY3P responses for task ${taskId} ordered by UI form order`);
    } 
    else if (normalizedFormType === 'open_banking' || normalizedFormType === 'openbanking') {
      const responses = await db.select({
        responseValue: openBankingResponses.response_value,
        fieldKey: openBankingFields.field_key,
        questionText: openBankingFields.question,
        displayName: openBankingFields.display_name,
        status: openBankingResponses.status,
        stepIndex: openBankingFields.step_index,
        displayOrder: openBankingFields.display_order,
        group: openBankingFields.group
      })
      .from(openBankingResponses)
      .innerJoin(openBankingFields, eq(openBankingResponses.field_id, openBankingFields.id))
      .where(eq(openBankingResponses.task_id, taskId))
      .orderBy(
        openBankingFields.step_index, 
        openBankingFields.display_order
      );
      
      // Transform to our internal format
      responseData = responses.map(r => ({
        fieldKey: r.fieldKey,
        questionText: r.questionText || r.displayName || r.fieldKey,
        responseValue: r.responseValue,
        status: r.status,
        stepIndex: r.stepIndex || 0,
        displayOrder: r.displayOrder || 0,
        group: r.group || 'Other'
      }));
      
      console.log(`[FileCreation] Retrieved ${responses.length} Open Banking responses for task ${taskId} ordered by UI form order`);
    } 
    else {
      logger.warn(`Unknown form type: ${normalizedFormType}, using fallback mechanism`, { taskId, normalizedFormType });
    }
    
    // ─── STEP 2: BUILD CSV ROWS ────────────────────────────────────────
    // Filter for only COMPLETE responses
    const completeResponses = responseData.filter(r => r.status === 'COMPLETE');
    
    if (completeResponses.length > 0) {
      logger.info(`Building CSV from ${completeResponses.length} complete responses`, { taskId });
      
      // Process each response into a CSV row
      completeResponses.forEach((response, index) => {
        // Format the response value
        let formattedValue = response.responseValue;
        if (typeof formattedValue === 'object' && formattedValue !== null) {
          formattedValue = JSON.stringify(formattedValue);
        } else if (formattedValue === undefined || formattedValue === null) {
          formattedValue = '';
        } else {
          formattedValue = String(formattedValue);
        }
        
        // Create a CSV row with proper escaping
        const rowValues = [
          index + 1,                                           // id (sequential number)
          `"${(response.questionText || '').replace(/"/g, '""')}"`,  // question text
          `"${formattedValue.replace(/"/g, '""')}"`,          // response value
          `"${(response.fieldKey || '').replace(/"/g, '""')}"`,     // field_key
          `"${submissionDate}"`                               // timestamp
        ];
        
        rows.push(rowValues.join(','));
      });
      
      logger.info(`Created ${rows.length - 1} data rows from database responses`, { taskId });
    } else {
      // Fallback if no database data is available
      logger.warn(`No complete database responses found, using submitted formData as fallback`, { taskId });
      
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
