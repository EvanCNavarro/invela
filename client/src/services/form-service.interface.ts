import { FormData, TimestampedFormData } from '../types/form-data';
import { FormField, FormSection } from '../components/forms/types';

// Ensure we have proper imports for FormField and FormSection

/**
 * Options for submitting a form
 */
export interface FormSubmitOptions {
  taskId?: number;
  fileName?: string;
  format?: 'json' | 'pdf' | 'csv';
}

/**
 * Response from saving or submitting a form
 */
export interface FormSubmitResponse {
  success: boolean;
  error?: string;
  details?: string;
  fileName?: string;
  fileId?: number;
}

/**
 * Interface for all form services 
 * This ensures consistent API across different form types
 */
export interface FormServiceInterface {
  /**
   * Initialize the form service with data from the server
   * @param taskId The task ID to initialize with
   */
  initialize(taskId: number): Promise<void>;
  
  /**
   * Get all form fields
   */
  getFields(): FormField[];
  
  /**
   * Get all form sections
   */
  getSections(): FormSection[];
  
  /**
   * Load form data from an external source
   * @param data The form data to load
   */
  loadFormData(data: FormData): void;
  
  /**
   * Update a field value
   * @param fieldKey The field key to update
   * @param value The new value
   * @param taskId Optional task ID for immediate persistence
   */
  updateFormData(fieldKey: string, value: any, taskId?: number): void;
  
  /**
   * Bulk update multiple field values at once
   * Used primarily for demo auto-fill functionality
   * @param data Record of field keys and values to update
   * @param taskId Optional task ID for immediate persistence
   * @returns Promise resolving to a boolean indicating success
   */
  bulkUpdate(data: Record<string, any>, taskId?: number): Promise<boolean>;
  
  /**
   * Get current form data
   */
  getFormData(): FormData;
  
  /**
   * Get timestamped form data (for advanced conflict resolution)
   * Returns form values with their corresponding timestamps for conflict resolution
   */
  getTimestampedFormData(): TimestampedFormData;
  
  /**
   * Calculate current form completion progress (0-100)
   */
  calculateProgress(): number;
  
  /**
   * Get the current task status
   */
  getTaskStatus(): string;
  
  /**
   * Load saved progress from the server
   * @param taskId The task ID to load progress for
   */
  loadProgress(taskId: number): Promise<FormData>;
  
  /**
   * Save current progress to the server
   * @param taskId The task ID to save progress for
   */
  saveProgress(taskId?: number): Promise<void>;
  
  /**
   * Save the form
   * @param options Options for saving
   */
  save(options: FormSubmitOptions): Promise<boolean>;
  
  /**
   * Submit the completed form
   * @param options Options for submission
   */
  submit(options: FormSubmitOptions): Promise<FormSubmitResponse>;
  
  /**
   * Validate form data
   * @param data The form data to validate
   * @returns True if valid, or an object with validation errors
   */
  validate(data: FormData): boolean | Record<string, string>;
}