/**
 * Standardized Service Registry
 * 
 * This module provides a registry of form services that are standardized
 * across the application.
 */

import { FormServiceInterface } from './formService';
import getLogger from '@/utils/logger';

const logger = getLogger('StandardizedServiceRegistry');

/**
 * Get the appropriate form service for a task type
 * 
 * @param taskType Type of task (e.g., 'kyb', 'ky3p', 'open_banking')
 * @param taskId Optional task ID
 * @returns The appropriate form service, or null if not found
 */
export function getFormServiceForTaskType(
  taskType: string,
  taskId?: number
): FormServiceInterface | null {
  try {
    logger.info(`Getting standardized form service for ${taskType}`);
    
    // Load the appropriate form service based on the task type
    switch (taskType.toLowerCase()) {
      case 'company_kyb':
      case 'kyb':
        return import('./kyb-form-service').then(module => {
          const service = new module.KybFormService();
          logger.info(`Successfully created KYB form service`);
          return service;
        }).catch(error => {
          logger.error(`Error creating KYB form service:`, error);
          return null;
        });
        
      case 'ky3p':
        return import('./ky3p-form-service').then(module => {
          const service = new module.Ky3pFormService();
          logger.info(`Successfully created KY3P form service`);
          return service;
        }).catch(error => {
          logger.error(`Error creating KY3P form service:`, error);
          return null;
        });
        
      case 'open_banking':
        return import('./open-banking-form-service').then(module => {
          const service = new module.OpenBankingFormService();
          logger.info(`Successfully created Open Banking form service`);
          return service;
        }).catch(error => {
          logger.error(`Error creating Open Banking form service:`, error);
          return null;
        });
        
      default:
        logger.warn(`No standardized form service found for type: ${taskType}`);
        return null;
    }
  } catch (error) {
    logger.error(`Error in getFormServiceForTaskType:`, error);
    return null;
  }
}