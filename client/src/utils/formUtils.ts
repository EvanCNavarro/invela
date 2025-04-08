/**
 * Form Utilities
 * 
 * This file contains utility functions for the Universal Form Component
 * that are used across different form types (KYB, CARD, Security, etc.)
 */

import { wsService } from "@/lib/websocket";

/**
 * Form Field Definition
 * Generic type for all form fields across different form types
 */
export type FormField = {
  name: string;
  label: string;
  question: string;
  tooltip: string;
  suggestion?: string;
  field_type?: string;
  options?: string[];
};

/**
 * Extract tooltip content from question text
 */
export const formExtractTooltipContent = (text: string): { mainText: string; tooltipText: string | null } => {
  // The main text is the question itself
  const mainText = text;
  // The tooltip text comes from the tooltip property directly
  return {
    mainText,
    tooltipText: null // We don't need to parse the question since we have a separate tooltip field
  };
};

/**
 * Check if a field value is empty
 */
export const formIsEmptyValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * Calculate form completion progress
 */
export const formCalculateProgress = (
  formData: Record<string, any>, 
  fieldNames: string[],
  totalFieldCount?: number
): number => {
  // If formData is undefined or null, return 0
  if (!formData) return 0;
  
  // Calculate total fields count
  const totalFieldsCount = fieldNames.length;
  
  console.log('[Progress Debug] Starting progress calculation:', {
    timestamp: new Date().toISOString(),
    formDataKeys: Object.keys(formData),
    fieldCount: fieldNames.length,
    totalFields: totalFieldCount || totalFieldsCount,
  });

  const filledFields = fieldNames.filter(fieldName => {
    const value = formData[fieldName];
    const isEmpty = formIsEmptyValue(value);
    console.log(`[Progress Debug] Field "${fieldName}":`, {
      value,
      isEmpty,
      type: typeof value,
      validation: value ? 'present' : 'missing'
    });
    return !isEmpty;
  }).length;

  // Use provided total field count or calculate from fields
  const totalFields = totalFieldCount || totalFieldsCount;
  const progress = Math.round((filledFields / totalFields) * 100);
  console.log('[Progress Debug] Final calculation:', {
    filledFields,
    totalFields,
    progress,
    timestamp: new Date().toISOString()
  });
  
  return progress;
};

/**
 * Validate if all fields in a step are completed
 */
export const formValidateStep = (formData: Record<string, unknown>, step: FormField[]): boolean => {
  const result = step.every(field => !formIsEmptyValue(formData[field.name]));
  console.log('Form step validation:', {
    step: step.map(s => s.name),
    formData,
    isValid: result
  });
  return result;
};

/**
 * Find the first incomplete step in a multi-step form
 */
export const formFindFirstIncompleteStep = (
  formData: Record<string, string>,
  formSteps: FormField[][]
): number => {
  for (let i = 0; i < formSteps.length; i++) {
    const step: FormField[] = formSteps[i];
    const isStepValid = formValidateStep(formData, step);
    if (!isStepValid) {
      return i;
    }
  }
  return 0; // Return to first step if all are complete
};

/**
 * Find the first empty field in a form step
 */
export const formFindFirstEmptyField = (step: FormField[], formData: Record<string, string>): string | null => {
  for (const field of step) {
    if (formIsEmptyValue(formData[field.name])) {
      return field.name;
    }
  }
  return null;
};

/**
 * Status determination based on progress thresholds
 */
export const formGetStatusFromProgress = (progress: number): string => {
  console.log('[Status Debug] Determining status for progress:', progress);

  if (progress === 0) return 'NOT_STARTED';
  if (progress === 100) return 'COMPLETED';
  return 'IN_PROGRESS';
};

/**
 * Process a form field suggestion value
 */
export const formProcessSuggestion = (fieldName: string, suggestion: string | undefined, data: any) => {
  console.log('[Form Debug] Processing suggestion:', {
    fieldName,
    suggestionKey: suggestion,
    hasData: !!data,
    availableDataKeys: data ? Object.keys(data) : [],
    rawValue: data?.[suggestion ?? ''],
    timestamp: new Date().toISOString()
  });

  if (!suggestion || !data?.[suggestion]) {
    console.log('[Form Debug] No valid suggestion found:', {
      fieldName,
      suggestion,
      timestamp: new Date().toISOString()
    });
    return undefined;
  }

  // Get the raw value from data
  const value = data[suggestion];
  
  // Format the value based on its type
  let processedValue = '';
  
  if (Array.isArray(value)) {
    // If it's an array, join it with commas
    processedValue = value.join(', ');
  } else if (typeof value === 'string') {
    // If it's a string that looks like a JSON array, clean it up
    if (value.startsWith('{') && value.includes('","')) {
      try {
        // Try to parse as array-like string: {"item1","item2"}
        const cleanedJson = value
          .replace(/^\{/, '[')  // Replace opening {
          .replace(/\}$/, ']')  // Replace closing }
          .replace(/\\"/g, '"'); // Replace escaped quotes
        
        // Parse the modified JSON
        const parsed = JSON.parse(cleanedJson);
        
        // Join the array with commas
        if (Array.isArray(parsed)) {
          processedValue = parsed.join(', ');
        } else {
          processedValue = String(value);
        }
      } catch (e) {
        // If parsing fails, just clean up the JSON-like format
        processedValue = value
          .replace(/^\{"|"\}$/g, '')  // Remove {"..."} wrapping
          .replace(/\\"/g, '"')        // Replace escaped quotes
          .replace(/","/, ', ');       // Replace "," with comma and space
      }
    } else {
      // Regular string
      processedValue = String(value);
    }
  } else {
    // Other types (number, boolean, etc.)
    processedValue = String(value);
  }

  console.log('[Form Debug] Processed suggestion value:', {
    fieldName,
    rawValue: value,
    processedValue,
    valueType: typeof value,
    isArray: Array.isArray(value),
    timestamp: new Date().toISOString()
  });

  return processedValue;
};

/**
 * Send update to WebSocket service about form progress
 */
export const formSendProgressUpdate = async (taskId: number, progress: number, status: string) => {
  if (!taskId) return;
  
  await wsService.send('task_updated', {
    taskId,
    progress,
    status
  });
};

/**
 * Extract field names from form steps
 */
export const formExtractFieldNames = (formSteps: FormField[][]): string[] => {
  return formSteps.reduce((acc, step) => {
    return [...acc, ...step.map(field => field.name)];
  }, [] as string[]);
};

/**
 * Enhanced extract form data from metadata
 */
export const formExtractDataFromMetadata = (
  metadata: Record<string, any>,
  fieldNames: string[]
): Record<string, string> => {
  const formData: Record<string, string> = {};
  
  console.log('[Form Debug] Extracting form data from metadata:', {
    metadataKeys: Object.keys(metadata),
    formFieldNames: fieldNames,
    timestamp: new Date().toISOString()
  });

  // Extract form data from metadata for all supported field names
  fieldNames.forEach(fieldName => {
    const value = metadata[fieldName];
    if (!formIsEmptyValue(value)) {
      formData[fieldName] = String(value).trim();
    }
  });

  return formData;
};