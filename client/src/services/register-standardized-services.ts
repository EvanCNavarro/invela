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
import { FormServiceInterface, FormField, FormSection, FormSubmitOptions } from './formService';
import getLogger from '@/utils/logger';

const logger = getLogger('RegisterStandardizedServices');

/**
 * Register all standardized form services
 * 
 * This function registers all the standardized form services with the
 * component factory to make them available throughout the application.
 */
// Create a service factory adapter that conforms to FormServiceInterface
// but delegates to our actual factory function
function createServiceFactoryAdapter(
  factoryFn: (companyId?: number | string, taskId?: number | string) => FormServiceInterface
): FormServiceInterface {
  // Create a minimal implementation of FormServiceInterface that delegates to the factory
  const adapter: FormServiceInterface = {
    // Initialize should create a real service and delegate
    async initialize(templateId: number): Promise<void> {
      const service = factoryFn();
      return service.initialize(templateId);
    },
    
    // Delegate getFields to a real service instance
    getFields(): FormField[] {
      const service = factoryFn();
      return service.getFields();
    },
    
    // Delegate getSections to a real service instance
    getSections(): FormSection[] {
      const service = factoryFn();
      return service.getSections();
    },
    
    // Delegate loadFormData to a real service instance
    loadFormData(data: Record<string, any>): void {
      const service = factoryFn();
      service.loadFormData(data);
    },
    
    // Delegate updateFormData to a real service instance
    updateFormData(fieldKey: string, value: any, taskId?: number): void {
      const service = factoryFn();
      service.updateFormData(fieldKey, value, taskId);
    },
    
    // Delegate getFormData to a real service instance
    getFormData(): Record<string, any> {
      const service = factoryFn();
      return service.getFormData();
    },
    
    // Delegate calculateProgress to a real service instance
    calculateProgress(): number {
      const service = factoryFn();
      return service.calculateProgress();
    },
    
    // Delegate saveProgress to a real service instance
    async saveProgress(taskId?: number): Promise<void> {
      const service = factoryFn();
      return service.saveProgress(taskId);
    },
    
    // Delegate loadProgress to a real service instance
    async loadProgress(taskId: number): Promise<Record<string, any>> {
      const service = factoryFn();
      return service.loadProgress(taskId);
    },
    
    // Delegate save to a real service instance
    async save(options: FormSubmitOptions): Promise<boolean> {
      const service = factoryFn();
      return service.save(options);
    },
    
    // Delegate submit to a real service instance
    async submit(options: FormSubmitOptions): Promise<any> {
      const service = factoryFn();
      return service.submit(options);
    },
    
    // Delegate validate to a real service instance
    validate(data: Record<string, any>): boolean | Record<string, string> {
      const service = factoryFn();
      return service.validate(data);
    }
  };
  
  return adapter;
}

export function registerStandardizedServices(): void {
  try {
    logger.info('[RegisterServices] Registering standardized form services');
    
    // Register the unified KY3P form service for all KY3P form types
    logger.info('[RegisterServices] Registering unified KY3P form service');
    
    // Define a factory function that creates our new unified KY3P form services
    const unifiedKy3pServiceFactory = (companyId?: number | string, taskId?: number | string): FormServiceInterface => {
      // Convert potential string params to numbers
      const numericCompanyId = companyId ? Number(companyId) : undefined;
      const numericTaskId = taskId ? Number(taskId) : undefined;
      
      logger.info(`[RegisterServices] Creating unified KY3P service for company ${numericCompanyId}, task ${numericTaskId}`);
      // Create and return the service instance directly
      return createUnifiedKY3PFormService(numericCompanyId, numericTaskId);
    };
    
    // Create an adapter that conforms to FormServiceInterface
    const serviceAdapter = createServiceFactoryAdapter(unifiedKy3pServiceFactory);
    
    // Register for all KY3P-related task types
    const ky3pTaskTypes = ['ky3p', 'sp_ky3p_assessment', 'security', 'security_assessment'];
    
    ky3pTaskTypes.forEach(taskType => {
      logger.info(`[RegisterServices] Registering unified KY3P service for task type: ${taskType}`);
      componentFactory.registerFormService(taskType, serviceAdapter);
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
    const unifiedKy3pServiceFactory = async (companyId?: number | string, taskId?: number | string): Promise<FormServiceInterface> => {
      // Convert potential string params to numbers
      const numericCompanyId = companyId ? Number(companyId) : undefined;
      const numericTaskId = taskId ? Number(taskId) : undefined;
      
      logger.info(`[RegisterServices] Creating unified KY3P service (default) for company ${numericCompanyId}, task ${numericTaskId}`);
      // Create and return the service instance directly
      try {
        // Dynamic import to ensure we use the latest version of the unified service
        const module = await import('./unified-ky3p-form-service');
        logger.info(`Successfully imported unified KY3P service module`);
        return module.createUnifiedKY3PFormService(numericCompanyId, numericTaskId);
      } catch (error) {
        logger.error(`Failed to import unified KY3P service: ${error instanceof Error ? error.message : String(error)}`);
        // If we can't import the unified service, create a new instance directly
        return createUnifiedKY3PFormService(numericCompanyId, numericTaskId);
      }
    };
    
    // Create an adapter that conforms to FormServiceInterface
    const serviceAdapter = createServiceFactoryAdapter(unifiedKy3pServiceFactory);
    
    // Register for all KY3P-related task types
    const ky3pTaskTypes = ['ky3p', 'sp_ky3p_assessment', 'security', 'security_assessment'];
    
    ky3pTaskTypes.forEach(taskType => {
      logger.info(`[RegisterServices] Re-registering unified KY3P service as default for task type: ${taskType}`);
      componentFactory.registerFormService(taskType, serviceAdapter);
    });
    
    logger.info('[RegisterServices] Unified form services are now the default');
  } catch (error) {
    logger.error('[RegisterServices] Error setting unified form services as default:', error);
  }
}

// Do not automatically register services on import
// This was causing duplicate service registration
// registerStandardizedServices();
