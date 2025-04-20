// Service registration module
// This file registers all form services to the component factory

import { componentFactory } from './componentFactory';
import { kybService } from './kybService';
import { enhancedKybService, enhancedKybServiceFactory } from './enhanced-kyb-service';

/**
 * Register all form services with ComponentFactory
 * This function should be called once at application startup
 */
export function registerServices(): void {
  console.log('[Service Registration] Registering form services...', {
    timestamp: new Date().toISOString(),
    kybServiceState: kybService ? 'initialized' : 'not initialized'
  });
  
  try {
    // Clear existing registrations to prevent stale services
    console.log('[Service Registration] Getting registered services before registration');
    const existingServices = componentFactory.getRegisteredFormServices();
    const existingKeys = Object.keys(existingServices);
    
    console.log(`[Service Registration] Found ${existingKeys.length} existing services: [${existingKeys.join(', ')}]`);
    
    // Register KYB form service with both its client-side name and database name
    // We're using the enhanced KYB service which adds timestamp-based conflict resolution
    console.log('[Service Registration] Registering Enhanced KYB service for type: kyb');
    
    // Use the default instance for compatibility with existing code
    // But this will be replaced with isolated instances at runtime for each task
    componentFactory.registerFormService('kyb', enhancedKybService);
    
    console.log('[Service Registration] Registering Enhanced KYB service for type: company_kyb');
    componentFactory.registerFormService('company_kyb', enhancedKybService);
    
    // Log factory initialization
    console.log('[Service Registration] EnhancedKybServiceFactory initialized and ready for isolated service creation');
    
    // Verify registrations
    const servicesAfter = componentFactory.getRegisteredFormServices();
    const serviceKeysAfter = Object.keys(servicesAfter);
    
    console.log(`[Service Registration] After registration: ${serviceKeysAfter.length} services registered`);
    serviceKeysAfter.forEach(key => {
      console.log(`[Service Registration] - Service '${key}' registered with ${servicesAfter[key]?.constructor?.name || 'unknown'} instance`);
    });
    
    // Add more service registrations here as needed:
    // componentFactory.registerFormService('card', cardService);
    // componentFactory.registerFormService('company_card', cardService);
    // componentFactory.registerFormService('security', securityService);
    // componentFactory.registerFormService('security_assessment', securityService);
    
    // Final check - specifically check for KYB service
    const kybRegistered = componentFactory.getFormService('kyb');
    const companyKybRegistered = componentFactory.getFormService('company_kyb');
    
    console.log('[Service Registration] Final verification:', {
      kybRegistered: !!kybRegistered,
      companyKybRegistered: !!companyKybRegistered,
      kybServiceType: kybRegistered?.constructor?.name || 'null',
      companyKybServiceType: companyKybRegistered?.constructor?.name || 'null',
      isEnhanced: kybRegistered?.constructor?.name === 'EnhancedKybFormService'
    });
    
    console.log('[Service Registration] Services registered successfully');
  } catch (error) {
    console.error('[Service Registration] Error registering services:', error);
    throw error; // Re-throw to allow caller to handle
  }
}