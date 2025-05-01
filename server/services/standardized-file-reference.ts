/**
 * StandardizedFileReference Module
 * 
 * This module provides functions for standardizing file references across different form types.
 * It addresses the issue where KY3P forms use inconsistent property naming for file metadata
 * ('ky3pFormFile' and 'securityFormFile') rather than the standard 'fileId'.
 * 
 * @module standardized-file-reference
 */

import getLogger from '../utils/logger';

// Import types as needed from our application
import { Task } from '../types/tasks';

const logger = getLogger('FileReference');

/**
 * Form field property names for file references in different form types
 */
const FILE_REFERENCE_FIELDS = {
  // Standard file reference field used by most form types
  STANDARD: 'fileId',
  
  // KY3P specific file reference fields
  KY3P_FORM_FILE: 'ky3pFormFile',
  SECURITY_FORM_FILE: 'securityFormFile',
  
  // Add other form-specific file reference fields here as needed
};

/**
 * Extracts the file ID from form data based on the form type
 * 
 * Different form types may store file references under different property names.
 * This function standardizes access to those references.
 * 
 * @param formData The form data object containing responses
 * @param formType The type of form (e.g., 'kyb', 'ky3p', 'open_banking')
 * @returns The file ID if found, or null if no file reference exists
 */
export function extractFileId(formData: Record<string, any>, formType: string): number | string | null {
  // Initialize with standard file ID field
  let fileId = formData[FILE_REFERENCE_FIELDS.STANDARD];
  
  // For KY3P forms, check the special fields
  if (formType === 'sp_ky3p_assessment' || formType === 'ky3p') {
    fileId = fileId || formData[FILE_REFERENCE_FIELDS.KY3P_FORM_FILE] || formData[FILE_REFERENCE_FIELDS.SECURITY_FORM_FILE];
    
    logger.info(`Extracted KY3P file ID from special fields: ${fileId}`, {
      formType,
      standardField: formData[FILE_REFERENCE_FIELDS.STANDARD],
      ky3pFormFile: formData[FILE_REFERENCE_FIELDS.KY3P_FORM_FILE],
      securityFormFile: formData[FILE_REFERENCE_FIELDS.SECURITY_FORM_FILE]
    });
  }
  
  return fileId || null;
}

/**
 * Standardizes file reference in form data by copying from form-specific fields to standard field
 * 
 * This function ensures that all file references are available under the standard 'fileId' property,
 * while preserving the original form-specific references.
 * 
 * @param formData The form data to standardize
 * @param formType The type of form
 * @returns The standardized form data with consistent file references
 */
export function standardizeFileReference(formData: Record<string, any>, formType: string): Record<string, any> {
  // Make a copy of the form data to avoid modifying the original
  const standardizedData = { ...formData };
  
  // For KY3P forms, ensure the standard file ID field is populated
  if (formType === 'sp_ky3p_assessment' || formType === 'ky3p') {
    // Find file ID in form-specific fields
    const ky3pFileId = formData[FILE_REFERENCE_FIELDS.KY3P_FORM_FILE] || formData[FILE_REFERENCE_FIELDS.SECURITY_FORM_FILE];
    
    // If a form-specific file ID exists but the standard field doesn't, copy the value
    if (ky3pFileId && !standardizedData[FILE_REFERENCE_FIELDS.STANDARD]) {
      standardizedData[FILE_REFERENCE_FIELDS.STANDARD] = ky3pFileId;
      
      logger.info(`Standardized KY3P file reference: ${ky3pFileId}`, {
        formType,
        source: formData[FILE_REFERENCE_FIELDS.KY3P_FORM_FILE] ? 'ky3pFormFile' : 'securityFormFile',
        fileId: ky3pFileId
      });
    }
  }
  
  return standardizedData;
}

/**
 * Updates a task with standardized file references
 * 
 * This function ensures that file references in the task metadata are consistent,
 * which helps prevent issues with files not appearing in the File Vault UI.
 * 
 * @param task The task object to update
 * @returns The task with standardized file references
 */
export function standardizeTaskFileReferences(task: Task): Task {
  // Skip processing if the task has no metadata
  if (!task.metadata) {
    return task;
  }
  
  // Make a copy of the task to avoid modifying the original
  const updatedTask = { ...task };
  
  // Standardize file references in the task metadata
  if (updatedTask.metadata) {
    const standardizedMetadata = standardizeFileReference(
      updatedTask.metadata as Record<string, any>,
      updatedTask.type
    );
    
    updatedTask.metadata = standardizedMetadata;
  }
  
  return updatedTask;
}

export default {
  extractFileId,
  standardizeFileReference,
  standardizeTaskFileReferences
};
