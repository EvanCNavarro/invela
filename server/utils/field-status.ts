/**
 * Standardized Field Status Enum
 * 
 * This module provides consistent status values for field responses across
 * different form types (KYB, KY3P, Open Banking) to ensure uniformity and
 * prevent status value inconsistencies.
 */

/**
 * Enum for standardized field status values
 * All status values should be lowercase for consistency
 */
export enum FieldStatus {
  COMPLETE = 'complete',
  INCOMPLETE = 'incomplete',
  EMPTY = 'empty',
  INVALID = 'invalid'
}

/**
 * Check if a value is a valid field status
 * @param status Status value to check
 * @returns True if the status is valid, false otherwise
 */
export function isValidFieldStatus(status: string): boolean {
  const normalizedStatus = status.toLowerCase();
  return Object.values(FieldStatus).includes(normalizedStatus as FieldStatus);
}

/**
 * Normalize a field status to ensure it's consistent
 * @param status Status value to normalize
 * @returns Normalized status value (lowercase)
 */
export function normalizeFieldStatus(status: string): FieldStatus {
  const normalizedStatus = status.toLowerCase();
  
  if (isValidFieldStatus(normalizedStatus)) {
    return normalizedStatus as FieldStatus;
  }
  
  // Handle legacy status values (uppercase)
  switch (normalizedStatus) {
    case 'complete':
      return FieldStatus.COMPLETE;
    case 'incomplete':
      return FieldStatus.INCOMPLETE;
    case 'empty':
      return FieldStatus.EMPTY;
    case 'invalid':
      return FieldStatus.INVALID;
    default:
      // Default to empty for unknown statuses
      return FieldStatus.EMPTY;
  }
}
