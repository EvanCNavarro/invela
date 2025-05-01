/**
 * Standardized File Reference Service
 * 
 * This service provides a standard way to handle file references across all form types,
 * ensuring consistent property naming and metadata structure.
 * 
 * File references are always stored with the same property name (fileId) in task metadata,
 * regardless of the form type. This consistency makes it easier for the File Vault UI
 * to locate and display files properly.
 */

import createLogger from '../utils/logger';
import { TaskMetadata } from '../types/tasks';

// Create a logger for this service
const logger = createLogger('StandardizedFileRef');

// Define the possible form types
export type FormType = 'kyb' | 'ky3p' | 'open_banking' | 'company_kyb' | 'company_card' | 'open_banking_survey';

// Metadata field mapping for different form types
const LEGACY_FILE_ID_FIELDS = {
  kyb: 'kybFormFile',
  ky3p: 'ky3pFormFile',
  open_banking: 'openBankingFormFile',
  company_kyb: 'kybFormFile',
  company_card: 'cardFormFile',
  open_banking_survey: 'openBankingSurveyFile'
};

// Standard file ID field that should be used across all form types
export const STANDARD_FILE_ID_FIELD = 'fileId';

/**
 * Standardize file references in task metadata
 * 
 * This function ensures that file references are stored with a consistent property name
 * regardless of form type. It handles both adding new file references and updating existing ones.
 * 
 * @param metadata The task metadata object
 * @param formType The type of form being processed
 * @param fileId The ID of the file to reference
 * @returns Updated metadata with standardized file reference
 */
export function standardizeFileReference(
  metadata: TaskMetadata | null | undefined,
  formType: FormType,
  fileId: number | string
): TaskMetadata {
  // Create metadata object if it doesn't exist
  const updatedMetadata: TaskMetadata = metadata || {};
  
  // Get the legacy field name for this form type
  const legacyField = LEGACY_FILE_ID_FIELDS[formType];
  
  // Log the conversion for auditing and debugging
  logger.info(`[StandardizeFileRef] Standardizing file reference for ${formType} form`, {
    formType,
    fileId,
    legacyField,
    standardField: STANDARD_FILE_ID_FIELD,
    hadLegacyReference: legacyField && legacyField in updatedMetadata
  });
  
  // Always set the standard field
  updatedMetadata[STANDARD_FILE_ID_FIELD] = fileId;
  
  // For backward compatibility, also set the legacy field
  if (legacyField) {
    updatedMetadata[legacyField] = fileId;
  }
  
  return updatedMetadata;
}

/**
 * Get file ID from task metadata
 * 
 * This function retrieves a file ID from task metadata, checking both the standard
 * and legacy field names for the specified form type.
 * 
 * @param metadata The task metadata object
 * @param formType The type of form to get the file ID for
 * @returns The file ID if found, or null if not found
 */
export function getFileIdFromMetadata(
  metadata: TaskMetadata | null | undefined,
  formType: FormType
): number | string | null {
  if (!metadata) {
    return null;
  }
  
  // First check the standard field
  if (STANDARD_FILE_ID_FIELD in metadata && metadata[STANDARD_FILE_ID_FIELD]) {
    return metadata[STANDARD_FILE_ID_FIELD];
  }
  
  // Then check the legacy field
  const legacyField = LEGACY_FILE_ID_FIELDS[formType];
  if (legacyField && legacyField in metadata && metadata[legacyField]) {
    return metadata[legacyField];
  }
  
  // No file ID found
  return null;
}

/**
 * Check if task metadata contains a file reference
 * 
 * @param metadata The task metadata to check
 * @param formType The type of form to check
 * @returns True if a file reference is found, false otherwise
 */
export function hasFileReference(
  metadata: TaskMetadata | null | undefined,
  formType: FormType
): boolean {
  return getFileIdFromMetadata(metadata, formType) !== null;
}
