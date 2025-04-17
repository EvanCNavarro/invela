import { TaskStatus } from '../types';

/**
 * Calculate accurate progress for KYB form based on field completion
 * 
 * @param responses Array of form responses with status and hasValue properties
 * @param allFields Array of all expected fields
 * @returns Progress percentage (0-100)
 */
export function calculateKybFormProgress(
  responses: Array<{ status: string; hasValue: boolean; field?: string; required?: boolean }>,
  allFields: any[]
): number {
  if (!responses || !allFields || allFields.length === 0) return 0;
  
  const completedFields = responses.filter(
    response => response.status === 'COMPLETE' && response.hasValue === true
  ).length;
  
  return Math.floor((completedFields / allFields.length) * 100);
}

/**
 * Determine if a KYB form has all required fields completed
 * 
 * @param responses Array of form responses with status, hasValue and required properties
 * @returns Boolean indicating if all required fields are completed
 */
export function hasAllRequiredFields(
  responses: Array<{ status: string; hasValue: boolean; required?: boolean; field?: string }>
): boolean {
  // If no responses, obviously we don't have all required fields
  if (!responses || responses.length === 0) return false;
  
  // Check if any required fields are empty
  const hasEmptyRequiredFields = responses.some(
    response => response.required && (response.status === 'EMPTY' || !response.hasValue)
  );
  
  return !hasEmptyRequiredFields;
}