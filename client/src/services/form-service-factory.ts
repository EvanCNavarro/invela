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
import { userContext } from '@/lib/user-context';

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
export async function createFormService(
  formType: string,
  companyId?: number | string,
  taskId?: number | string,
  useEnhanced: boolean = true
): Promise<FormServiceInterface | null> {
  // Get IDs from user context if not explicitly provided
  // This ensures data isolation between companies/tasks
  const contextData = userContext.getContext();
  if (!companyId && contextData.companyId) {
    companyId = contextData.companyId;
    logger.info(`Using company ID from user context: ${companyId}`);
  }
  
  if (!taskId && contextData.taskId) {
    taskId = contextData.taskId;
    logger.info(`Using task ID from user context: ${taskId}`);
  }
  
  logger.info(`Creating form service for type: ${formType}`, {
    companyId,
    taskId,
    useEnhanced,
    fromContext: !!((!companyId && contextData.companyId) || (!taskId && contextData.taskId))
  });
  
  try {
    // Normalize IDs to numbers if they're strings
    const companyIdNum = typeof companyId === 'string' ? parseInt(companyId, 10) : companyId;
    const taskIdNum = typeof taskId === 'string' ? parseInt(taskId, 10) : taskId;
    
    // Use enhanced service implementations when available and requested
    if (useEnhanced) {
      // KY3P now has a unified implementation that replaces all previous implementations
      if (formType === 'ky3p' || formType === 'security' || formType === 'security_assessment' || formType === 'sp_ky3p_assessment') {
        logger.info(`Using unified KY3P form service for company ${companyIdNum}, task ${taskIdNum}`);
        
        // Import and use our unified KY3P service
        try {
          // Dynamic import of unified service
          return import('./unified-ky3p-form-service')
            .then(module => {
              logger.info(`Successfully imported unified KY3P service module`);
              return module.createUnifiedKY3PFormService(companyIdNum, taskIdNum);
            })
            .catch(error => {
              logger.error(`Error importing unified KY3P service: ${error instanceof Error ? error.message : String(error)}`);
              // Only as absolute fallback, use the old enhanced service
              return enhancedKY3PFormServiceFactory.getServiceInstance(companyIdNum, taskIdNum);
            });
        } catch (error) {
          logger.error(`Exception in KY3P service import: ${error instanceof Error ? error.message : String(error)}`);
          // Continue to standard implementation instead of failing completely
        }
      }
      
      // Enhanced KYB implementation
      if (formType === 'kyb') {
        try {
          // Use dynamic ES module import instead of require
          logger.info(`Attempting to dynamically import enhanced KYB service for company ${companyIdNum}, task ${taskIdNum}`);
          // Return a promise that will be awaited by the caller
          return import('./enhanced-kyb-service')
            .then(module => {
              logger.info(`Successfully imported enhanced KYB service module`);
              return module.enhancedKybServiceFactory.getInstance(companyIdNum, taskIdNum);
            })
            .catch(error => {
              logger.error(`Error importing enhanced KYB service: ${error instanceof Error ? error.message : String(error)}`);
              // Fall back to standard implementation
              return componentFactory.getFormService(formType, companyIdNum as number, taskIdNum as number);
            });
        } catch (error) {
          logger.error(`Exception in dynamic import block: ${error instanceof Error ? error.message : String(error)}`);
          // Continue to standard implementation instead of failing completely
        }
      }
      
      // Add other enhanced implementations here as they become available
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
  async getServiceInstance(
    formType: string,
    companyId?: number | string,
    taskId?: number | string,
    useEnhanced: boolean = true
  ): Promise<FormServiceInterface | null> {
    return createFormService(formType, companyId, taskId, useEnhanced);
  }
};
