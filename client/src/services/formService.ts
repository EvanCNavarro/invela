/**
 * ========================================
 * Form Service - Core Business Logic
 * ========================================
 * 
 * Central form management system for the enterprise risk assessment platform.
 * Provides comprehensive form field definitions, validation rules, and data
 * processing capabilities for KYB, KY3P, and Open Banking forms.
 * 
 * Key Features:
 * - Type-safe form field definitions with validation
 * - Flexible field types and validation rules
 * - Section-based form organization
 * - Enhanced guidance and demo capabilities
 * - Batch processing and optimization
 * - Multi-format compatibility support
 * 
 * Supported Form Types:
 * - Know Your Business (KYB) forms
 * - Know Your Third Party (KY3P) forms
 * - Open Banking integration forms
 * - Custom assessment questionnaires
 * 
 * @module services/formService
 * @version 1.0.0
 * @since 2025-05-23
 */

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Form Field Validation Rules
 * 
 * Comprehensive validation configuration for form fields
 * supporting various validation types and custom rules.
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
  sectionId?: string;    // Alternative to section for compatibility
  placeholder?: string;
  helpText?: string;
  help_text?: string;    // Alternative to helpText for compatibility
  tooltip?: string;      // Tooltip text for field help
  question?: string;
  questionNumber?: number; // Question number for display
  default?: any;
  options?: { label: string; value: any }[];
  validation?: FormFieldValidation;
  order: number;
  metadata?: Record<string, any>;
  
  // Enhanced field guidance properties
  answerExpectation?: string;   // Guidance text for what type of answer is expected
  demoAutofill?: string;        // Sample values for demonstration purposes
  validationType?: string;      // Type of validation/documentation required
  
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