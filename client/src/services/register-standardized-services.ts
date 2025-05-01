/**
 * Register Standardized Form Services
 * 
 * This module registers the standardized form services with the component factory
 * to ensure they're available for use throughout the application.
 */

import { componentFactory } from './componentFactory';
import { formServiceFactory } from './form-service-factory';
import { EnhancedKY3PFormService } from './enhanced-ky3p-form-service';
import getLogger from '@/utils/logger';

const logger = getLogger('RegisterStandardizedServices');

/**
 * Register all standardized form services
 * 
 * This function registers all the standardized form services with the
 * component factory to make them available throughout the application.
 */
export function registerStandardizedServices(): void {
  try {
    logger.info('Registering standardized form services');
    
    // Register the enhanced KY3P form service for all KY3P form types
    logger.info('Registering enhanced KY3P form service');
    
    // Define a factory function that creates enhanced KY3P form services
    const ky3pServiceFactory = (companyId: number | string | undefined, taskId: number | string | undefined) => {
      logger.info(`Creating enhanced KY3P form service via factory for company ${companyId}, task ${taskId}`);
      return formServiceFactory.getServiceInstance('ky3p', companyId, taskId, true);
    };
    
    // Register for all KY3P-related task types
    const ky3pTaskTypes = ['ky3p', 'sp_ky3p_assessment', 'security', 'security_assessment'];
    
    ky3pTaskTypes.forEach(taskType => {
      logger.info(`Registering enhanced KY3P form service for task type: ${taskType}`);
      componentFactory.registerFormService(taskType, ky3pServiceFactory);
    });
    
    logger.info('Successfully registered enhanced KY3P form service for all task types');

    
    // Additional service registrations can go here
    
    logger.info('All standardized form services registered successfully');
  } catch (error) {
    logger.error('Error registering standardized form services:', error);
  }
}

/**
 * Make standardized services the default throughout the application
 * 
 * This function sets our standardized service implementations as the default,
 * replacing the original implementations in the ComponentFactory.
 */
export function useStandardizedServices(): void {
  try {
    logger.info('Setting standardized form services as default');
    
    // Define a factory function that creates enhanced KY3P form services
    const ky3pServiceFactory = (companyId: number | string | undefined, taskId: number | string | undefined) => {
      logger.info(`Creating enhanced KY3P form service (default) for company ${companyId}, task ${taskId}`);
      return formServiceFactory.getServiceInstance('ky3p', companyId, taskId, true);
    };
    
    // Register for all KY3P-related task types
    const ky3pTaskTypes = ['ky3p', 'sp_ky3p_assessment', 'security', 'security_assessment'];
    
    ky3pTaskTypes.forEach(taskType => {
      logger.info(`Re-registering enhanced KY3P form service as default for task type: ${taskType}`);
      componentFactory.registerFormService(taskType, ky3pServiceFactory);
    });
    
    logger.info('Standardized form services are now the default');
  } catch (error) {
    logger.error('Error setting standardized form services as default:', error);
  }
}

// Do not automatically register services on import
// This was causing duplicate service registration
// registerStandardizedServices();
