/**
 * Universal Form Service Provider
 * 
 * This module provides an integration point between the UniversalForm component
 * and our enhanced form services. It ensures that the correct form service is
 * used for each form type, and handles bulk updates and demo auto-fill consistently.
 */

import { getFormServiceForTask } from './enhanced-form-provider.ts';
import { fixedUniversalSaveProgress } from './fix-universal-bulk-save.ts';
import getLogger from '@/utils/logger';

const logger = getLogger('UniversalFormServiceProvider');

/**
 * Save form progress using the appropriate form service
 * 
 * This function identifies the form type and uses the appropriate form service
 * to save progress. It standardizes the process across all form types.
 * 
 * @param taskId Task ID
 * @param taskType Task type (e.g., 'kyb', 'ky3p', 'open_banking')
 * @param formData Form data to save
 * @returns Promise resolving to success status
 */
export async function saveFormProgress(
  taskId: number,
  taskType: string,
  formData: Record<string, any>
): Promise<boolean> {
  logger.info(`Saving progress for ${taskType} task ${taskId} (${Object.keys(formData).length} fields)`);
  
  try {
    // First try to use the enhanced form service if available
    const formService = getFormServiceForTask(taskType, taskId);
    
    if (formService) {
      // Update the form service's local data
      formService.loadFormData(formData);
      
      // If it has a bulkUpdate method, use that
      if (typeof (formService as any).bulkUpdate === 'function') {
        logger.info(`Using ${taskType} form service bulkUpdate method`);
        return await (formService as any).bulkUpdate(taskId, formData);
      }
      
      // Otherwise use the standard saveProgress method
      try {
        logger.info(`Using ${taskType} form service saveProgress method`);
        await formService.saveProgress(taskId);
        return true;
      } catch (error) {
        logger.error(`Error using form service saveProgress:`, error);
      }
    }
    
    // Fall back to the fixed universal save progress function
    logger.info(`Falling back to fixedUniversalSaveProgress for ${taskType}`);
    return await fixedUniversalSaveProgress(taskId, taskType, formData, {
      preserveProgress: true,
      source: 'universal-provider'
    });
  } catch (error) {
    logger.error(`Error in saveFormProgress:`, error);
    return false;
  }
}

/**
 * Handle demo auto-fill using the appropriate form service
 * 
 * This function identifies the form type and uses the appropriate form service
 * to handle demo auto-fill. It standardizes the process across all form types.
 * 
 * @param taskId Task ID
 * @param taskType Task type (e.g., 'kyb', 'ky3p', 'open_banking')
 * @returns Promise resolving to demo data or null if failed
 */
export async function handleDemoAutoFill(
  taskId: number,
  taskType: string
): Promise<Record<string, any> | null> {
  logger.info(`Handling demo auto-fill for ${taskType} task ${taskId}`);
  
  try {
    // Try to use the enhanced form provider
    const demoData = await getFormServiceForTask(taskType, taskId)?.getDemoData?.(taskId);
    
    if (demoData) {
      logger.info(`Got demo data from enhanced form service: ${Object.keys(demoData).length} fields`);
      return demoData;
    }
    
    // If we don't have a form service or it doesn't support getDemoData, use the API directly
    logger.info(`No enhanced form service available, using API directly`);
    
    const endpoint = `/api/${taskType.toLowerCase()}/demo-autofill/${taskId}`;
    logger.info(`Fetching from endpoint: ${endpoint}`);
    
    const response = await fetch(endpoint, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`API call failed: ${response.status} - ${errorText}`);
      return null;
    }
    
    const apiDemoData = await response.json();
    logger.info(`Got demo data from API: ${Object.keys(apiDemoData).length} fields`);
    return apiDemoData;
  } catch (error) {
    logger.error(`Error in handleDemoAutoFill:`, error);
    return null;
  }
}

/**
 * Clear form fields using the appropriate form service
 * 
 * This function identifies the form type and uses the appropriate form service
 * to clear form fields. It standardizes the process across all form types.
 * 
 * @param taskId Task ID
 * @param taskType Task type (e.g., 'kyb', 'ky3p', 'open_banking')
 * @returns Promise resolving to success status
 */
export async function clearFormFields(
  taskId: number,
  taskType: string
): Promise<boolean> {
  logger.info(`Clearing fields for ${taskType} task ${taskId}`);
  
  try {
    // Try to use the enhanced form provider
    const formService = getFormServiceForTask(taskType, taskId);
    
    if (formService) {
      // If it has a clearFields method, use that
      if (typeof (formService as any).clearFields === 'function') {
        logger.info(`Using ${taskType} form service clearFields method`);
        return await (formService as any).clearFields(taskId);
      }
      
      // Otherwise use bulkUpdate with empty data if available
      if (typeof (formService as any).bulkUpdate === 'function') {
        logger.info(`Using ${taskType} form service bulkUpdate method with empty data`);
        return await (formService as any).bulkUpdate(taskId, {});
      }
    }
    
    // Fall back to API calls directly
    logger.info(`No form service method available, using API directly`);
    
    const endpoint = `/api/${taskType.toLowerCase()}/clear-fields/${taskId}`;
    logger.info(`Calling endpoint: ${endpoint}`);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`API call failed: ${response.status} - ${errorText}`);
      return false;
    }
    
    logger.info(`Successfully cleared fields via API`);
    return true;
  } catch (error) {
    logger.error(`Error in clearFormFields:`, error);
    return false;
  }
}