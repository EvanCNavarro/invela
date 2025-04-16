/**
 * Interface for form field validation rules
 */
export interface FormFieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  message?: string;
  [key: string]: any;
}

/**
 * Interface for form field
 */
export interface FormField {
  key: string;
  label: string;
  type: string;
  section: string;
  placeholder?: string;
  helpText?: string;
  question?: string;
  default?: any;
  options?: { label: string; value: any }[];
  validation?: FormFieldValidation;
  order: number;
  metadata?: Record<string, any>;
}

/**
 * Interface for form section
 */
export interface FormSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  collapsed: boolean;
  fields: FormField[];
}

/**
 * Generic form data type
 */
export type FormData = Record<string, any>;

/**
 * Interface for form submission options
 */
export interface FormSubmitOptions {
  taskId?: number;
  templateId?: number;
  fileName?: string;
  [key: string]: any;
}

/**
 * Interface for form services
 * This defines the contract that all form service implementations must follow
 */
export interface FormServiceInterface {
  /**
   * Initialize the form service with a template ID
   * @param templateId ID of the task template
   */
  initialize(templateId: number): Promise<void>;
  
  /**
   * Get all form fields
   * @returns Array of form fields
   */
  getFields(): FormField[];
  
  /**
   * Get all form sections
   * @returns Array of form sections
   */
  getSections(): FormSection[];
  
  /**
   * Load form data into the service
   * @param data Form data to load
   */
  loadFormData(data: FormData): void;
  
  /**
   * Update a specific field in the form data
   * @param fieldKey Field key to update
   * @param value New value for the field
   * @param taskId Optional task ID for immediate saving
   */
  updateFormData(fieldKey: string, value: any, taskId?: number): void;
  
  /**
   * Get the current form data
   * @returns Current form data
   */
  getFormData(): FormData;
  
  /**
   * Calculate form completion progress
   * @returns Percentage of form completion (0-100)
   */
  calculateProgress(): number;
  
  /**
   * Save form progress for a task
   * @param taskId Optional ID of the task
   * @returns Promise that resolves when progress is saved
   */
  saveProgress(taskId?: number): Promise<void>;
  
  /**
   * Load saved progress for a task
   * @param taskId ID of the task
   * @returns Promise that resolves with loaded form data
   */
  loadProgress(taskId: number): Promise<FormData>;
  
  /**
   * Save the form data
   * @param options Form submission options
   * @returns Promise that resolves when form data is saved
   */
  save(options: FormSubmitOptions): Promise<boolean>;
  
  /**
   * Submit the form
   * @param options Form submission options
   * @returns Promise that resolves with submission result
   */
  submit(options: FormSubmitOptions): Promise<any>;
  
  /**
   * Validate form data
   * @param data Form data to validate
   * @returns Validation result (true if valid, error object if invalid)
   */
  validate(data: FormData): boolean | Record<string, string>;
}