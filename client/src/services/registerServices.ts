// Service registration module
// This file registers all form services to the component factory

import { componentFactory } from './componentFactory';
import { kybService } from './kybService';

/**
 * Register all form services with ComponentFactory
 * This function should be called once at application startup
 */
export function registerServices(): void {
  console.log('[Service Registration] Registering form services...');
  
  // Register KYB form service with both its client-side name and database name
  componentFactory.registerFormService('kyb', kybService);
  componentFactory.registerFormService('company_kyb', kybService);
  
  // Add more service registrations here as needed:
  // componentFactory.registerFormService('card', cardService);
  // componentFactory.registerFormService('company_card', cardService);
  // componentFactory.registerFormService('security', securityService);
  // componentFactory.registerFormService('security_assessment', securityService);
  
  console.log('[Service Registration] Services registered successfully');
}