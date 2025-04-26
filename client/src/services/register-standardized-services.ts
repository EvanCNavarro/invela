/**
 * Register Standardized Form Services
 * 
 * This module registers our standardized form services for different form types,
 * ensuring consistent handling of field keys across KYB, KY3P, and Open Banking forms.
 */

import getLogger from "@/utils/logger";
import { FormServiceRegistry } from "@/services/FormServiceRegistry";
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
    FormServiceRegistry.register('ky3p', (taskId?: number) => {
      logger.info('Creating standardized KY3P form service');
      return new StandardizedKY3PFormService(taskId);
    });
    
    // Register the fixed KY3P form service as an alternative
    FormServiceRegistry.register('ky3p-fixed', (taskId?: number) => {
      logger.info('Creating fixed KY3P form service');
      return new KY3PFormServiceFixed(taskId);
    });
    
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
    FormServiceRegistry.registerDefault('ky3p', (taskId?: number) => {
      logger.info('Creating standardized KY3P form service as default');
      return new StandardizedKY3PFormService(taskId);
    });
    
    logger.info('Now using standardized form services as defaults');
  } catch (error) {
    logger.error('Failed to switch to standardized form services:', error);
  }
}