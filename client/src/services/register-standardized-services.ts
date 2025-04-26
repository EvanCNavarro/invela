/**
 * Register Standardized Form Services
 * 
 * This module registers our standardized form services for different form types,
 * ensuring consistent handling of field keys across KYB, KY3P, and Open Banking forms.
 */

import getLogger from "@/utils/logger";
import { componentFactory } from "./componentFactory";
import { StandardizedKY3PFormService } from "./standardized-ky3p-form-service";
import { KY3PFormServiceFixed } from "./ky3p-form-service-fixed";

const logger = getLogger('FormServices');

/**
 * Register standardized form services to replace the legacy services
 * This ensures all form types use string-based field keys consistently
 */
export function registerStandardizedServices(): void {
  logger.info('Registering standardized form services');
  
  try {
    // Register the standardized KY3P form service
    const standardizedKy3pService = new StandardizedKY3PFormService();
    componentFactory.registerFormService('ky3p', standardizedKy3pService);
    logger.info('Registered standardized KY3P form service');
    
    // Register the fixed KY3P form service as an alternative
    const fixedKy3pService = new KY3PFormServiceFixed();
    componentFactory.registerFormService('ky3p-fixed', fixedKy3pService);
    logger.info('Registered fixed KY3P form service');
    
    logger.info('Standardized form services registered successfully');
  } catch (error) {
    logger.error('Failed to register standardized form services:', error);
  }
}

/**
 * Update form service registry to use standardized services 
 * This function can be called to swap the default KY3P service
 * with our standardized version
 */
export function useStandardizedServices(): void {
  logger.info('Switching to standardized form services');
  
  try {
    // First register the services (in case they haven't been registered yet)
    registerStandardizedServices();
    
    // Override the default KY3P service to use our standardized version
    const standardizedKy3pService = new StandardizedKY3PFormService();
    
    // Override for all related KY3P task types
    componentFactory.registerFormService('ky3p', standardizedKy3pService);
    componentFactory.registerFormService('sp_ky3p_assessment', standardizedKy3pService);
    componentFactory.registerFormService('security', standardizedKy3pService);
    componentFactory.registerFormService('security_assessment', standardizedKy3pService);
    
    logger.info('Now using standardized form services as defaults for all KY3P task types');
  } catch (error) {
    logger.error('Failed to switch to standardized form services:', error);
  }
}