/**
 * Form component types
 * 
 * This file defines the shared types used across form components in the application,
 * providing a consistent type system for form field definitions, values, and state.
 */

export interface FormFieldOption {
  label: string;
  value: string;
}

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

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  fields: FormField[];
}

export interface FormErrors {
  [fieldName: string]: string;
}

export interface FormState {
  values: Record<string, any>;
  errors: FormErrors;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
}

export interface FormSubmitResult {
  success: boolean;
  message?: string;
  errors?: FormErrors;
  data?: any;
}

export interface FormFieldChangeEvent {
  name: string;
  value: any;
  field: FormField;
  timestamp: number;
}