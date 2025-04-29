/**
 * Register Standardized Services
 * 
 * This module handles the registration of all standardized form services
 * and provides a mechanism to make them the default services for the application.
 */

import { StandardizedKY3PFormService } from './standardized-ky3p-form-service';
import { registerStandardizedService } from './standardized-service-registry';
import getLogger from '@/utils/logger';

const logger = getLogger('RegisterStandardizedServices');

/**
 * Register all standardized form services
 * 
 * This function registers all available standardized form services
 * with the service registry, making them available for use throughout
 * the application.
 */
export function registerStandardizedServices(): void {
  logger.info('Registering standardized form services');
  
  try {
    // Register KY3P form service
    registerStandardizedService('standardizedKy3pFormService', StandardizedKY3PFormService);
    logger.info('KY3P form service registered successfully');
    
    // Future services would be registered here
    // registerStandardizedService('standardizedKybFormService', StandardizedKYBFormService);
    // registerStandardizedService('standardizedOpenBankingFormService', StandardizedOpenBankingFormService);
  } catch (error) {
    logger.error('Error registering standardized services:', error);
  }
}

/**
 * Use standardized form services as the default
 * 
 * This function overrides the standard form service implementations
 * with our standardized versions, making them the default throughout
 * the application.
 */
export function useStandardizedServices(): void {
  logger.info('Using standardized form services as default');
  
  try {
    // Import componentFactory to register standardized services
    const { componentFactory } = require('./componentFactory');
    
    // Import the factory for isolated instances
    const { standardizedKy3pFormServiceFactory } = require('./standardized-ky3p-form-service');
    
    // Register the StandardizedKY3PFormService directly with componentFactory
    logger.info('Registering standardized KY3P form service with componentFactory');
    
    // Use a single QueryClient for all service instances
    const queryClient = new (require('@tanstack/react-query').QueryClient)();
    
    // Create a standardized KY3P service instance for global registration
    const standardizedKy3pService = new StandardizedKY3PFormService(queryClient);
    
    // Register for all KY3P task types
    componentFactory.registerFormService('ky3p', standardizedKy3pService);
    componentFactory.registerFormService('security', standardizedKy3pService);
    componentFactory.registerFormService('sp_ky3p_assessment', standardizedKy3pService);
    componentFactory.registerFormService('security_assessment', standardizedKy3pService);
    
    // Also override the factory's getIsolatedFormService method to ensure it uses our standardized service
    logger.info('Patching ComponentFactory.getIsolatedFormService to use standardized services');
    
    // Save the original method for tasks we don't handle
    const originalGetIsolatedFormService = componentFactory.getIsolatedFormService;
    
    // Override with our version
    componentFactory.getIsolatedFormService = function(taskType, companyId, taskId) {
      if (taskType === 'ky3p' || taskType === 'sp_ky3p_assessment' || taskType === 'security' || taskType === 'security_assessment') {
        logger.info(`Creating isolated StandardizedKY3PFormService for ${taskType} task ${taskId}`);
        return standardizedKy3pFormServiceFactory.getServiceInstance(companyId, taskId);
      }
      // Otherwise use the original method
      return originalGetIsolatedFormService.call(this, taskType, companyId, taskId);
    };
    
    // Override KY3P form service globally
    if (typeof window !== 'undefined') {
      // Only run this in browser environment
      if ((window as any).KY3PFormService) {
        logger.info('Overriding standard KY3P form service with standardized version');
        const originalKY3PService = (window as any).KY3PFormService;
        
        // Store original for potential fallback
        (window as any)._originalKY3PFormService = originalKY3PService;
        
        // Replace with standardized service
        (window as any).KY3PFormService = StandardizedKY3PFormService;
      } else {
        logger.warn('Standard KY3P form service not available for override');
      }
      
      // Future service overrides would go here
    }
  } catch (error) {
    logger.error('Error overriding standard services:', error);
  }
}