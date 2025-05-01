/**
 * Standardized File Reference Module
 * 
 * This module provides a standardized approach to managing file references
 * across different form types, ensuring consistency and proper file tracking.
 */

import { logger } from '../utils/logger';

// Logger is already initialized in the imported module

/**
 * Standardize file references in form data
 * 
 * KY3P forms have inconsistent property naming for file references
 * (they use 'ky3pFormFile' and 'securityFormFile' instead of the standard 'fileId').
 * This function ensures all form types use a standardized 'fileId' property.
 * 
 * @param formData The original form data
 * @param formType The type of form (e.g., 'kyb', 'ky3p', 'open_banking')
 * @returns Form data with standardized file references
 */
export function standardizeFileReference(formData: Record<string, any>, formType: string): Record<string, any> {
  // Clone the form data to avoid mutating the original
  const standardizedData = { ...formData };
  
  // Handle KY3P-specific naming inconsistencies
  if (formType === 'sp_ky3p_assessment' || formType === 'ky3p') {
    // Check for KY3P-specific file reference properties
    if (standardizedData.ky3pFormFile !== undefined && standardizedData.fileId === undefined) {
      logger.info('Standardizing KY3P form file reference', {
        originalProperty: 'ky3pFormFile',
        value: standardizedData.ky3pFormFile
      });
      
      // Copy the value to the standard fileId property
      standardizedData.fileId = standardizedData.ky3pFormFile;
    }
    
    if (standardizedData.securityFormFile !== undefined && standardizedData.fileId === undefined) {
      logger.info('Standardizing KY3P security form file reference', {
        originalProperty: 'securityFormFile',
        value: standardizedData.securityFormFile
      });
      
      // Copy the value to the standard fileId property
      standardizedData.fileId = standardizedData.securityFormFile;
    }
  }
  
  return standardizedData;
}

/**
 * Get the standardized file ID from form data
 * 
 * This is a convenience function that returns just the standardized file ID.
 * 
 * @param formData The form data
 * @param formType The type of form
 * @returns The standardized file ID or undefined if not found
 */
export function getStandardizedFileId(formData: Record<string, any>, formType: string): number | string | undefined {
  const standardizedData = standardizeFileReference(formData, formType);
  return standardizedData.fileId;
}

export default {
  standardizeFileReference,
  getStandardizedFileId
};
