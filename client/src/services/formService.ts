/**
 * ========================================
 * Form Service Module
 * ========================================
 * 
 * Enterprise form management service providing comprehensive
 * form field configuration, validation, and data processing.
 * Handles dynamic form generation, field validation, and
 * structured data collection for enterprise compliance workflows.
 * 
 * Key Features:
 * - Dynamic form field configuration with comprehensive validation
 * - Multi-section form management with ordering and organization
 * - Enterprise validation rules with custom message support
 * - Field guidance and demo data for enhanced user experience
 * - Flexible field types supporting various input requirements
 * - Metadata support for extensible form functionality
 * 
 * Dependencies:
 * - None: Pure TypeScript interfaces and utility functions
 * 
 * @module FormService
 * @version 2.0.0
 * @since 2024-04-15
 */

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Form field validation rules interface for comprehensive data validation
 * 
 * Provides extensive validation configuration supporting various field types
 * with custom validation messages and extensible rule definitions for
 * enterprise-grade form validation and data integrity enforcement.
 */
export interface FormFieldValidation {
  /** Field is required for form submission */
  required?: boolean;
  /** Minimum character length for text inputs */
  minLength?: number;
  /** Maximum character length for text inputs */
  maxLength?: number;
  /** Minimum numeric value for number inputs */
  min?: number;
  /** Maximum numeric value for number inputs */
  max?: number;
  /** Regular expression pattern for input validation */
  pattern?: string;
  /** Custom validation error message */
  message?: string;
  /** Additional validation properties for extensibility */
  [key: string]: any;
}

/**
 * Form field configuration interface for dynamic form generation
 * 
 * Comprehensive field definition supporting various input types,
 * validation rules, section organization, and enhanced user guidance.
 * Enables enterprise-grade form generation with consistent structure
 * and professional user experience across all form implementations.
 */
export interface FormField {
  /** Unique field identifier for data mapping */
  key: string;
  /** Human-readable field label for display */
  label: string;
  /** Input field type (text, number, select, etc.) */
  type: string;
  /** Section name for form organization */
  section: string;
  /** Alternative section identifier for compatibility */
  sectionId?: string;
  /** Placeholder text for input guidance */
  placeholder?: string;
  /** Detailed help text for field assistance */
  helpText?: string;
  /** Alternative help text property for compatibility */
  help_text?: string;
  /** Tooltip text for contextual field help */
  tooltip?: string;
  /** Question text for form questionnaires */
  question?: string;
  /** Question number for ordered display */
  questionNumber?: number;
  /** Default field value */
  default?: any;
  /** Available options for select/radio fields */
  options?: { label: string; value: any }[];
  /** Validation rules configuration */
  validation?: FormFieldValidation;
  /** Display order within section */
  order: number;
  /** Additional field metadata for extensibility */
  metadata?: Record<string, any>;
  
  /** Enhanced field guidance properties for user assistance */
  /** Guidance text for expected answer format */
  answerExpectation?: string;
  /** Sample values for demonstration purposes */
  demoAutofill?: string;
  /** Type of validation/documentation required */
  validationType?: string;
  
  // Optimization properties
  saveImmediately?: boolean;    // Whether field should be saved immediately
  batchUpdaterInitialized?: boolean;  // Whether the batch updater has been initialized for this field
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
 * Interface for timestamped form data
 */
export interface TimestampedFormData {
  values: FormData;
  timestamps: Record<string, number>;
}

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
   * Clear any cached data and force reload
   * Used for demo auto-fill to ensure full refresh
   */
  clearCache?(): void;
  
  /**
   * Load responses directly from the database
   * @returns Record of field keys and values
   */
  loadResponses?(): Promise<Record<string, any>>;
  
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
   * @returns Promise that resolves when the update is complete or void for synchronous implementations
   */
  updateFormData(fieldKey: string, value: any, taskId?: number): Promise<void> | void;
  
  /**
   * Get the current form data
   * @returns Current form data
   */
  getFormData(): FormData;
  
  /**
   * Get the timestamped form data (for enhanced services)
   * @returns Timestamped form data with values and timestamps
   */
  getTimestampedFormData?(): TimestampedFormData;
  
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
   * Get progress status for a task
   * Optional method to retrieve current progress and status
   * @param taskId ID of the task
   * @returns Promise that resolves with task progress and status
   */
  getProgress?(taskId: number): Promise<{
    progress: number;
    status: string;
    formDataKeys?: number;
  }>;
  
  /**
   * Save the form data
   * @param options Form submission options
   * @returns Promise that resolves when form data is saved
   */
  save(options: FormSubmitOptions): Promise<boolean>;
  
  /**
   * Submit the form
   * @param options Form submission options
   * @returns Promise that resolves with standardized submission result
   */
  submit(options: FormSubmitOptions): Promise<{
    success: boolean;
    fileId?: number;
    fileName?: string;
    error?: string;
    details?: string;
  }>;
  
  /**
   * Validate form data
   * @param data Form data to validate
   * @returns Validation result (true if valid, error object if invalid)
   */
  validate(data: FormData): boolean | Record<string, string>;
  
  /**
   * Get demo data for the form
   * @param taskId Optional task ID to customize the demo data
   * @returns Promise that resolves with demo form data
   */
  getDemoData?(taskId?: number): Promise<Record<string, any>>;
  
  /**
   * Check if this form service uses progressive loading
   * @returns True if the form service uses progressive loading
   */
  getIsProgressiveLoading?(): boolean;
  
  /**
   * Load a specific section of the form
   * For progressive loading forms, this loads the fields for a specific section
   * @param sectionId ID of the section to load
   * @returns Promise that resolves with the fields for the section
   */
  loadSection?(sectionId: string): Promise<FormField[]>;
}