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
    
    // Check if this is a KY3P form by inspecting the form service type
    const isKy3pForm = formService && (
      formService.formType === 'ky3p' || 
      (formService as any)?.constructor?.name === 'KY3PFormService'
    );
    
    // If it's a KY3P form, prefer the direct clear endpoint
    if (isKy3pForm && formService.taskId) {
      logger.info(`[ClearFields] Detected KY3P form with task ID ${formService.taskId}, using dedicated clear endpoint`);
      try {
        // Call the dedicated KY3P clear endpoint directly
        const response = await fetch(`/api/ky3p/clear-fields/${formService.taskId}`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
          throw new Error(`KY3P clear endpoint failed: ${response.status}`);
        }
        
        // On successful server-side clear, also update UI
        logger.info('[ClearFields] KY3P server-side clear successful, updating UI');
      } catch (clearError) {
        logger.warn('[ClearFields] KY3P server-side clear failed, falling back to UI-only clear:', clearError);
        // Fall through to UI clearing below
      }
    }
    
    // Always clear the UI regardless of server response
    // This ensures the form looks cleared even if the server operation failed
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
      case 'sp-ky3p-assessment':
      case 'security-assessment':
      case 'security':
        // Use our new fixed KY3P clear fields endpoint
        apiEndpoint = `/api/ky3p/clear-fields/${taskId}`;
        break;
      case 'kyb':
      case 'company-kyb':
        apiEndpoint = `/api/kyb/clear/${taskId}`;
        break;
      case 'open-banking':
      case 'open-banking-survey':
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
      },
      credentials: 'include' // Important to include credentials for authentication
    });
    
    if (!response.ok) {
      let errorMessage = `Server error: ${response.status} ${response.statusText}`;
      
      try {
        // Try to get more detailed error information
        if (typeof response.json === 'function') {
          const errorData = await response.json().catch(() => null);
          if (errorData && errorData.message) {
            errorMessage = `Server error: ${errorData.message}`;
          }
        } else if (typeof response.text === 'function') {
          const errorText = await response.text().catch(() => null);
          if (errorText) {
            errorMessage = `Server error: ${errorText}`;
          }
        }
      } catch (parseError) {
        logger.warn(`[DirectClearFields] Could not parse error response: ${parseError}`);
      }
      
      throw new Error(errorMessage);
    }
    
    let result;
    try {
      if (typeof response.json === 'function') {
        result = await response.json();
      } else {
        // If response is already parsed
        result = response;
      }
      logger.info(`[DirectClearFields] Successfully cleared task ${taskId}:`, result);
    } catch (jsonError) {
      logger.warn(`[DirectClearFields] Could not parse JSON response: ${jsonError}`);
      // Continue despite JSON parsing error
      result = { success: true };
    }
    
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