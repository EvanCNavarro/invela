/**
 * Form Service Interface
 * 
 * This file defines the interface that all form services should implement.
 * Each form type (KYB, CARD, Security) will implement these methods.
 */
import { FormField } from "@/utils/formUtils";

// Defines what every form service should implement
export interface FormServiceInterface {
  // Get all form fields for a specific form type
  getFields: () => Promise<any[]>;
  
  // Group form fields by section/step
  groupFieldsBySection: (fields: any[]) => Record<string, any[]>;
  
  // Convert specific field type to FormField format
  convertToFormField: (field: any) => FormField;
  
  // Save progress for a form
  saveProgress: (taskId: number, progress: number, formData: Record<string, any>) => Promise<any>;
  
  // Get saved progress for a form
  getProgress: (taskId: number) => Promise<{formData: Record<string, any>, progress: number, status?: string}>;
  
  // Submit a completed form
  submitForm: (taskId: number, formData: Record<string, any>, fileName?: string) => Promise<any>;
}

/**
 * Generic function to extract FormField array from API response
 * @param fields Raw field data from API
 * @param converter Function to convert raw field to FormField
 * @returns Array of FormFields
 */
export function convertFieldsToFormFields<T>(
  fields: T[], 
  converter: (field: T) => FormField
): FormField[] {
  return fields.map(field => converter(field));
}

/**
 * Generic function to group form fields by section
 * @param fields Array of form fields
 * @param getGroup Function to extract group from a field
 * @param getOrder Function to extract order from a field
 * @returns Object with groups as keys and arrays of fields as values
 */
export function groupFields<T>(
  fields: T[],
  getGroup: (field: T) => string,
  getOrder: (field: T) => number
): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  
  // Group fields by their group property
  fields.forEach(field => {
    const group = getGroup(field);
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(field);
  });
  
  // Sort fields within each group by their order
  Object.keys(groups).forEach(group => {
    groups[group].sort((a, b) => getOrder(a) - getOrder(b));
  });
  
  return groups;
}