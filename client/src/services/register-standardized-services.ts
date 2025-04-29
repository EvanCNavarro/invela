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
    
    // Register the StandardizedKY3PFormService directly with componentFactory
    logger.info('Registering standardized KY3P form service with componentFactory');
    componentFactory.registerFormService('ky3p', new StandardizedKY3PFormService(require('@tanstack/react-query').QueryClient()));
    
    // Also register for alternate task types
    componentFactory.registerFormService('security', new StandardizedKY3PFormService(require('@tanstack/react-query').QueryClient()));
    componentFactory.registerFormService('sp_ky3p_assessment', new StandardizedKY3PFormService(require('@tanstack/react-query').QueryClient()));
    componentFactory.registerFormService('security_assessment', new StandardizedKY3PFormService(require('@tanstack/react-query').QueryClient()));
    
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