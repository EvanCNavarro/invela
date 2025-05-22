/**
 * Task Status Utility
 * 
 * This utility provides standardized methods for working with task statuses
 * to ensure consistent string representations are used across the application.
 * 
 * It handles the conversion between enum types and string literals required
 * by the database schema.
 */

import { logger } from './logger';

/**
 * Normalize a task status to ensure it's in the correct string format
 * for database storage.
 * 
 * @param status The status value (can be enum or string)
 * @returns The normalized string status 
 */
export function normalizeTaskStatus(status: any): string {
  // If it's already a string, verify it's a valid status or return as is
  if (typeof status === 'string') {
    return validateTaskStatus(status);
  }
  
  // Handle TaskStatus enum or any other object with a toString method
  if (status && typeof status.toString === 'function') {
    // Extract the actual string value from the enum
    const stringValue = status.toString();
    
    // If the toString() produces object representation, try to extract the value
    if (stringValue.includes('[object')) {
      logger.warn(`Task status conversion produced invalid format: ${stringValue}`);
      // Default to 'submitted' for safety when used in submission context
      return 'submitted';
    }
    
    return validateTaskStatus(stringValue);
  }
  
  // For any other case, log a warning and return a default value
  logger.warn(`Unknown task status format: ${status}`, { type: typeof status });
  return 'in_progress'; // Default fall-back status
}

/**
 * Validate that a status string is among the allowed values
 * 
 * @param status The status string to validate
 * @returns The validated status (original or default)
 */
function validateTaskStatus(status: string): string {
  // List of valid status values in the database
  const validStatuses = [
    'pending',
    'not_started',
    'email_sent',
    'in_progress',
    'ready_for_submission',
    'submitted',
    'approved',
    'completed',
    'failed',
    'rejected',
    'archived'
  ];
  
  // Check and normalize the status
  const normalizedStatus = status.toLowerCase();
  
  if (validStatuses.includes(normalizedStatus)) {
    return normalizedStatus;
  }
  
  // Log invalid status and return a default
  logger.warn(`Invalid task status value: ${status}`);
  return 'in_progress'; // Default status when invalid
}

/**
 * Get a normalized 'submitted' status value
 * This is a convenience method specifically for form submissions
 * 
 * @returns The normalized 'submitted' status string
 */
export function getSubmittedStatus(): string {
  return 'submitted';
}