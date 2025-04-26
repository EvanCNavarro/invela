/**
 * Universal Form Clear Fields Utility
 * 
 * This file provides a standard approach to clear fields for any form type.
 * It handles KYB, KY3P, and Open Banking forms using the appropriate endpoints.
 */

import type { FormServiceInterface, FormField } from '@/services/formService';

// Simple console logger for direct clear operations
const logger = {
  info: (message: string, ...args: any[]) => console.log(`%c${message}`, 'color: #2196F3', ...args),
  error: (message: string, ...args: any[]) => console.error(`%c${message}`, 'color: #F44336', ...args),
  warn: (message: string, ...args: any[]) => console.warn(`%c${message}`, 'color: #FF9800', ...args),
};

/**
 * Clear all fields in a form using the most appropriate method
 * 
 * @param formService The form service instance
 * @param fields List of form fields
 * @param updateCallback Callback to update field values in the UI
 * @returns Whether the clear operation was successful
 */
export async function handleClearFieldsUtil(
  formService: FormServiceInterface,
  fields: FormField[],
  updateCallback: (fieldId: string, value: any) => void
): Promise<boolean> {
  try {
    logger.info('[ClearFields] Starting universal clear operation');
    
    // Clear all fields one by one
    for (const field of fields) {
      // Get the field ID in the most reliable way
      const fieldId = field.key || 
                     (field as any).name || 
                     String((field as any).id) || 
                     (field as any).field_key || 
                     '';
      
      if (!fieldId) {
        logger.warn('[ClearFields] Field with no valid identifier found, skipping', field);
        continue;
      }
      
      try {
        // Choose appropriate empty value based on field type
        const emptyValue = field.type === 'boolean' ? false : 
                          field.type === 'number' ? null : '';
                          
        // Update the field using callback
        updateCallback(fieldId, emptyValue);
      } catch (error) {
        logger.warn(`[ClearFields] Error clearing field ${fieldId}:`, error);
      }
    }
    
    return true;
  } catch (error) {
    logger.error('[ClearFields] Error in handleClearFieldsUtil:', error);
    return false;
  }
}

/**
 * Clear fields directly via API for any form type
 * 
 * @param taskId The task ID
 * @param formType The form type (kyb, ky3p, open_banking)
 * @returns Result of the clearing operation
 */
export async function directClearFields(
  taskId: number,
  formType: string
): Promise<{
  success: boolean;
  message: string;
  taskId: number;
}> {
  try {
    const normalizedFormType = formType.toLowerCase().replace('_', '-');
    let apiEndpoint: string;
    
    // Determine the appropriate endpoint based on form type
    switch (normalizedFormType) {
      case 'ky3p':
        apiEndpoint = `/api/ky3p/clear/${taskId}`;
        break;
      case 'kyb':
      case 'company-kyb':
        apiEndpoint = `/api/kyb/clear/${taskId}`;
        break;
      case 'open-banking':
        apiEndpoint = `/api/open-banking/clear/${taskId}`;
        break;
      default:
        apiEndpoint = `/api/tasks/${taskId}/clear`;
    }
    
    logger.info(`[DirectClearFields] Using endpoint ${apiEndpoint} for task ${taskId}`);
    
    // Call the API to clear the fields
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`Server error: ${errorData.message || response.statusText}`);
    }
    
    const result = await response.json();
    logger.info(`[DirectClearFields] Successfully cleared task ${taskId}:`, result);
    
    return {
      success: true,
      message: `Successfully cleared ${formType} fields for task ${taskId}`,
      taskId
    };
  } catch (error) {
    logger.error(`[DirectClearFields] Error clearing task ${taskId}:`, error);
    throw error;
  }
}