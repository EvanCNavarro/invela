/**
 * Form Service Factory
 * 
 * This module provides a centralized factory for creating form service instances
 * based on the form type. It supports both traditional and enhanced form services.
 */

import { FormServiceInterface } from './formService';
import { componentFactory } from './componentFactory';
import { enhancedKY3PFormServiceFactory } from './enhanced-ky3p-form-service';
import getLogger from '@/utils/logger';

const logger = getLogger('FormServiceFactory');

/**
 * Create a form service instance based on the form type
 * 
 * @param formType The type of form ('kyb', 'ky3p', 'open_banking', etc.)
 * @param companyId Optional company ID
 * @param taskId Optional task ID
 * @param useEnhanced Whether to use enhanced service implementations when available
 * @returns A form service instance
 */
export function createFormService(
  formType: string,
  companyId?: number | string,
  taskId?: number | string,
  useEnhanced: boolean = true
): FormServiceInterface | null {
  logger.info(`Creating form service for type: ${formType}`, {
    companyId,
    taskId,
    useEnhanced
  });
  
  try {
    // Normalize IDs to numbers if they're strings
    const companyIdNum = typeof companyId === 'string' ? parseInt(companyId, 10) : companyId;
    const taskIdNum = typeof taskId === 'string' ? parseInt(taskId, 10) : taskId;
    
    // Use enhanced service implementations when available and requested
    if (useEnhanced) {
      // KY3P has an enhanced implementation
      if (formType === 'ky3p') {
        logger.info(`Using enhanced KY3P form service for company ${companyIdNum}, task ${taskIdNum}`);
        return enhancedKY3PFormServiceFactory.getServiceInstance(companyIdNum, taskIdNum);
      }
      
      // Add other enhanced implementations here as they become available
      // e.g., if (formType === 'kyb') { return enhancedKYBFormServiceFactory... }
    }
    
    // Fall back to standard ComponentFactory implementation for other types
    // or when enhanced implementations are not requested
    logger.info(`Using standard ComponentFactory for form type: ${formType}`);
    return componentFactory.getFormService(formType, companyIdNum as number, taskIdNum as number);
  } catch (error) {
    logger.error(`Error creating form service for type: ${formType}`, error);
    return null;
  }
}

/**
 * Form Service Factory
 * 
 * This factory provides a consistent interface for creating form service instances
 * across different form types.
 */
export const formServiceFactory = {
  /**
   * Get or create a form service instance for a specific form type
   * 
   * @param formType The form type ('kyb', 'ky3p', 'open_banking', etc.)
   * @param companyId Optional company ID
   * @param taskId Optional task ID 
   * @param useEnhanced Whether to use enhanced implementations when available
   * @returns A form service instance or null if the type is not supported
   */
  getServiceInstance(
    formType: string,
    companyId?: number | string,
    taskId?: number | string,
    useEnhanced: boolean = true
  ): FormServiceInterface | null {
    return createFormService(formType, companyId, taskId, useEnhanced);
  }
};
