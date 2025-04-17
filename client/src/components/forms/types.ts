/**
 * Form Types
 * 
 * This file contains types and interfaces used across form components
 */

// Form field option (for select, radio, checkbox groups)
export interface FormFieldOption {
  label: string;
  value: string;
}

// Base form field definition
export interface FormField {
  name: string;
  label: string;
  type: string;
  section?: string;
  required?: boolean;
  placeholder?: string;
  description?: string;
  defaultValue?: any;
  
  // Validation
  min?: number;
  max?: number;
  step?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  
  // Options for select, radio, checkbox groups
  options?: FormFieldOption[];
  
  // Conditional display
  dependsOn?: string;
  showWhen?: string;
  
  // UI customization
  width?: 'full' | 'half' | 'third';
  className?: string;
  disabled?: boolean;
  hidden?: boolean;
  
  // Metadata
  fieldId?: string;
  order?: number;
  priority?: number;
  category?: string;
}

// Form section definition
export interface FormSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  fields: FormField[];
}

// Form validation errors
export interface FormErrors {
  [fieldName: string]: string;
}

// Form state
export interface FormState {
  values: Record<string, any>;
  errors: FormErrors;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
}

// Form submission result
export interface FormSubmitResult {
  success: boolean;
  message?: string;
  errors?: FormErrors;
  data?: any;
}

// Form field change event
export interface FormFieldChangeEvent {
  name: string;
  value: any;
  field: FormField;
  timestamp: number;
}