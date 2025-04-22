/**
 * Form Types
 * 
 * This file contains type definitions for form handling
 */

export type FormFieldType = 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date' | 'file' | 'multiselect' | 'number';

export type FormStatus = 'incomplete' | 'in-progress' | 'complete';

export type TaskStatus = 'not_started' | 'in_progress' | 'ready_for_submission' | 'submitted' | 'approved' | 'rejected';

export interface FormField {
  id: number;
  key: string;
  label: string;
  description: string;
  type: FormFieldType | string;
  section: string;
  required: boolean;
  value?: any;
  status?: string;
  order: number;
  helpText?: string;
  demoAutofill?: any;
  validation?: {
    type: string;
    rules: Record<string, any>;
  };
  options?: { label: string; value: string }[];
  [key: string]: any;
}

export interface FormSection {
  id: string;
  title: string;
  description: string;
  fields: string[];
  order: number;
  status: FormStatus;
}

export interface FormValidationError {
  field: string;
  message: string;
}

export interface FormSubmissionResult {
  success: boolean;
  errors?: FormValidationError[];
  message?: string;
}

export interface FormServiceInterface {
  initialize(): Promise<boolean>;
  getFields(): FormField[];
  getSections(): FormSection[];
  updateField(key: string, value: any): Promise<boolean>;
  getProgress(): number;
  getDemoData(): Promise<Record<string, any>>;
  bulkUpdateFields?(data: Record<string, any>): Promise<boolean>;
}