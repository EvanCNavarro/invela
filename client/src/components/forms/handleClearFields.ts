/**
 * Enhanced Universal Form Clear Fields Utility
 * 
 * This file provides a standardized approach to clear fields for any form type.
 * It handles KYB, KY3P, and Open Banking forms using the appropriate endpoints
 * with robust error handling and fallback mechanisms.
 */

import type { FormField as ServiceFormField } from '@/services/formService';
import type { FormField as ComponentFormField } from './types';

// Extended interface that includes additional properties we need
interface ExtendedFormService {
  taskId?: number;
  formType?: string;
  originalService?: {
    taskId?: number;
    formType?: string;
  };
}

// Combined interface that includes both the original FormServiceInterface and our extensions
type FormServiceInterface = ExtendedFormService & {
  // Add any other required methods from FormServiceInterface here
};
import getLogger from '@/utils/logger';
import { showClearFieldsToast } from '@/hooks/use-unified-toast';

const logger = getLogger('ClearFields');

/**
 * CRITICAL FIX FOR KY3P FORM CLEARING
 *
 * We've identified similar issues with clearing fields as we found with demo auto-fill.
 * The server successfully processes requests but client-side code doesn't always recognize
 * the success. This implementation uses multiple approaches with better error handling.
 */

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
  fields: ServiceFormField[],
  updateCallback: (fieldId: string, value: any) => void
): Promise<boolean> {
  // Generate a unique operation ID for tracking this operation
  const operationId = `clear_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  try {
    const startTime = Date.now();
    
    logger.info(`[ClearFields][${operationId}] Starting universal clear operation`, {
      operationId,
      timestamp: new Date().toISOString(),
      fieldsCount: fields?.length || 0,
      formServiceType: formService?.constructor?.name || 'unknown'
    });
    
    // Show loading toast
    showClearFieldsToast('loading', 'Clearing form fields...', { operationId: operationId });
    
    // Get task ID in the most reliable way
    const taskId = formService.taskId || (formService as any)?.originalService?.taskId;
    
    if (!taskId) {
      logger.warn(`[ClearFields][${operationId}] Unable to determine task ID from form service`, {
        operationId,
        formServiceType: formService?.constructor?.name,
        formServiceHasTaskId: !!formService.taskId,
        formServiceHasOriginalService: !!(formService as any)?.originalService
      });
    }
    
    // Check if this is a KY3P form by inspecting the form service type
    const isKy3pForm = formService && (
      formService.formType === 'ky3p' || 
      (formService as any)?.constructor?.name === 'KY3PFormService' ||
      (formService as any)?.constructor?.name === 'EnhancedKY3PFormService'
    );
    
    let serverClearSuccess = false;
    
    // Get information about whether this is a form edit session
    const isFormEditing = !!(formService as any)?.isEditing || 
                         !!(formService as any)?.formContext?.isEditing ||
                         document.location.href.includes('/edit');
    
    logger.info(`[ClearFields][${operationId}] Form context analysis`, {
      operationId,
      taskId,
      isKy3pForm,
      isFormEditing,
      detectionMethods: {
        serviceHasEditingFlag: !!(formService as any)?.isEditing,
        contextHasEditingFlag: !!(formService as any)?.formContext?.isEditing,
        urlIncludesEdit: document.location.href.includes('/edit')
      },
      formType: formService.formType || 'unknown'
    });
                       
    // If it's a KY3P form with a task ID, try server-side clearing first
    if (isKy3pForm && taskId) {
      logger.info(`[ClearFields][${operationId}] Detected KY3P form with task ID ${taskId}, using dedicated clear approaches`, {
        operationId,
        taskId,
        isFormEditing,
        preserveProgress: isFormEditing
      });
      
      // IMPORTANT ENHANCEMENT: When form is being edited, we want to preserve progress
      // This fixes the critical bug where form editing resets progress to 0%
      const preserveProgress = isFormEditing;
      
      logger.info(`[ClearFields][${operationId}] Form clear started with preserveProgress=${preserveProgress}`, {
        operationId,
        taskId,
        isFormEditing,
        preserveProgress,
        timestamp: new Date().toISOString()
      });
      
      // Try multiple approaches for maximum reliability
      
      // Approach 1: Use standardized batch update with empty values
      try {
        logger.info(`[ClearFields][${operationId}] Approach 1: Trying standardized batch update with empty values`, {
          operationId,
          taskId,
          preserveProgress
        });
        
        // Import the standardized bulk update function dynamically
        const { standardizedBulkUpdate } = await import('./standardized-ky3p-update');
        
        // Create empty data object for all fields
        const emptyData: Record<string, any> = {};
        let validFieldCount = 0;
        let invalidFieldCount = 0;
        
        // Populate with empty values for each field
        for (const field of fields) {
          // Get field identifier in most reliable way
          const fieldId = field.key || 
                      (field as any).name || 
                      String((field as any).id) || 
                      (field as any).field_key || 
                      '';
          
          if (fieldId) {
            // Choose appropriate empty value based on field type
            const emptyValue = field.type === 'boolean' ? false : 
                              field.type === 'number' ? null : '';
            
            emptyData[fieldId] = emptyValue;
            validFieldCount++;
          } else {
            invalidFieldCount++;
          }
        }
        
        logger.info(`[ClearFields][${operationId}] Prepared empty data for ${validFieldCount} fields (${invalidFieldCount} invalid fields skipped)`, {
          operationId,
          taskId,
          validFieldCount,
          invalidFieldCount,
          fieldIdSampleKeys: Object.keys(emptyData).slice(0, 3),
          totalFieldCount: Object.keys(emptyData).length
        });
        
        // Use standardized bulk update to clear all fields at once
        // Pass preserveProgress flag when form is being edited to prevent progress reset
        const bulkStartTime = Date.now();
        const success = await standardizedBulkUpdate(taskId, emptyData, {
          preserveProgress, // Pass through the preserveProgress flag
          isFormEditing,
          operationId
        });
        const bulkDuration = Date.now() - bulkStartTime;
        
        if (success) {
          logger.info(`[ClearFields][${operationId}] Successfully cleared all fields via standardized bulk update in ${bulkDuration}ms`, {
            operationId,
            taskId,
            preserveProgress,
            durationMs: bulkDuration,
            fieldCount: Object.keys(emptyData).length
          });
          serverClearSuccess = true;
        } else {
          logger.warn(`[ClearFields][${operationId}] Standardized bulk update approach failed after ${bulkDuration}ms`, {
            operationId,
            taskId,
            preserveProgress,
            durationMs: bulkDuration
          });
        }
      } catch (e) {
        // Properly type the error
        const bulkError = e as Error;
        
        logger.warn(`[ClearFields][${operationId}] Error using standardized bulk update:`, bulkError, {
          operationId,
          taskId,
          errorName: bulkError?.name,
          errorMessage: bulkError?.message
        });
      }
      
      // Approach 2: Try direct KY3P clear endpoint if approach 1 failed
      if (!serverClearSuccess) {
        try {
          logger.info(`[ClearFields][${operationId}] Approach 2: Trying dedicated KY3P clear endpoint`, { 
            operationId,
            taskId,
            preserveProgress,
            attempt: 'dedicated-endpoint'
          });
          
          // Construct the URL with the preserveProgress parameter if needed
          let clearUrl = `/api/ky3p/clear-fields/${taskId}`;
          if (preserveProgress) {
            clearUrl += '?preserveProgress=true';
          }
          
          logger.info(`[ClearFields][${operationId}] Calling clear endpoint: ${clearUrl}`, {
            operationId,
            taskId,
            url: clearUrl,
            preserveProgress,
            includesQueryParam: clearUrl.includes('preserveProgress=true'),
            requestStartTime: new Date().toISOString()
          });
          
          // Call the dedicated KY3P clear endpoint directly
          const requestStartTime = Date.now();
          const response = await fetch(clearUrl, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ preserveProgress })
          });
          const requestDuration = Date.now() - requestStartTime;
          
          // Check for server side success
          if (response.ok) {
            let responseData;
            try {
              responseData = await response.json();
              
              logger.info(`[ClearFields][${operationId}] KY3P server-side clear successful in ${requestDuration}ms`, {
                operationId,
                taskId,
                preserveProgress,
                statusCode: response.status,
                durationMs: requestDuration,
                preservedProgress: responseData?.preservedProgress,
                responseData
              });
            } catch (parseError) {
              logger.warn(`[ClearFields][${operationId}] KY3P clear succeeded but couldn't parse response`, {
                operationId,
                taskId,
                parseError: String(parseError),
                responseText: await response.text().catch(() => 'Could not get response text')
              });
            }
            
            serverClearSuccess = true;
          } else {
            let errorDetails;
            try {
              errorDetails = await response.text();
            } catch (e) {
              errorDetails = 'Could not extract error details';
            }
            
            logger.warn(`[ClearFields][${operationId}] KY3P clear endpoint failed with status ${response.status}`, {
              operationId,
              taskId,
              preserveProgress,
              statusCode: response.status,
              statusText: response.statusText,
              durationMs: requestDuration,
              errorDetails
            });
          }
        } catch (e) {
          // Properly type the error
          const clearError = e as Error;
          
          logger.warn(`[ClearFields][${operationId}] Error calling KY3P clear endpoint:`, clearError, {
            operationId,
            taskId,
            preserveProgress,
            errorName: clearError?.name,
            errorMessage: clearError?.message
          });
        }
      }
      
      // Approach 3: Try alternative clear endpoint if other approaches failed
      if (!serverClearSuccess) {
        try {
          logger.info(`[ClearFields][${operationId}] Approach 3: Trying alternative task clear endpoint`, { 
            operationId,
            taskId,
            preserveProgress,
            attempt: 'fallback-endpoint',
            previousAttemptsFailed: true
          });
          
          // Try the generic task clear endpoint as a fallback
          // For KY3P tasks, also include preserveProgress in query and body
          let clearUrl = `/api/tasks/${taskId}/clear`;
          if (preserveProgress) {
            clearUrl += '?preserveProgress=true';
          }
          
          logger.info(`[ClearFields][${operationId}] Calling fallback endpoint: ${clearUrl}`, {
            operationId,
            taskId,
            url: clearUrl,
            preserveProgress,
            includesQueryParam: clearUrl.includes('preserveProgress=true'),
            requestStartTime: new Date().toISOString()
          });
          
          const fallbackStartTime = Date.now();
          const response = await fetch(clearUrl, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ preserveProgress, taskId, formType: 'ky3p' })
          });
          const fallbackDuration = Date.now() - fallbackStartTime;
          
          if (response.ok) {
            let responseData;
            try {
              responseData = await response.json();
            } catch (e) {
              // Ignore JSON parse errors for the fallback endpoint
            }
            
            logger.info(`[ClearFields][${operationId}] Alternative clear endpoint successful in ${fallbackDuration}ms`, {
              operationId,
              taskId,
              preserveProgress,
              statusCode: response.status,
              durationMs: fallbackDuration,
              responseData
            });
            serverClearSuccess = true;
          } else {
            let errorDetails;
            try {
              errorDetails = await response.text();
            } catch (e) {
              errorDetails = 'Could not extract error details';
            }
            
            logger.warn(`[ClearFields][${operationId}] Alternative clear endpoint failed with status ${response.status}`, {
              operationId,
              taskId,
              preserveProgress,
              statusCode: response.status,
              statusText: response.statusText,
              durationMs: fallbackDuration,
              errorDetails
            });
          }
        } catch (e) {
          // Properly type the error
          const altError = e as Error;
          
          logger.warn(`[ClearFields][${operationId}] Error calling alternative clear endpoint:`, altError, {
            operationId,
            taskId, 
            preserveProgress,
            errorName: altError?.name,
            errorMessage: altError?.message
          });
        }
      }
      
      // Log the final outcome of server-side clearing attempts
      logger.info(`[ClearFields][${operationId}] Server-side clearing result: ${serverClearSuccess ? 'SUCCESS' : 'FAILED'}`, {
        operationId,
        taskId,
        preserveProgress,
        serverClearSuccess,
        isKy3pForm,
        isFormEditing
      });
    }
    
    // Always update the UI regardless of server response
    // This ensures the form looks cleared even if server operations failed
    logger.info(`[ClearFields][${operationId}] Updating UI with empty values for all fields`, {
      operationId,
      fieldCount: fields?.length || 0,
      hasServerSuccess: serverClearSuccess
    });
    
    let clearedFieldCount = 0;
    let errorFieldCount = 0;
    let skippedFieldCount = 0;
    
    const uiUpdateStartTime = Date.now();
    
    for (const field of fields) {
      // Get the field ID in the most reliable way using FormField interface
      const fieldId = (field as any).key || 
                     (field as FormField).name || 
                     String((field as any).id) || 
                     (field as any).field_key || 
                     (field as any).fieldId || 
                     '';
      
      if (!fieldId) {
        logger.warn(`[ClearFields][${operationId}] Field with no valid identifier found, skipping`, {
          operationId,
          fieldType: field.type,
          fieldLabel: field.label,
          fieldObject: field
        });
        skippedFieldCount++;
        continue;
      }
      
      try {
        // Choose appropriate empty value based on field type
        const emptyValue = field.type === 'boolean' ? false : 
                          field.type === 'number' ? null : '';
                          
        // Update the field using callback
        updateCallback(fieldId, emptyValue);
        clearedFieldCount++;
      } catch (error) {
        logger.warn(`[ClearFields][${operationId}] Error clearing field ${fieldId}:`, error, {
          operationId,
          fieldId,
          fieldType: field.type,
          error: String(error)
        });
        errorFieldCount++;
      }
    }
    
    const uiUpdateDuration = Date.now() - uiUpdateStartTime;
    
    logger.info(`[ClearFields][${operationId}] Form clearing completed in ${Date.now() - startTime}ms`, {
      operationId,
      taskId,
      serverClearSuccess,
      preserveProgress: isFormEditing,
      uiUpdateDurationMs: uiUpdateDuration,
      totalDurationMs: Date.now() - startTime,
      clearedFieldCount,
      errorFieldCount,
      skippedFieldCount,
      totalProcessed: clearedFieldCount + errorFieldCount + skippedFieldCount
    });
    
    // Show success toast using the current operation ID
    showClearFieldsToast('success', 'Form fields cleared successfully', { operationId: operationId });
    
    return true;
  } catch (e) {
    // Properly type the error
    const error = e as Error;
    
    logger.error(`[ClearFields][${operationId}] Error in handleClearFieldsUtil:`, error, {
      operationId,
      errorName: error?.name,
      errorMessage: error?.message,
      stack: error?.stack
    });
    
    // Show error toast
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    showClearFieldsToast('error', errorMessage, { operationId: operationId });
    
    return false;
  }
}

/**
 * Clear fields directly via API for any form type
 * 
 * @param taskId The task ID
 * @param formType The form type (kyb, ky3p, open_banking)
 * @param options Additional options for the clear operation
 * @returns Result of the clearing operation
 */
export async function directClearFields(
  taskId: number,
  formType: string,
  options: {
    preserveProgress?: boolean;
    isFormEditing?: boolean;
    operationId?: string;
    skipToasts?: boolean;
  } = {}
): Promise<{
  success: boolean;
  message: string;
  taskId: number;
  preservedProgress?: number;
}> {
  const operationId = options.operationId || `clear_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const startTime = Date.now();
  
  try {
    logger.info(`[DirectClearFields][${operationId}] Starting direct clear operation`, {
      operationId,
      taskId,
      formType,
      preserveProgress: options.preserveProgress,
      isFormEditing: options.isFormEditing,
      timestamp: new Date().toISOString()
    });
    
    // Show loading toast unless skipToasts is true
    if (!options.skipToasts) {
      showClearFieldsToast('loading', `Clearing fields for ${formType} task...`, { operationId: operationId });
    }
    
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
    
    logger.info(`[DirectClearFields][${operationId}] Selected endpoint ${apiEndpoint} for task ${taskId}`, {
      operationId,
      taskId,
      formType,
      normalizedFormType,
      endpoint: apiEndpoint
    });
    
    // Determine if we should preserve progress (for KY3P form editing)
    const preserveProgress = options.preserveProgress || options.isFormEditing;
    
    // For KY3P forms, add preserveProgress parameter when needed
    const isKy3pForm = normalizedFormType === 'ky3p' || 
                       normalizedFormType === 'sp-ky3p-assessment' ||
                       normalizedFormType === 'security-assessment' ||
                       normalizedFormType === 'security';
                       
    // Log what we're doing
    if (isKy3pForm && preserveProgress) {
      logger.info(`[DirectClearFields][${operationId}] KY3P form with preserveProgress=true for task ${taskId}`, {
        operationId,
        taskId,
        formType: normalizedFormType,
        preserveProgress,
        isFormEditing: options.isFormEditing
      });
    }
    
    // Add query parameter for KY3P forms when preserving progress
    if (isKy3pForm && preserveProgress) {
      // Add the preserveProgress parameter to the URL
      if (!apiEndpoint.includes('?')) {
        apiEndpoint += '?preserveProgress=true';
      } else {
        apiEndpoint += '&preserveProgress=true';
      }
      
      // Add operation ID for tracing
      apiEndpoint += `&opId=${encodeURIComponent(operationId)}`;
    } else if (!apiEndpoint.includes('?')) {
      apiEndpoint += `?opId=${encodeURIComponent(operationId)}`;
    } else {
      apiEndpoint += `&opId=${encodeURIComponent(operationId)}`;
    }
    
    logger.info(`[DirectClearFields][${operationId}] Final endpoint URL: ${apiEndpoint}`, {
      operationId,
      taskId,
      url: apiEndpoint,
      preserveProgressInQuery: apiEndpoint.includes('preserveProgress=true'),
      operationIdInQuery: apiEndpoint.includes('opId=')
    });
    
    // Call the API to clear the fields
    logger.info(`[DirectClearFields][${operationId}] Sending clear request to ${apiEndpoint}`, {
      operationId,
      taskId,
      requestStartTime: new Date().toISOString(),
      preserveProgress,
      isKy3pForm
    });
    
    const requestStartTime = Date.now();
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Operation-ID': operationId
      },
      body: isKy3pForm ? JSON.stringify({ preserveProgress, operationId }) : undefined,
      credentials: 'include' // Important to include credentials for authentication
    });
    const requestDuration = Date.now() - requestStartTime;
    
    if (!response.ok) {
      let errorMessage = `Server error: ${response.status} ${response.statusText}`;
      let errorDetails = null;
      
      try {
        // Try to get more detailed error information
        if (typeof response.json === 'function') {
          const errorData = await response.json().catch(() => null);
          if (errorData && errorData.message) {
            errorMessage = `Server error: ${errorData.message}`;
            errorDetails = errorData;
          }
        } else if (typeof response.text === 'function') {
          const errorText = await response.text().catch(() => null);
          if (errorText) {
            errorMessage = `Server error: ${errorText}`;
            errorDetails = errorText;
          }
        }
      } catch (parseError) {
        logger.warn(`[DirectClearFields][${operationId}] Could not parse error response:`, parseError, {
          operationId,
          taskId,
          error: String(parseError),
          statusCode: response.status
        });
      }
      
      logger.error(`[DirectClearFields][${operationId}] API error: ${response.status} ${response.statusText}`, {
        operationId,
        taskId,
        statusCode: response.status,
        statusText: response.statusText,
        durationMs: requestDuration,
        errorMessage,
        errorDetails,
        preserveProgress
      });
      
      // Show error toast unless skipToasts is true
      if (!options.skipToasts) {
        showClearFieldsToast('error', errorMessage, { operationId: operationId });
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
      logger.info(`[DirectClearFields][${operationId}] Successfully cleared task ${taskId} in ${requestDuration}ms:`, {
        operationId,
        taskId,
        durationMs: requestDuration,
        preserveProgress,
        result,
        preservedProgress: result?.preservedProgress
      });
      
      // Show success toast unless skipToasts is true
      if (!options.skipToasts) {
        showClearFieldsToast('success', `Successfully cleared ${formType} fields`, { operationId: operationId });
      }
    } catch (jsonError) {
      logger.warn(`[DirectClearFields][${operationId}] Could not parse JSON response:`, jsonError, {
        operationId,
        taskId,
        error: String(jsonError),
        statusCode: response.status
      });
      // Continue despite JSON parsing error
      result = { success: true };
    }
    
    // Extract the preserved progress if available
    const preservedProgress = result?.preservedProgress || undefined;
    
    const successResult = {
      success: true,
      message: `Successfully cleared ${formType} fields for task ${taskId}${preserveProgress ? ' (preserved progress)' : ''}`,
      taskId,
      preservedProgress,
      operationId,
      durationMs: Date.now() - startTime
    };
    
    logger.info(`[DirectClearFields][${operationId}] Operation complete in ${Date.now() - startTime}ms`, {
      operationId,
      taskId,
      preserveProgress,
      totalDurationMs: Date.now() - startTime,
      preservedProgress
    });
    
    return successResult;
  } catch (e) {
    // Properly type the error
    const error = e as Error;
    
    logger.error(`[DirectClearFields][${operationId}] Error clearing task ${taskId}:`, error, {
      operationId,
      taskId,
      totalDurationMs: Date.now() - startTime,
      errorName: error?.name,
      errorMessage: error?.message,
      preserveProgress: options.preserveProgress
    });
    
    // Show error toast unless skipToasts is true
    if (!options.skipToasts) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      showClearFieldsToast('error', errorMessage, { operationId: operationId });
    }
    
    throw error;
  }
}