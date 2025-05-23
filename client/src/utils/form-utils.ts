/**
 * ========================================
 * Form Management Utilities
 * ========================================
 * 
 * Comprehensive form handling utilities for the enterprise risk assessment platform.
 * Provides status calculation, timestamp-based conflict resolution, and form
 * data integrity management across concurrent editing sessions.
 * 
 * @module utils/form-utils
 * @version 1.0.0
 * @since 2025-05-23
 */

/**
 * Constants for task status mapping based on progress
 */
export const TaskStatus = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  READY_FOR_SUBMISSION: 'ready_for_submission',
  SUBMITTED: 'submitted'
};

/**
 * Calculate task status based on form completion progress
 * @param progress - Current form completion percentage (0-100)
 * @param isSubmitted - Whether the form has been submitted
 * @returns The appropriate task status
 */
export function calculateTaskStatusUtil(progress: number, isSubmitted: boolean = false): string {
  // If the form has been explicitly submitted, return 'submitted' regardless of progress
  if (isSubmitted) {
    return TaskStatus.SUBMITTED;
  }
  
  // Otherwise, calculate based on progress
  if (progress <= 0) {
    return TaskStatus.NOT_STARTED;
  } else if (progress < 100) {
    return TaskStatus.IN_PROGRESS;
  } else {
    return TaskStatus.READY_FOR_SUBMISSION;
  }
}

/**
 * Check if a value is empty or undefined
 * @param value - The value to check
 * @returns True if the value is empty, false otherwise
 */
export function isEmpty(value: any): boolean {
  if (value === undefined || value === null) {
    return true;
  }
  
  if (typeof value === 'string') {
    return value.trim() === '';
  }
  
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  
  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }
  
  return false;
}

/**
 * Parse form data safely, handling various input formats
 * @param data - The form data to parse
 * @returns Normalized form data object
 */
export function parseFormData(data: any): Record<string, any> {
  if (!data) {
    return {};
  }
  
  // Already an object
  if (typeof data === 'object' && !Array.isArray(data)) {
    return data;
  }
  
  // JSON string
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse form data string:', e);
      return {};
    }
  }
  
  // Fallback
  console.warn('Unexpected form data format:', data);
  return {};
}

/**
 * Format a date value for display
 * @param dateValue - Date string or timestamp
 * @param format - Optional format specification
 * @returns Formatted date string
 */
export function formatDateValue(dateValue: string | number | Date, format: string = 'YYYY-MM-DD'): string {
  if (!dateValue) {
    return '';
  }
  
  try {
    const date = new Date(dateValue);
    
    if (isNaN(date.getTime())) {
      return '';
    }
    
    // Basic format patterns
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Replace format tokens
    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Convert a string to camelCase
 * @param str - The string to convert
 * @returns Camel-cased string
 */
export function toCamelCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) => 
      index === 0 ? letter.toLowerCase() : letter.toUpperCase()
    )
    .replace(/\s+/g, '');
}

/**
 * Generate a field key from a display name
 * @param displayName - The display name to convert
 * @returns A suitable field key
 */
export function generateFieldKey(displayName: string): string {
  return toCamelCase(displayName.trim());
}

/**
 * Timestamp utility functions for field-level conflict resolution
 */

/**
 * Create a timestamped field value 
 * @param value - The field value
 * @returns Object with field value and current timestamp
 */
export function createTimestampedValue(value: any): { value: any, timestamp: number } {
  return {
    value,
    timestamp: Date.now()
  };
}

/**
 * Compare field values with timestamps
 * @param clientData - Client-side field data with timestamp
 * @param serverData - Server-side field data with timestamp
 * @returns The most recent value based on timestamp
 */
export function resolveFieldConflict<T>(
  clientData: { value: T, timestamp: number },
  serverData: { value: T, timestamp: number }
): T {
  // Use the value with the most recent timestamp
  return clientData.timestamp >= serverData.timestamp
    ? clientData.value
    : serverData.value;
}

/**
 * Create a timestamp map for multiple fields
 * @param data - Object containing field key-value pairs
 * @returns Object containing field keys mapped to timestamps
 */
export function createTimestampMap(data: Record<string, any>): Record<string, number> {
  const now = Date.now();
  const result: Record<string, number> = {};
  
  // Create timestamp for each field key
  Object.keys(data).forEach(key => {
    result[key] = now;
  });
  
  return result;
}

/**
 * Update a timestamp for a specific field
 * @param timestamps - Existing timestamp map
 * @param key - Field key to update
 * @returns Updated timestamp map with new timestamp for the field
 */
export function updateTimestamp(
  timestamps: Record<string, number>,
  key: string
): Record<string, number> {
  return {
    ...timestamps,
    [key]: Date.now()
  };
}

/**
 * Format a timestamp for human-readable display
 * @param timestamp - Milliseconds since epoch
 * @returns Formatted timestamp string
 */
export function formatTimestamp(timestamp: number): string {
  try {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  } catch (error) {
    return 'Invalid timestamp';
  }
}