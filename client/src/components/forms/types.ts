/**
 * ========================================
 * Form Component Types - Type System Foundation
 * ========================================
 * 
 * Comprehensive type definitions for the form system in the enterprise risk assessment platform.
 * Provides a unified type system for form fields, validation, and component state management
 * across KYB, KY3P, and Open Banking form implementations.
 * 
 * Key Features:
 * - Unified form field definition interface
 * - Flexible validation rule configuration
 * - Conditional field display logic
 * - UI customization and styling options
 * - Metadata and ordering support
 * 
 * Type Categories:
 * - FormField: Core field definition with validation
 * - FormFieldOption: Selection options for dropdowns/radio
 * - Validation types: Min/max, length, pattern matching
 * - UI types: Width, visibility, disabled states
 * 
 * @module components/forms/types
 * @version 1.0.0
 * @since 2025-05-23
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