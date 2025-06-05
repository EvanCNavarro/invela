// Service registration module
// This file registers all form services to the component factory

import { componentFactory } from './componentFactory';
import { kybService } from './kybService';
import { enhancedKybService, enhancedKybServiceFactory } from './enhanced-kyb-service';
import { standardizedKybFormService } from './standardized-kyb-form-service';
import { ky3pFormService, ky3pFormServiceFactory } from './ky3p-form.service';
import { openBankingFormService, openBankingFormServiceFactory } from './open-banking-form-service';

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
    
    // Register KY3P form service using standard 'ky3p' type
    console.log('[Service Registration] Registering KY3P form service for standard type: ky3p');
    componentFactory.registerFormService('ky3p', ky3pFormService);
    
    // Also register for backward compatibility with legacy 'sp_ky3p_assessment' type
    console.log('[Service Registration] Registering KY3P form service for legacy type: sp_ky3p_assessment');
    componentFactory.registerFormService('sp_ky3p_assessment', ky3pFormService);
    
    // Make sure to register for legacy task types to maintain backward compatibility
    console.log('[Service Registration] Registering KY3P form service for legacy type: security');
    componentFactory.registerFormService('security', ky3pFormService);
    
    console.log('[Service Registration] Registering KY3P form service for legacy type: security_assessment');
    componentFactory.registerFormService('security_assessment', ky3pFormService);
    
    console.log('[Service Registration] KY3PFormServiceFactory initialized and ready for isolated service creation');
    
    // Register Open Banking form service
    console.log('[Service Registration] Registering Open Banking form service for type: open_banking_survey');
    componentFactory.registerFormService('open_banking_survey', openBankingFormService);
    
    // Also register Open Banking form service for the client-side type name (open_banking)
    console.log('[Service Registration] Registering Open Banking form service for client type: open_banking');
    componentFactory.registerFormService('open_banking', openBankingFormService);
    console.log('[Service Registration] OpenBankingFormServiceFactory initialized and ready for isolated service creation');
    
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