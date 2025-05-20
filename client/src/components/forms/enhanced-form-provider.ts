/**
 * Enhanced Form Provider
 * 
 * This module provides enhanced form service implementations for different
 * form types, ensuring consistent behavior across all forms.
 */

import { FormServiceInterface } from '@/services/formService';
import getLogger from '@/utils/logger';

const logger = getLogger('EnhancedFormProvider');

/**
 * Get the appropriate form service for a task
 * 
 * This function determines the form type from the task type and creates
 * an enhanced form service instance for it.
 * 
 * @param taskType Type of the task (kyb, ky3p, open_banking)
 * @param taskId ID of the task (optional)
 * @returns FormServiceInterface or null if no matching form service
 */
export function getFormServiceForTask(
  taskType: string,
  taskId?: number
): FormServiceInterface | null {
  try {
    logger.info(`Getting enhanced form service for ${taskType} task ${taskId || 'unknown'}`);
    
    // Lazy-load the appropriate form service factory based on task type
    switch (taskType.toLowerCase()) {
      case 'company_kyb':
      case 'kyb':
        return import('@/services/kyb-form-service').then(module => {
          return new module.KybFormService();
        }).catch(error => {
          logger.error(`Error loading KYB form service: ${error.message}`);
          return null;
        });
        
      case 'ky3p':
        return import('@/services/ky3p-form-service').then(module => {
          return new module.Ky3pFormService();
        }).catch(error => {
          logger.error(`Error loading KY3P form service: ${error.message}`);
          return null;
        });
        
      case 'open_banking':
        return import('@/services/open-banking-form-service').then(module => {
          return new module.OpenBankingFormService();
        }).catch(error => {
          logger.error(`Error loading Open Banking form service: ${error.message}`);
          return null;
        });
        
      default:
        logger.warn(`No enhanced form service available for task type: ${taskType}`);
        return null;
    }
  } catch (error) {
    logger.error(`Error in getFormServiceForTask: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
}