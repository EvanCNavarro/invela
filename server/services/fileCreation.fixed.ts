/**
 * File Creation Service (Fixed)
 * 
 * This module provides simplified and fixed functionality for creating files
 * from form submissions. It addresses type issues and provides consistent
 * file generation for all form types.
 */

import { db } from '@db';
import { files, tasks } from '@db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { SchemaFormType } from '../utils/form-type-mapper';
import { logger } from '../utils/logger';

// Type for file creation result
export interface FileCreationResult {
  success: boolean;
  fileId?: string | number;
  error?: string;
}

/**
 * Convert form data to CSV format
 */
function convertToCSV(fields: any[], formData: Record<string, any>): string {
  // Header row: field key, display name, section, response
  const headerRow = ['Field Key', 'Display Name', 'Section', 'Response'];
  const rows = [headerRow];
  
  // Add data rows
  for (const field of fields) {
    const fieldKey = field.field_key || field.key || field.name;
    const value = formData[fieldKey] ?? '';
    rows.push([
      fieldKey,
      field.display_name || field.name || fieldKey,
      field.section || '',
      // Ensure proper CSV escaping for values with commas
      typeof value === 'string' && value.includes(',') ? `"${value}"` : value
    ]);
  }
  
  // Join all rows with newlines
  return rows.map(row => row.join(',')).join('\n');
}

/**
 * Generate a file name for a form submission
 */
function generateFileName(formType: SchemaFormType, taskId: number, providedName?: string): string {
  if (providedName) {
    return providedName;
  }
  
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  
  switch (formType) {
    case 'company_kyb':
    case 'kyb':
      return `kyb_submission_${taskId}_${timestamp}.csv`;
    case 'ky3p':
    case 'sp_ky3p_assessment':
      return `ky3p_submission_${taskId}_${timestamp}.csv`;
    case 'open_banking':
    case 'open_banking_survey':
      return `open_banking_submission_${taskId}_${timestamp}.csv`;
    case 'card':
      return `card_submission_${taskId}_${timestamp}.csv`;
    default:
      return `form_submission_${taskId}_${timestamp}.csv`;
  }
}

/**
 * Create a file for a form submission
 * 
 * @param formType The type of form (e.g., 'kyb', 'ky3p')
 * @param taskId The ID of the task being submitted
 * @param companyId The ID of the company
 * @param formData The form data to save to a file
 * @param fileName Optional custom file name
 * @returns A result object with success status and file ID
 */
export async function createFileForFormSubmission(
  formType: SchemaFormType,
  taskId: number,
  companyId: number,
  formData: Record<string, any>,
  fileName?: string
): Promise<FileCreationResult> {
  try {
    logger.info(`[FileCreation] Creating file for ${formType} submission`, {
      taskId,
      companyId,
      customFileName: !!fileName
    });
    
    // Get the form fields for CSV generation
    const fields = await getFormFields(formType, taskId);
    
    if (!fields || fields.length === 0) {
      logger.warn(`[FileCreation] No fields found for ${formType} task ${taskId}`);
    }
    
    // Convert form data to CSV
    const csvContent = convertToCSV(fields || [], formData);
    
    // Generate file name
    const generatedFileName = generateFileName(formType, taskId, fileName);
    
    // Create file entry in database
    const fileId = uuidv4();
    const now = new Date();
    
    const [fileEntry] = await db.insert(files)
      .values({
        id: fileId,
        file_name: generatedFileName,
        original_name: generatedFileName,
        content_type: 'text/csv',
        size: csvContent.length,
        created_at: now,
        updated_at: now,
        company_id: companyId,
        file_content: Buffer.from(csvContent),
        is_private: true
      })
      .returning();
    
    if (!fileEntry) {
      throw new Error('Failed to create file entry in database');
    }
    
    // Update task metadata to include the file ID
    await db.update(tasks)
      .set({
        metadata: {
          ...await getTaskMetadata(taskId),
          fileId: fileId
        },
        updated_at: now
      })
      .where(eq(tasks.id, taskId));
    
    logger.info(`[FileCreation] Successfully created file for ${formType} submission`, {
      taskId,
      companyId,
      fileId: fileEntry.id,
      fileName: generatedFileName
    });
    
    return {
      success: true,
      fileId: fileEntry.id
    };
  } catch (error) {
    logger.error(`[FileCreation] Error creating file for ${formType} submission`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      taskId,
      companyId
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating file'
    };
  }
}

/**
 * Get task metadata (helper function)
 */
async function getTaskMetadata(taskId: number): Promise<Record<string, any>> {
  try {
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    return task?.metadata || {};
  } catch (error) {
    logger.error(`[FileCreation] Error getting task metadata`, {
      error: error instanceof Error ? error.message : String(error),
      taskId
    });
    
    return {};
  }
}

/**
 * Get form fields for a specific form type and task
 */
async function getFormFields(formType: SchemaFormType, taskId: number): Promise<any[]> {
  try {
    // Based on form type, get the appropriate fields
    switch (formType) {
      case 'company_kyb':
      case 'kyb':
        return await db.query.kybFields.findMany({
          orderBy: (fields, { asc }) => [asc(fields.section), asc(fields.order)]
        });
        
      case 'ky3p':
      case 'sp_ky3p_assessment':
        return await db.query.ky3pFields.findMany({
          orderBy: (fields, { asc }) => [asc(fields.section), asc(fields.order)]
        });
        
      case 'open_banking':
      case 'open_banking_survey':
        return await db.query.openBankingFields.findMany({
          orderBy: (fields, { asc }) => [asc(fields.section), asc(fields.order)]
        });
        
      case 'card':
        // For card forms, return a basic structure
        return [
          { field_key: 'cardholder_name', display_name: 'Cardholder Name', section: 'Card Details' },
          { field_key: 'card_type', display_name: 'Card Type', section: 'Card Details' },
          { field_key: 'expiry_date', display_name: 'Expiry Date', section: 'Card Details' },
          { field_key: 'billing_address', display_name: 'Billing Address', section: 'Billing Information' }
        ];
        
      default:
        logger.warn(`[FileCreation] Unknown form type: ${formType}`);
        return [];
    }
  } catch (error) {
    logger.error(`[FileCreation] Error getting form fields`, {
      error: error instanceof Error ? error.message : String(error),
      formType,
      taskId
    });
    
    return [];
  }
}