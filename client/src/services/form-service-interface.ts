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
   * Clear the service cache
   * This is used to reset the service state when needed
   */
  clearCache(): void;
  
  /**
   * Load saved progress for a task
   * This is used by FormDataManager to retrieve saved form data
   */
  loadProgress?(taskId: number): Promise<Record<string, any>>;
}
