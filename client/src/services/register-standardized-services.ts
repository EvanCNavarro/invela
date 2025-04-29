/**
 * Register Standardized Services
 * 
 * This module registers standardized form services that use a consistent
 * interface with string-based field keys across all form types.
 */

import { ComponentFactory } from './componentFactory';
import { EnhancedKY3PFormService } from './enhanced-ky3p-form-service';

// List of service registrations to set up
const standardizedServiceRegistrations = [
  {
    serviceName: 'EnhancedKY3PFormService',
    serviceType: EnhancedKY3PFormService,
    formTypes: ['ky3p', 'sp_ky3p_assessment', 'security', 'security_assessment'],
  },
];

// Map that tracks if services are registered
const serviceRegistrationStatus = new Map<string, boolean>();

/**
 * Register all standardized form services with the ComponentFactory
 */
export function registerStandardizedServices() {
  console.log('[RegisterStandardizedServices] Registering standardized form services');
  
  standardizedServiceRegistrations.forEach(registration => {
    const { serviceName, serviceType, formTypes } = registration;
    
    try {
      // Register for each form type
      formTypes.forEach(formType => {
        console.log(`[RegisterStandardizedServices] Registering ${serviceName} for task type: ${formType}`);
        ComponentFactory.registerService(formType, serviceType);
      });
      
      // Mark as registered
      serviceRegistrationStatus.set(serviceName, true);
      console.log(`[RegisterStandardizedServices] Successfully registered ${serviceName} for ${formTypes.length} form types`);
    } catch (error) {
      console.error(`[RegisterStandardizedServices] Error registering ${serviceName}:`, error);
      serviceRegistrationStatus.set(serviceName, false);
    }
  });
}

/**
 * Check if a specific service is registered
 * 
 * @param serviceName The name of the service to check
 */
export function isServiceRegistered(serviceName: string): boolean {
  return serviceRegistrationStatus.get(serviceName) === true;
}

/**
 * Use standardized services as the default implementation
 * 
 * This function makes the standardized services the default choice
 * for all form types where they're available.
 */
export function useStandardizedServices() {
  console.log('[RegisterStandardizedServices] Setting standardized services as default');
  
  // Override the KY3P form service with our enhanced version
  const ky3pOverrideSuccess = overrideKY3PFormService();
  console.log(`[RegisterStandardizedServices] KY3P form service override ${ky3pOverrideSuccess ? 'successful' : 'failed'}`);
  
  // Add more overrides here as they become available
}

/**
 * Override the KY3P form service with our enhanced version
 */
function overrideKY3PFormService(): boolean {
  try {
    // Check if KY3P form service is available in the ComponentFactory
    const existingKY3PService = ComponentFactory.lookupService('ky3p');
    
    if (!existingKY3PService) {
      console.warn('[RegisterStandardizedServices] Standard KY3P form service not available for override');
      return false;
    }
    
    console.log('[RegisterStandardizedServices] Overriding KY3P form service with enhanced version');
    
    // Register our enhanced service for all KY3P form types
    standardizedServiceRegistrations.forEach(registration => {
      if (registration.serviceName === 'EnhancedKY3PFormService') {
        registration.formTypes.forEach(formType => {
          ComponentFactory.registerService(formType, registration.serviceType);
        });
      }
    });
    
    return true;
  } catch (error) {
    console.error('[RegisterStandardizedServices] Error overriding KY3P form service:', error);
    return false;
  }
}
