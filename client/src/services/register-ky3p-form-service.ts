/**
 * KY3P Form Service Registration
 * 
 * This file registers the enhanced KY3P form service with the component factory.
 */

import { componentFactory } from './componentFactory';
import { ky3pFormServiceFactory } from './ky3p-form-service-new';
import KY3PFormService from './ky3p-form-service-new';
import getLogger from '@/utils/logger';

// Create a logger
const logger = getLogger('KY3PRegistration');

/**
 * Register the KY3P form service with the component factory
 */
export function registerKY3PFormService(): void {
  try {
    // Create service instances for registration
    logger.info('Creating KY3P form service instances for registration');
    
    // Create a default instance for 'ky3p' type
    const ky3pService = ky3pFormServiceFactory.createService(0, 0); // Default instance
    logger.info('Created default KY3P form service instance');
    
    // Register services for all required types
    logger.info('Registering KY3P form service for multiple task types');
    
    componentFactory.registerFormService('ky3p', ky3pService);
    componentFactory.registerFormService('security', ky3pService);
    componentFactory.registerFormService('security_assessment', ky3pService);
    componentFactory.registerFormService('sp_ky3p_assessment', ky3pService);
    
    logger.info('KY3P form service registration completed successfully');
  } catch (error) {
    logger.error('Failed to register KY3P form service', error);
  }
}

// Export the registration function
export default registerKY3PFormService;