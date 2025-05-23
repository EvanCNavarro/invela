/**
 * Standardized Service Registry
 * 
 * This module provides a centralized registry for all standardized form services,
 * allowing easy access to the appropriate service for each form type.
 */

import { StandardizedKY3PFormService } from './standardized-ky3p-form-service';
import { FormServiceInterface } from './formService';
import getLogger from '@/utils/logger';

const logger = getLogger('ServiceRegistry');

// Define the service registry type
export interface ServiceRegistry {
  standardizedKy3pFormService: typeof StandardizedKY3PFormService;
  standardizedKybFormService?: any;
  standardizedOpenBankingFormService?: any;
  [key: string]: any;
}

// Create a global service registry
export const serviceRegistry: ServiceRegistry = {
  standardizedKy3pFormService: StandardizedKY3PFormService,
};

/**
 * Register a standardized form service
 * 
 * @param name Service name (e.g., 'standardizedKybFormService')
 * @param serviceClass Service class constructor
 */
export function registerStandardizedService(name: string, serviceClass: any): void {
  logger.info(`Registering standardized service: ${name}`);
  serviceRegistry[name] = serviceClass;
}

/**
 * Get a standardized form service instance
 * 
 * @param name Service name (e.g., 'standardizedKy3pFormService')
 * @param taskId Optional task ID
 * @returns Service instance or null if service not found
 */
export function getStandardizedService(name: string, taskId?: number): FormServiceInterface | null {
  const ServiceClass = serviceRegistry[name];
  
  if (!ServiceClass) {
    logger.error(`Standardized service not found: ${name}`);
    return null;
  }
  
  try {
    return new ServiceClass(taskId);
  } catch (error) {
    logger.error(`Error creating standardized service instance for ${name}:`, error);
    return null;
  }
}

/**
 * Check if all required standardized services are registered
 * 
 * @param requiredServices List of required service names
 * @returns True if all required services are registered
 */
export function checkStandardizedServices(requiredServices: string[]): boolean {
  for (const name of requiredServices) {
    if (!serviceRegistry[name]) {
      logger.warn(`Required standardized service not registered: ${name}`);
      return false;
    }
  }
  
  return true;
}

/**
 * Get appropriate form service for a task type
 * 
 * This is a helper function to ensure we use the correct standardized
 * form service for each task type.
 * 
 * @param taskType Type of the task (kyb, ky3p, open_banking)
 * @param taskId ID of the task
 * @returns The appropriate form service for the task type
 */
export function getFormServiceForTaskType(
  taskType: string,
  taskId: number | undefined
): FormServiceInterface | null {
  // Normalize the task type
  const normalizedType = taskType.toLowerCase().replace(/-/g, '_');
  
  // Map task types to service names
  const serviceMap: Record<string, string> = {
    'kyb': 'standardizedKybFormService',
    'ky3p': 'standardizedKy3pFormService',
    'open_banking': 'standardizedOpenBankingFormService',
  };
  
  const serviceName = serviceMap[normalizedType];
  
  if (!serviceName || !serviceRegistry[serviceName]) {
    logger.error(`No standardized form service found for task type: ${taskType}`);
    return null;
  }
  
  // Create a new instance of the service with the task ID
  return getStandardizedService(serviceName, taskId);
}