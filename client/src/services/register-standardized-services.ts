/**
 * Register Standardized Form Services
 * 
 * This module registers the standardized form services with the component factory
 * to ensure they're available for use throughout the application.
 * 
 * IMPORTANT UPDATE: We now use a unified KY3P form service implementation that
 * combines the best features of all previous implementations into a single,
 * standardized service to avoid duplicate registration and API calls.
 */

import { componentFactory } from './componentFactory';
import { formServiceFactory } from './form-service-factory';
import { createUnifiedKY3PFormService } from './unified-ky3p-form-service';
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
    logger.info('[RegisterServices] Registering standardized form services');
    
    // Register the unified KY3P form service for all KY3P form types
    logger.info('[RegisterServices] Registering unified KY3P form service');
    
    // Define a factory function that creates our new unified KY3P form services
    const unifiedKy3pServiceFactory = (companyId: number | string | undefined, taskId: number | string | undefined) => {
      // Convert potential string params to numbers
      const numericCompanyId = companyId ? Number(companyId) : undefined;
      const numericTaskId = taskId ? Number(taskId) : undefined;
      
      logger.info(`[RegisterServices] Creating unified KY3P service for company ${numericCompanyId}, task ${numericTaskId}`);
      return createUnifiedKY3PFormService(numericCompanyId, numericTaskId);
    };
    
    // Register for all KY3P-related task types
    const ky3pTaskTypes = ['ky3p', 'sp_ky3p_assessment', 'security', 'security_assessment'];
    
    ky3pTaskTypes.forEach(taskType => {
      logger.info(`[RegisterServices] Registering unified KY3P service for task type: ${taskType}`);
      componentFactory.registerFormService(taskType, unifiedKy3pServiceFactory);
    });
    
    logger.info('[RegisterServices] Successfully registered unified KY3P form service for all task types');
    
    // Additional service registrations can go here
    
    logger.info('[RegisterServices] All standardized form services registered successfully');
  } catch (error) {
    logger.error('[RegisterServices] Error registering standardized form services:', error);
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
    logger.info('[RegisterServices] Setting unified form services as default');
    
    // Define a factory function for our unified KY3P service
    const unifiedKy3pServiceFactory = (companyId: number | string | undefined, taskId: number | string | undefined) => {
      // Convert potential string params to numbers
      const numericCompanyId = companyId ? Number(companyId) : undefined;
      const numericTaskId = taskId ? Number(taskId) : undefined;
      
      logger.info(`[RegisterServices] Creating unified KY3P service (default) for company ${numericCompanyId}, task ${numericTaskId}`);
      return createUnifiedKY3PFormService(numericCompanyId, numericTaskId);
    };
    
    // Register for all KY3P-related task types
    const ky3pTaskTypes = ['ky3p', 'sp_ky3p_assessment', 'security', 'security_assessment'];
    
    ky3pTaskTypes.forEach(taskType => {
      logger.info(`[RegisterServices] Re-registering unified KY3P service as default for task type: ${taskType}`);
      componentFactory.registerFormService(taskType, unifiedKy3pServiceFactory);
    });
    
    logger.info('[RegisterServices] Unified form services are now the default');
  } catch (error) {
    logger.error('[RegisterServices] Error setting unified form services as default:', error);
  }
}

// Do not automatically register services on import
// This was causing duplicate service registration
// registerStandardizedServices();
