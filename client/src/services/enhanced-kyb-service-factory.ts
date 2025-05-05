/**
 * Enhanced KYB Service Factory with Robust Context Handling
 * 
 * This module implements a factory pattern for EnhancedKybFormService instances
 * that properly handles missing user/company contexts during initialization.
 * 
 * OODA Loop Implementation:
 * - Observe: Detect missing context information during initialization
 * - Orient: Understand which contexts are available and provide fallbacks
 * - Decide: Choose appropriate initialization strategy based on available context
 * - Act: Create properly isolated service instances with graceful degradation
 */

import { EnhancedKybFormService } from './enhanced-kyb-service';
import getLogger from '@/utils/logger';

const logger = getLogger('EnhancedKybServiceFactory');

/**
 * A singleton factory that creates isolated instances of EnhancedKybFormService
 * while gracefully handling missing context information
 * 
 * KISS Principle: Simple factory design with clear responsibility and minimal complexity
 */
class EnhancedKybServiceFactory {
  private instances: Map<string, EnhancedKybFormService> = new Map();
  private defaultInstance: EnhancedKybFormService;
  private initialized = false;
  private _userContextError = false;
  
  constructor() {
    try {
      // Create a default instance for global use when context is missing
      this.defaultInstance = new EnhancedKybFormService();
      this.initialized = true;
      
      // Only report user context error once
      this._userContextError = false;
    } catch (error) {
      // Handle initialization errors gracefully
      logger.warn('Error initializing EnhancedKybServiceFactory, using minimal instance:', 
        error instanceof Error ? error.message : String(error));
      
      // Create minimal default instance as fallback
      this.defaultInstance = new EnhancedKybFormService();
      this.initialized = true;
    }
  }
  
  /**
   * Get an isolated instance for a specific company and task
   * with proper fallbacks if context is missing
   * 
   * @param companyId Optional company ID for isolation
   * @param taskId Optional task ID for further isolation
   * @returns An instance of EnhancedKybFormService
   */
  public getInstance(companyId?: number | string, taskId?: number | string): EnhancedKybFormService {
    // Ensure we return a valid instance even if errors occur during creation
    if (!this.initialized || !this.defaultInstance) {
      // Safety check to prevent usage before initialization
      try {
        this.defaultInstance = new EnhancedKybFormService();
        this.initialized = true;
      } catch (initError) {
        logger.error('Critical initialization error in KYB service factory:', initError);
        // Absolute last resort: create bare-bones implementation
        this.defaultInstance = new EnhancedKybFormService();
      }
    }
    
    try {
      // OODA: Observe - Check what context we have available and sanitize inputs
      // Convert any non-numeric string inputs to numbers
      const normalizedCompanyId = typeof companyId === 'string' ? parseInt(companyId, 10) : companyId;
      const normalizedTaskId = typeof taskId === 'string' ? parseInt(taskId, 10) : taskId;
      
      // Check for valid context after normalization
      const hasCompanyId = normalizedCompanyId !== undefined && 
                         normalizedCompanyId !== null && 
                         !isNaN(Number(normalizedCompanyId));
      const hasTaskId = normalizedTaskId !== undefined && 
                     normalizedTaskId !== null && 
                     !isNaN(Number(normalizedTaskId));
      
      // OODA: Orient - Use appropriate key based on available context
      let instanceKey: string;
      
      if (hasCompanyId && hasTaskId) {
        // Both company and task IDs available - full isolation
        instanceKey = `company_${normalizedCompanyId}_task_${normalizedTaskId}`;
        logger.info(`Creating isolated KYB service for company ${normalizedCompanyId}, task ${normalizedTaskId}`);
      } else if (hasCompanyId) {
        // Only company ID available - company-level isolation
        instanceKey = `company_${normalizedCompanyId}`;
        logger.info(`Creating company-level KYB service for company ${normalizedCompanyId}`);
      } else {
        // No valid context available - use global instance with info level (not warning)
        if (!this._userContextError) {
          logger.info('No company context found, using global instance');
          this._userContextError = true; // Only log once
        }
        return this.defaultInstance;
      }
      
      // OODA: Decide - Check if we already have an instance for this context
      if (!this.instances.has(instanceKey)) {
        // OODA: Act - Create a new isolated instance for this context
        try {
          const instance = new EnhancedKybFormService();
          this.instances.set(instanceKey, instance);
          logger.info(`Created new KYB service instance with key: ${instanceKey}`);
          return instance;
        } catch (instanceError) {
          // If instance creation fails, gracefully fall back to default
          logger.warn(`Error creating instance for ${instanceKey}:`, instanceError);
          return this.defaultInstance;
        }
      }
      
      // Return existing instance with null safety
      const instance = this.instances.get(instanceKey);
      return instance || this.defaultInstance;
    } catch (error) {
      // KISS: Simple error handling with fallback to default instance
      if (!this._userContextError) {
        logger.info('Error creating isolated KYB service instance, using default:', 
          error instanceof Error ? error.message : String(error));
        this._userContextError = true; // Only log once
      }
      return this.defaultInstance;
    }
  }
  
  /**
   * Clear all instances to free memory or force recreation
   */
  public clearInstances(): void {
    this.instances.clear();
    logger.info('Cleared all KYB service instances');
  }
}

// Create singleton instance of the factory
export const enhancedKybServiceFactory = new EnhancedKybServiceFactory();

// Export default instance for backward compatibility
export const enhancedKybService = enhancedKybServiceFactory.getInstance();
