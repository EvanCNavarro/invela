/**
 * Centralized Form Validation Utilities
 * 
 * This module provides consistent validation logic and error handling
 * across all form types in the application. It ensures users get clear,
 * actionable feedback about validation errors.
 */

import getLogger from './logger';

const logger = getLogger('FormValidation');

// Define validation error types
export type ValidationError = {
  field: string;
  message: string;
  code: string;
  params?: Record<string, any>;
};

export type ValidationResult = true | ValidationError[];

/**
 * Format a validation message with dynamic parameters
 * 
 * @param message The message template with {param} placeholders
 * @param params The parameters to insert into the template
 * @returns Formatted message string
 */
export function formatValidationMessage(message: string, params: Record<string, any> = {}): string {
  return message.replace(/\{([^{}]+)\}/g, (_, key) => {
    const value = params[key];
    return value !== undefined ? String(value) : `{${key}}`;
  });
}

/**
 * Validate that a field is not empty
 * 
 * @param value The value to check
 * @param fieldName The field name for the error message
 * @returns True if valid, or a ValidationError if invalid
 */
export function validateRequired(value: any, fieldName: string): true | ValidationError {
  // Check for null, undefined, empty string, or empty array
  if (value === null || value === undefined || value === '' || 
      (Array.isArray(value) && value.length === 0)) {
    return {
      field: fieldName,
      message: `${fieldName} is required`,
      code: 'required',
    };
  }
  return true;
}

/**
 * Validate that a string meets a minimum length requirement
 * 
 * @param value The string to check
 * @param fieldName The field name for the error message
 * @param minLength The minimum length required
 * @returns True if valid, or a ValidationError if invalid
 */
export function validateMinLength(value: string, fieldName: string, minLength: number): true | ValidationError {
  if (typeof value !== 'string' || value.length < minLength) {
    return {
      field: fieldName,
      message: `${fieldName} must be at least ${minLength} characters`,
      code: 'min_length',
      params: { minLength },
    };
  }
  return true;
}

/**
 * Validate that a string does not exceed a maximum length
 * 
 * @param value The string to check
 * @param fieldName The field name for the error message
 * @param maxLength The maximum length allowed
 * @returns True if valid, or a ValidationError if invalid
 */
export function validateMaxLength(value: string, fieldName: string, maxLength: number): true | ValidationError {
  if (typeof value === 'string' && value.length > maxLength) {
    return {
      field: fieldName,
      message: `${fieldName} must be no more than ${maxLength} characters`,
      code: 'max_length',
      params: { maxLength },
    };
  }
  return true;
}

/**
 * Validate that a value matches a regular expression pattern
 * 
 * @param value The value to check
 * @param fieldName The field name for the error message
 * @param pattern The regex pattern to match
 * @param errorMessage Custom error message
 * @returns True if valid, or a ValidationError if invalid
 */
export function validatePattern(value: string, fieldName: string, pattern: RegExp, errorMessage?: string): true | ValidationError {
  if (typeof value === 'string' && !pattern.test(value)) {
    return {
      field: fieldName,
      message: errorMessage || `${fieldName} is not in the correct format`,
      code: 'pattern',
      params: { pattern: pattern.toString() },
    };
  }
  return true;
}

/**
 * Validate that a value is in a specified range
 * 
 * @param value The number to check
 * @param fieldName The field name for the error message
 * @param min The minimum allowed value
 * @param max The maximum allowed value
 * @returns True if valid, or a ValidationError if invalid
 */
export function validateRange(value: number, fieldName: string, min?: number, max?: number): true | ValidationError {
  if (typeof value !== 'number' || isNaN(value)) {
    return {
      field: fieldName,
      message: `${fieldName} must be a valid number`,
      code: 'not_a_number',
    };
  }
  
  if (min !== undefined && value < min) {
    return {
      field: fieldName,
      message: `${fieldName} must be at least ${min}`,
      code: 'min_value',
      params: { min },
    };
  }
  
  if (max !== undefined && value > max) {
    return {
      field: fieldName,
      message: `${fieldName} must be no more than ${max}`,
      code: 'max_value',
      params: { max },
    };
  }
  
  return true;
}

/**
 * Validate that a value is in a list of allowed values
 * 
 * @param value The value to check
 * @param fieldName The field name for the error message
 * @param allowedValues Array of allowed values
 * @returns True if valid, or a ValidationError if invalid
 */
export function validateAllowedValues(value: any, fieldName: string, allowedValues: any[]): true | ValidationError {
  if (!allowedValues.includes(value)) {
    return {
      field: fieldName,
      message: `${fieldName} must be one of the allowed values`,
      code: 'allowed_values',
      params: { allowedValues },
    };
  }
  return true;
}

/**
 * Validate that a value is a valid email address
 * 
 * @param value The email to check
 * @param fieldName The field name for the error message
 * @returns True if valid, or a ValidationError if invalid
 */
export function validateEmail(value: string, fieldName: string): true | ValidationError {
  // Simple email validation regex - production use would need more robust validation
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return validatePattern(value, fieldName, emailPattern, `${fieldName} must be a valid email address`);
}

/**
 * Validate that two fields have matching values
 * 
 * @param value1 The first value
 * @param value2 The second value to compare
 * @param field1Name The name of the first field
 * @param field2Name The name of the second field
 * @returns True if valid, or a ValidationError if invalid
 */
export function validateFieldsMatch(value1: any, value2: any, field1Name: string, field2Name: string): true | ValidationError {
  if (value1 !== value2) {
    return {
      field: field2Name,
      message: `${field2Name} must match ${field1Name}`,
      code: 'fields_match',
      params: { field1Name, field2Name },
    };
  }
  return true;
}

/**
 * Validate that at least one of the specified fields has a value
 * 
 * @param formData Form data object
 * @param fieldNames Array of field names to check
 * @returns True if valid, or a ValidationError if invalid
 */
export function validateAtLeastOne(formData: Record<string, any>, fieldNames: string[]): true | ValidationError {
  const hasValue = fieldNames.some(fieldName => {
    const value = formData[fieldName];
    return value !== null && value !== undefined && value !== '';
  });
  
  if (!hasValue) {
    return {
      field: fieldNames[0], // Use the first field for the error
      message: `At least one of the following fields is required: ${fieldNames.join(', ')}`,
      code: 'at_least_one',
      params: { fields: fieldNames },
    };
  }
  
  return true;
}

/**
 * Run multiple validations and collect all errors
 * 
 * @param validations Array of validation results
 * @returns True if all validations pass, or array of ValidationErrors
 */
export function validateAll(validations: (true | ValidationError)[]): ValidationResult {
  const errors = validations.filter(result => result !== true) as ValidationError[];
  return errors.length === 0 ? true : errors;
}

/**
 * Apply all validation rules to a form
 * 
 * @param formData Form data to validate
 * @param validationRules Map of field names to validation functions
 * @returns Validation result (true or array of errors)
 */
export function validateForm(
  formData: Record<string, any>,
  validationRules: Record<string, ((value: any) => true | ValidationError)[]>
): ValidationResult {
  const allErrors: ValidationError[] = [];
  
  // Apply validation rules for each field
  for (const [fieldName, validations] of Object.entries(validationRules)) {
    const value = formData[fieldName];
    
    // Run all validations for this field
    for (const validate of validations) {
      const result = validate(value);
      if (result !== true) {
        allErrors.push(result);
        // Stop validating this field after the first error
        break;
      }
    }
  }
  
  // Log validation results
  if (allErrors.length > 0) {
    logger.info(`Form validation failed with ${allErrors.length} errors`, {
      errors: allErrors.map(e => ({ field: e.field, code: e.code, message: e.message })),
    });
  } else {
    logger.info('Form validation passed');
  }
  
  return allErrors.length === 0 ? true : allErrors;
}

/**
 * Format validation errors for display
 * 
 * @param errors Array of validation errors
 * @returns Map of field names to error messages
 */
export function formatValidationErrors(errors: ValidationError[]): Record<string, string> {
  const errorMap: Record<string, string> = {};
  
  for (const error of errors) {
    errorMap[error.field] = error.message;
  }
  
  return errorMap;
}

/**
 * Create a required field validator
 * 
 * @param fieldName The name of the field for error messages
 * @returns Validation function
 */
export function required(fieldName: string) {
  return (value: any) => validateRequired(value, fieldName);
}

/**
 * Create a minimum length validator
 * 
 * @param fieldName The name of the field for error messages
 * @param minLength The minimum required length
 * @returns Validation function
 */
export function minLength(fieldName: string, minLength: number) {
  return (value: string) => validateMinLength(value, fieldName, minLength);
}

/**
 * Create a maximum length validator
 * 
 * @param fieldName The name of the field for error messages
 * @param maxLength The maximum allowed length
 * @returns Validation function
 */
export function maxLength(fieldName: string, maxLength: number) {
  return (value: string) => validateMaxLength(value, fieldName, maxLength);
}

/**
 * Create a pattern validator
 * 
 * @param fieldName The name of the field for error messages
 * @param pattern The regex pattern to match
 * @param errorMessage Optional custom error message
 * @returns Validation function
 */
export function pattern(fieldName: string, pattern: RegExp, errorMessage?: string) {
  return (value: string) => validatePattern(value, fieldName, pattern, errorMessage);
}

/**
 * Create a range validator
 * 
 * @param fieldName The name of the field for error messages
 * @param min Optional minimum value
 * @param max Optional maximum value
 * @returns Validation function
 */
export function range(fieldName: string, min?: number, max?: number) {
  return (value: number) => validateRange(value, fieldName, min, max);
}

/**
 * Create an allowed values validator
 * 
 * @param fieldName The name of the field for error messages
 * @param allowedValues Array of allowed values
 * @returns Validation function
 */
export function allowedValues(fieldName: string, allowedValues: any[]) {
  return (value: any) => validateAllowedValues(value, fieldName, allowedValues);
}

/**
 * Create an email validator
 * 
 * @param fieldName The name of the field for error messages
 * @returns Validation function
 */
export function email(fieldName: string) {
  return (value: string) => validateEmail(value, fieldName);
}
