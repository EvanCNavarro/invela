/**
 * Common form component types
 */

export interface FormField {
  /**
   * Unique identifier for the field
   */
  key: string;
  
  /**
   * Display label for the field
   */
  label: string;
  
  /**
   * Field input type
   */
  type: string;
  
  /**
   * The full question text
   */
  question: string;
  
  /**
   * Whether the field is required
   */
  required: boolean;
  
  /**
   * Display order for the field
   */
  order: number;
  
  /**
   * The ID of the section this field belongs to
   */
  sectionId?: string;
  
  /**
   * Validation rules for the field
   */
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
    [key: string]: any;
  };
  
  /**
   * Help text/instructions for the field
   */
  help?: string;
  
  /**
   * For select/multiple choice fields, the available options
   */
  options?: Array<{
    value: string;
    label: string;
  }>;
  
  /**
   * Additional field metadata
   */
  metadata?: Record<string, any>;
}

export interface FormSection {
  /**
   * Unique identifier for the section
   */
  id: string;
  
  /**
   * Display title for the section
   */
  title: string;
  
  /**
   * Section description
   */
  description: string;
  
  /**
   * Fields in this section
   */
  fields: FormField[];
  
  /**
   * Display order for the section
   */
  order: number;
  
  /**
   * Additional section metadata
   */
  metadata?: Record<string, any>;
}