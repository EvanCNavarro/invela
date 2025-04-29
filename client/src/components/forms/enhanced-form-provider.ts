/**
 * Enhanced Form Provider
 * 
 * This module provides a standardized approach to creating form services
 * for different form types. It ensures that the correct form service
 * implementation is used for each form type.
 * 
 * It specifically solves the KY3P form issue by using the enhanced KY3P
 * form service that uses string-based field keys consistently.
 */

import { createFormService } from '@/services/form-service-factory';
import { FormServiceInterface } from '@/services/formService';
import getLogger from '@/utils/logger';

const logger = getLogger('EnhancedFormProvider');

/**
 * Get the appropriate form service for a task
 * 
 * This function creates the correct form service for a given task type
 * using the form service factory.
 * 
 * @param taskType Type of the task (e.g., 'kyb', 'ky3p', 'open_banking')
 * @param taskId Optional task ID
 * @returns FormServiceInterface instance or null if not supported
 */
export function getFormServiceForTask(
  taskType: string,
  taskId?: number
): FormServiceInterface | null {
  logger.info(`Creating form service for task type: ${taskType}`);
  
  try {
    // Use the form service factory to get the appropriate service
    const formService = createFormService(taskType);
    
    if (!formService) {
      logger.error(`Failed to create form service for task type: ${taskType}`);
      return null;
    }
    
    logger.info(`Successfully created ${taskType} form service`, {
      serviceType: formService.constructor.name
    });
    
    return formService;
  } catch (error) {
    logger.error(`Error creating form service for ${taskType}:`, error);
    return null;
  }
}

/**
 * Handle demo auto-fill using the enhanced form services
 * 
 * This function uses the enhanced form services to handle demo auto-fill
 * consistently across all form types.
 * 
 * @param taskType Form type ('kyb', 'ky3p', 'open_banking')
 * @param taskId Task ID
 * @returns Promise that resolves with the demo data or null if failed
 */
export async function handleEnhancedDemoAutoFill(
  taskType: string,
  taskId: number
): Promise<Record<string, any> | null> {
  logger.info(`Handling enhanced demo auto-fill for ${taskType} task ${taskId}`);
  
  try {
    // Get the appropriate form service
    const formService = getFormServiceForTask(taskType, taskId);
    
    if (!formService) {
      throw new Error(`No form service available for ${taskType}`);
    }
    
    // Check if the form service supports demo auto-fill
    if (typeof formService.getDemoData !== 'function') {
      throw new Error(`Form service for ${taskType} does not support demo auto-fill`);
    }
    
    // Get the demo data from the form service
    const demoData = await formService.getDemoData(taskId);
    
    if (!demoData || Object.keys(demoData).length === 0) {
      throw new Error(`No demo data available for ${taskType}`);
    }
    
    // Log statistics about the demo data
    logger.info(`Retrieved ${Object.keys(demoData).length} demo data fields for ${taskType}`, {
      sampleFields: Object.keys(demoData).slice(0, 5)
    });
    
    return demoData;
  } catch (error) {
    logger.error(`Error in enhanced demo auto-fill:`, error);
    return null;
  }
}

/**
 * Handle form clearing using the enhanced form services
 * 
 * This function uses the enhanced form services to handle form clearing
 * consistently across all form types.
 * 
 * @param taskType Form type ('kyb', 'ky3p', 'open_banking')
 * @param taskId Task ID
 * @returns Promise<boolean> indicating success or failure
 */
export async function handleEnhancedFormClear(
  taskType: string,
  taskId: number
): Promise<boolean> {
  logger.info(`Handling enhanced form clear for ${taskType} task ${taskId}`);
  
  try {
    // Get the appropriate form service
    const formService = getFormServiceForTask(taskType, taskId);
    
    if (!formService) {
      throw new Error(`No form service available for ${taskType}`);
    }
    
    // KY3P forms have a special method for clearing fields
    if (taskType.toLowerCase() === 'ky3p' && typeof (formService as any).clearFields === 'function') {
      logger.info(`Using specialized clearFields method for KY3P task ${taskId}`);
      const success = await (formService as any).clearFields(taskId);
      
      if (success) {
        logger.info(`Successfully cleared fields for KY3P task ${taskId}`);
        return true;
      }
      
      logger.error(`Failed to clear fields for KY3P task ${taskId}`);
      return false;
    }
    
    // For other form types, we just use bulkUpdate with empty data
    if (typeof (formService as any).bulkUpdate === 'function') {
      logger.info(`Using bulkUpdate with empty data for ${taskType} task ${taskId}`);
      const success = await (formService as any).bulkUpdate(taskId, {});
      
      if (success) {
        logger.info(`Successfully cleared fields for ${taskType} task ${taskId}`);
        return true;
      }
      
      logger.error(`Failed to clear fields for ${taskType} task ${taskId}`);
      return false;
    }
    
    // Last resort: Use a generic approach
    try {
      logger.info(`Using saveProgress with empty data for ${taskType} task ${taskId}`);
      await formService.saveProgress(taskId);
      
      logger.info(`Successfully cleared fields for ${taskType} task ${taskId} using saveProgress`);
      return true;
    } catch (error) {
      logger.error(`Error using saveProgress for ${taskType} task ${taskId}:`, error);
      return false;
    }
  } catch (error) {
    logger.error(`Error in enhanced form clear:`, error);
    return false;
  }
}