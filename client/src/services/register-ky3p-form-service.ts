/**
 * KY3P Form Service Registration
 * 
 * This file registers the enhanced KY3P form service with the component factory.
 */

import { componentFactory } from './componentFactory';
import { ky3pFormServiceFactory } from './ky3p-form-service-new';
import { KY3PFormService } from './ky3p-form-service-new';
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
    
    // Create placeholder service instances for the component factory
    // The actual instances will be created by the factory when needed
    // via the getIsolatedFormService method in componentFactory
    
    logger.info('Registering KY3P form service for multiple task types');
    
    // Get the current task ID from the URL if possible
    const urlMatch = window.location.pathname.match(/\/task-center\/task\/(\d+)/);
    let currentTaskId = 0;
    if (urlMatch && urlMatch[1]) {
      currentTaskId = parseInt(urlMatch[1], 10);
      logger.info(`Detected current task ID from URL: ${currentTaskId}`);
    }
    
    // Create placeholder services for registration
    // These won't actually be used directly - componentFactory.getIsolatedFormService 
    // will call our factory's getServiceInstance method
    
    const ky3pService = ky3pFormServiceFactory.createService(currentTaskId, 0);
    componentFactory.registerFormService('ky3p', ky3pService);
    
    const securityService = ky3pFormServiceFactory.createService(currentTaskId, 0);
    componentFactory.registerFormService('security', securityService);
    
    const securityAssessmentService = ky3pFormServiceFactory.createService(currentTaskId, 0);
    componentFactory.registerFormService('security_assessment', securityAssessmentService);
    
    const spKy3pService = ky3pFormServiceFactory.createService(currentTaskId, 0);
    componentFactory.registerFormService('sp_ky3p_assessment', spKy3pService);
    
    logger.info('KY3P form service registration completed successfully');
  } catch (error) {
    logger.error('Failed to register KY3P form service', error);
  }
}

// Export the registration function
export default registerKY3PFormService;