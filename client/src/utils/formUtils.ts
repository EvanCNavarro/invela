/**
 * ========================================
 * Form Utilities - Form Processing & Validation
 * ========================================
 * 
 * Comprehensive form utility functions providing field sorting, validation,
 * component type determination, and form processing helpers. Supports the
 * enterprise form system with consistent field ordering and type resolution.
 * 
 * Key Features:
 * - Field and section sorting by order property
 * - Dynamic component type resolution
 * - Form validation helpers with Zod integration
 * - Consistent field processing across form types
 * - Type-safe field operations
 * 
 * Supported Form Types:
 * - KYB assessment forms
 * - KY3P evaluation forms
 * - Open Banking compliance forms
 * - Custom enterprise form templates
 * 
 * @module utils/formUtils
 * @version 1.0.0
 * @since 2025-05-23
 */

import { z } from 'zod';
import { FormField, FormSection } from '@/services/formService';

/**
 * Sort form fields by their order property
 * @param fields Array of form fields to sort
 * @returns Sorted array of form fields
 */
export const sortFields = (fields: FormField[]): FormField[] => {
  return [...fields].sort((a, b) => a.order - b.order);
};

/**
 * Sort form sections by their order property
 * @param sections Array of form sections to sort
 * @returns Sorted array of form sections
 */
export const sortSections = (sections: FormSection[]): FormSection[] => {
  return [...sections].sort((a, b) => a.order - b.order);
};

/**
 * Get the appropriate field component type based on field properties and default
 * @param field Form field
 * @param defaultType Default field type to use if none is specified
 * @returns Component type string
 */
export const getFieldComponentType = (field: FormField, defaultType: string = 'single-line'): string => {
  // Use field's type if it exists and is one of supported types
  if (field.type && [
    'single-line',
    'multi-line',
    'number',
    'email',
    'phone',
    'date',
    'time',
    'datetime',
    'select',
    'multi-select',
    'radio',
    'checkbox',
    'switch',
    'file',
    'password',
    'rating',
    'slider',
    'color',
    'address',
    'country',
    'currency',
    'yes-no'
  ].includes(field.type)) {
    return field.type;
  }
  
  // Otherwise infer from validation rules or other field properties
  if (field.validation) {
    // If has options property, probably a select or radio field
    if (field.options && field.options.length > 0) {
      return 'select';
    }
    
    // Check validation for email
    if (field.validation.pattern && field.validation.pattern.includes('@')) {
      return 'email';
    }
    
    // Check for phone format validation
    if (field.validation.pattern && (
      field.validation.pattern.includes('phone') || 
      field.key.toLowerCase().includes('phone')
    )) {
      return 'phone';
    }
    
    // Field name hints
    const key = field.key.toLowerCase();
    
    if (key.includes('date')) return 'date';
    if (key.includes('time') && !key.includes('date')) return 'time';
    if (key.includes('email')) return 'email';
    if (key.includes('phone')) return 'phone';
    if (key.includes('color')) return 'color';
    if (key.includes('country')) return 'country';
    if (key.includes('address')) return 'address';
    if (key.includes('password')) return 'password';
    if (key.includes('description') || key.includes('notes') || key.includes('comment')) {
      return 'multi-line';
    }
    
    // Handle boolean types
    if (key.includes('is_') || key.includes('has_') || key.includes('enable') || 
        key.includes('active') || key.includes('allow')) {
      return 'switch';
    }
    
    if (key.includes('yes_no') || key.includes('yesno')) {
      return 'yes-no';
    }
    
    // If requires a long answer (from label or placeholder text)
    const textHints = [field.label, field.placeholder].filter(Boolean).join(' ').toLowerCase();
    if (textHints.includes('describe') || 
        textHints.includes('explain') || 
        textHints.includes('detail') ||
        textHints.includes('elaborate')) {
      return 'multi-line';
    }
  }
  
  // If we haven't determined the type yet, return the default
  return defaultType;
};

/**
 * Create a Zod schema for form validation based on field definitions
 * @param fields Array of form fields
 * @returns Zod schema for form validation
 */
export const createFormSchema = (fields: FormField[]): z.ZodType<any> => {
  const schema: Record<string, z.ZodTypeAny> = {};
  
  for (const field of fields) {
    const { key, validation } = field;
    
    // Start with a basic schema for the field type
    let fieldSchema: z.ZodTypeAny;
    
    switch (field.type) {
      case 'number':
        fieldSchema = z.number();
        break;
      case 'date':
      case 'time':
      case 'datetime':
        fieldSchema = z.string(); // We'll validate date strings
        break;
      case 'checkbox':
      case 'switch':
        fieldSchema = z.boolean();
        break;
      case 'multi-select':
        fieldSchema = z.array(z.string());
        break;
      default:
        fieldSchema = z.string();
    }
    
    // Apply validation rules if defined
    if (validation) {
      if (field.type === 'number') {
        // Apply number-specific validations
        if (validation.min !== undefined) {
          fieldSchema = fieldSchema.min(validation.min);
        }
        if (validation.max !== undefined) {
          fieldSchema = fieldSchema.max(validation.max);
        }
      } else if (field.type === 'string' || field.type === 'single-line' || field.type === 'multi-line' || field.type === 'email') {
        // Apply string-specific validations
        if (validation.minLength !== undefined) {
          fieldSchema = fieldSchema.min(validation.minLength);
        }
        if (validation.maxLength !== undefined) {
          fieldSchema = fieldSchema.max(validation.maxLength);
        }
        if (validation.pattern) {
          const pattern = new RegExp(validation.pattern);
          fieldSchema = fieldSchema.regex(pattern, {
            message: validation.message || `Invalid format for ${field.label}`
          });
        }
        if (field.type === 'email') {
          fieldSchema = fieldSchema.email(`Please enter a valid email address`);
        }
      } else if (field.type === 'multi-select') {
        // Apply array-specific validations
        if (validation.minLength !== undefined) {
          fieldSchema = fieldSchema.min(validation.minLength, 
            `Please select at least ${validation.minLength} options`);
        }
        if (validation.maxLength !== undefined) {
          fieldSchema = fieldSchema.max(validation.maxLength, 
            `Please select at most ${validation.maxLength} options`);
        }
      }
      
      // Make required or optional based on validation rules
      if (validation.required) {
        if (typeof fieldSchema.nonempty === 'function') {
          fieldSchema = fieldSchema.nonempty(`${field.label} is required`);
        } else {
          fieldSchema = fieldSchema.refine(val => val !== undefined && val !== null && val !== '', {
            message: `${field.label} is required`
          });
        }
      } else {
        fieldSchema = fieldSchema.optional();
      }
    } else {
      // No validation rules, make it optional
      fieldSchema = fieldSchema.optional();
    }
    
    schema[key] = fieldSchema;
  }
  
  return z.object(schema);
};