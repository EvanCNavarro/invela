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

import { FormServiceInterface } from '@/services/formService';
import { createFormService } from '@/services/form-service-factory';
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
  logger.info(`Getting form service for task type: ${taskType}`);
  
  try {
    // Use the factory to create the correct form service
    const formService = createFormService(taskType);
    
    if (!formService) {
      logger.warn(`No form service available for task type: ${taskType}`);
      return null;
    }
    
    // Initialize the form service if necessary
    if (typeof formService.initialize === 'function') {
      formService.initialize(taskId);
    }
    
    return formService;
  } catch (error) {
    logger.error(`Error getting form service for task type: ${taskType}`, error);
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
    const formService = getFormServiceForTask(taskType, taskId);
    
    if (!formService) {
      logger.warn(`No form service found for task type: ${taskType}`);
      return null;
    }
    
    // Check if the form service has a getDemoData method
    if (typeof (formService as any).getDemoData === 'function') {
      logger.info(`Using getDemoData from ${taskType} form service`);
      return await (formService as any).getDemoData(taskId);
    }
    
    logger.warn(`Form service for ${taskType} doesn't support getDemoData`);
    return null;
  } catch (error) {
    logger.error(`Error in handleEnhancedDemoAutoFill for ${taskType} task ${taskId}:`, error);
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
    const formService = getFormServiceForTask(taskType, taskId);
    
    if (!formService) {
      logger.warn(`No form service found for task type: ${taskType}`);
      return false;
    }
    
    // Check if the form service has a clearFields method
    if (typeof (formService as any).clearFields === 'function') {
      logger.info(`Using clearFields from ${taskType} form service`);
      return await (formService as any).clearFields(taskId);
    }
    
    logger.warn(`Form service for ${taskType} doesn't support clearFields`);
    return false;
  } catch (error) {
    logger.error(`Error in handleEnhancedFormClear for ${taskType} task ${taskId}:`, error);
    return false;
  }
}