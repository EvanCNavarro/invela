/**
 * Form Service Interface
 * 
 * This interface defines the standard API that all form services must implement,
 * enabling standardized form handling across different form types.
 */

export interface FormField {
  id?: number;
  field_key?: string;
  key?: string;
  display_name?: string;
  label?: string;
  field_type?: string;
  type?: string;
  group?: string;
  section?: string;
  step_index?: number;
  order?: number;
  required?: boolean; 
  is_required?: boolean;
  is_array?: boolean;
  options?: string[];
  help_text?: string;
  helpText?: string;
  placeholder?: string;
  default_value?: any;
  default?: any;
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
}

export interface FormServiceInterface {
  /**
   * Get all form field definitions
   */
  getFields(): Promise<FormField[]>;
  
  /**
   * Get form data for a specific task
   */
  getTaskData(taskId: number): Promise<Record<string, any>>;
  
  /**
   * Update a single field value
   */
  updateField(taskId: number, fieldKey: string, value: any): Promise<boolean>;
  
  /**
   * Batch update multiple fields at once
   */
  batchUpdate(taskId: number, formData: Record<string, any>): Promise<boolean>;
  
  /**
   * Apply demo data to populate the form (for testing)
   */
  demoAutofill(taskId: number): Promise<boolean>;
  
  /**
   * Clear all field values for the task
   */
  clearAllFields(taskId: number): Promise<boolean>;
  
  /**
   * Get the task type for this form service
   */
  getTaskType(): string;
  
  /**
   * Get the current form data from cache or memory
   * This is used by form components to access the current state of the form
   */
  getFormData(): Record<string, any>;
  
  /**
   * Update form data directly in the service's cache
   * This is used by form components to update the form data without making an API call
   */
  updateFormData(fieldKey: string, value: any, taskId?: number): void;
  
  /**
   * Save form data to the server
   * This is used by form components to persist form data
   */
  save(options: { taskId: number, includeMetadata?: boolean }): Promise<boolean>;
  
  /**
   * Synchronize form data between different data sources
   * This ensures consistency between task.savedFormData and individual field responses
   */
  syncFormData?(taskId: number): Promise<{
    success: boolean;
    formData: Record<string, any>;
    progress: number;
    status: string;
    taskId: number;
    syncDirection: 'none' | 'to_task' | 'to_fields';
  }>;
  
  /**
   * Get timestamped form data for reliable conflict resolution
   * This is used by form components to track field update timestamps
   */
  getTimestampedFormData?(): {
    values: Record<string, any>;
    timestamps: Record<string, number>;
  };
  
  /**
   * Clear the service cache
   * This is used to reset the service state when needed
   */
  clearCache(): void;
  
  /**
   * Load saved progress for a task
   * This is used by FormDataManager to retrieve saved form data
   */
  loadProgress?(taskId: number): Promise<Record<string, any>>;
  
  /**
   * Get form sections/groups
   * This is used by form components to render section navigation
   */
  getSections?(): Promise<FormSection[]>;
  
  /**
   * Calculate form progress
   * This is used by form components to display progress indicators
   */
  calculateProgress?(formData: Record<string, any>): number;
}
