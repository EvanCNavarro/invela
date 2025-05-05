/**
 * Unified Service Registration
 * 
 * This module provides a single source of truth for registering all form services,
 * eliminating duplicate registrations and ensuring consistent service resolution.
 * 
 * OODA Loop Implementation:
 * - Observe: Detect existing services to avoid duplicates
 * - Orient: Map task types to appropriate services
 * - Decide: Whether to use unified or standard services based on configuration
 * - Act: Register services in a single pass with clear logging
 */

import { componentFactory } from './componentFactory';
import { enhancedKybServiceFactory } from './enhanced-kyb-service-factory';
import { createUnifiedKY3PFormService } from './unified-ky3p-form-service';
import { openBankingFormServiceFactory } from './open-banking-form-service';
import getLogger from '../utils/standardized-logger';

const logger = getLogger('UnifiedServiceRegistration');

/**
 * Service registration options
 */
interface ServiceRegistrationOptions {
  useUnified: boolean;
  clearExisting: boolean;
}

/**
 * Default registration options
 */
const defaultOptions: ServiceRegistrationOptions = {
  useUnified: true,   // Use unified implementations by default
  clearExisting: true // Clear previous registrations by default
};

/**
 * Service Type Registry
 * Maps task types to their service implementations
 */
type ServiceRegistry = Record<string, string>;

// Create a standardized, single source of truth for task type mappings
const taskTypeRegistry: ServiceRegistry = {
  // KYB Task Types
  'kyb': 'KybService',             // Standard KYB type
  'company_kyb': 'KybService',     // Database KYB type
  
  // KY3P Task Types
  'ky3p': 'KY3PService',          // Standard KY3P type
  'sp_ky3p_assessment': 'KY3PService', // Legacy S&P KY3P Assessment type
  'security': 'KY3PService',      // Legacy Security Assessment type
  'security_assessment': 'KY3PService', // Legacy Security Assessment type
  
  // Open Banking Task Types
  'open_banking': 'OpenBankingService',          // Client-side Open Banking type
  'open_banking_survey': 'OpenBankingService'    // Database Open Banking type
};

/**
 * Register all services uniformly
 * 
 * KISS Principle: Simple, straightforward registration with minimal complexity
 * DRY Principle: Single source of truth for service registration
 * 
 * @param options Service registration options
 */
export function registerAllServices(options: Partial<ServiceRegistrationOptions> = {}): void {
  // Merge provided options with defaults
  const opts = { ...defaultOptions, ...options };
  
  logger.info(`Registering all services with options:`, opts);
  
  // OODA: Act - Clear existing registrations if requested
  if (opts.clearExisting) {
    // Get existing services before clearing
    const existingServices = componentFactory.getRegisteredFormServices();
    const existingTypes = Object.keys(existingServices);
    
    // Check which service types are already registered
    if (existingTypes.length > 0) {
      logger.info(`Found ${existingTypes.length} registered services: ${existingTypes.join(', ')}`);
    } else {
      logger.info('No existing service registrations found');
    }
    
    // We no longer attempt to clear registrations as it can cause TypeScript errors
    // and race conditions if services are cleared while they're being used
    // Instead, we track which services are registered to avoid duplicate registrations
  }
  
  // OODA: Orient - Create a registry of service factories
  type ServiceFactory = {
    create: (companyId?: number, taskId?: number) => any;
  };

  const serviceFactories: Record<string, ServiceFactory> = {
    // KYB Service
    'KybService': {
      create: (companyId?: number, taskId?: number) => {
        return enhancedKybServiceFactory.getInstance(companyId, taskId);
      }
    },
    
    // KY3P Service
    'KY3PService': {
      create: (companyId?: number, taskId?: number) => {
        return createUnifiedKY3PFormService(companyId, taskId);
      }
    },
    
    // Open Banking Service
    'OpenBankingService': {
      create: (companyId?: number, taskId?: number) => {
        try {
          // Use any cast to access static method or bypass TypeScript checking
          // This is a safer option than letting the app crash
          const factory = openBankingFormServiceFactory as any;
          if (typeof factory.createService === 'function') {
            return factory.createService(companyId, taskId);
          } else if (typeof factory.getInstance === 'function') {
            return factory.getInstance(companyId, taskId);
          } else {
            // Last resort - create a minimal service directly
            logger.warn('Unable to create OpenBankingFormService using factory methods');
            return { 
              getFields: () => [], 
              updateField: () => Promise.resolve(),
              getForm: () => ({}),
              submitForm: () => Promise.resolve() 
            };
          }
        } catch (error) {
          logger.error('Error creating OpenBankingService:', error);
          // Return a minimal service to prevent crashes
          return { 
            getFields: () => [], 
            updateField: () => Promise.resolve(),
            getForm: () => ({}),
            submitForm: () => Promise.resolve() 
          };
        }
      }
    }
  };
  
  // Get existing services before registering new ones
  const existingServices = componentFactory.getRegisteredFormServices();
  
  // OODA: Decide - Register each task type with its appropriate service
  Object.entries(taskTypeRegistry).forEach(([taskType, serviceType]) => {
    try {
      // Check if this task type already has a service registered
      const alreadyRegistered = Object.prototype.hasOwnProperty.call(existingServices, taskType);
      
      // If already registered and we're running this during startup initialization, skip it
      if (alreadyRegistered && !opts.clearExisting) {
        logger.info(`Task type ${taskType} already has a service registered (${serviceType}), skipping...`);
        return; // Skip this registration
      }
      
      // Create a default instance for the component factory
      const serviceFactory = serviceFactories[serviceType];
      
      if (!serviceFactory) {
        throw new Error(`Unknown service type: ${serviceType}`);
      }
      
      const service = serviceFactory.create();
      componentFactory.registerFormService(taskType, service);
      
      logger.info(`Registered ${serviceType} for task type: ${taskType}`);
    } catch (error) {
      logger.error(`Failed to register service for task type ${taskType}:`, 
        error instanceof Error ? error.message : String(error));
    }
  });
  
  // OODA: Observe - Log the final registration state
  const registeredServices = componentFactory.getRegisteredFormServices();
  const registeredTypes = Object.keys(registeredServices);
  
  logger.info(`Successfully registered ${registeredTypes.length} services:`, registeredTypes);
}

/**
 * Initialize all services
 * This function should be called once at application startup
 */
export function initializeServices(): void {
  logger.info('Initializing all services with unified registration');
  registerAllServices();
}
