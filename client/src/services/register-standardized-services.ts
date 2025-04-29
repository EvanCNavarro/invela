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
    
    // Register the enhanced KY3P form service
    logger.info('Registering enhanced KY3P form service');
    
    // We use the ComponentFactory instance (not static methods)
    // to register the service, which avoids the "is not a constructor" error
    componentFactory.registerFormService('ky3p', (companyId, taskId) => {
      logger.info(`Creating enhanced KY3P form service via factory for company ${companyId}, task ${taskId}`);
      return formServiceFactory.getServiceInstance('ky3p', companyId, taskId, true);
    });
    
    logger.info('Successfully registered enhanced KY3P form service');
    
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
    
    // Re-register the KY3P service to replace the original implementation
    componentFactory.registerFormService('ky3p', (companyId, taskId) => {
      logger.info(`Creating enhanced KY3P form service (default) for company ${companyId}, task ${taskId}`);
      return formServiceFactory.getServiceInstance('ky3p', companyId, taskId, true);
    });
    
    logger.info('Standardized form services are now the default');
  } catch (error) {
    logger.error('Error setting standardized form services as default:', error);
  }
}

// Automatically register services when this module is imported
registerStandardizedServices();
