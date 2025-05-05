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
  
  constructor() {
    // Create a default instance for global use when context is missing
    this.defaultInstance = new EnhancedKybFormService();
    this.initialized = true;
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
    try {
      // OODA: Observe - Check what context we have available
      const hasCompanyId = companyId !== undefined && companyId !== null;
      const hasTaskId = taskId !== undefined && taskId !== null;
      
      // OODA: Orient - Use appropriate key based on available context
      let instanceKey: string;
      
      if (hasCompanyId && hasTaskId) {
        // Both company and task IDs available - full isolation
        instanceKey = `company_${companyId}_task_${taskId}`;
        logger.info(`Creating isolated KYB service for company ${companyId}, task ${taskId}`);
      } else if (hasCompanyId) {
        // Only company ID available - company-level isolation
        instanceKey = `company_${companyId}`;
        logger.info(`Creating company-level KYB service for company ${companyId}`);
      } else {
        // No context available - use global instance with info level (not warning)
        logger.info('No company context found, using global instance');
        return this.defaultInstance;
      }
      
      // OODA: Decide - Check if we already have an instance for this context
      if (!this.instances.has(instanceKey)) {
        // OODA: Act - Create a new isolated instance for this context
        const instance = new EnhancedKybFormService();
        this.instances.set(instanceKey, instance);
        logger.info(`Created new KYB service instance with key: ${instanceKey}`);
        return instance;
      }
      
      // Return existing instance
      return this.instances.get(instanceKey)!;
    } catch (error) {
      // KISS: Simple error handling with fallback to default instance
      logger.info('Error creating isolated KYB service instance, using default:', 
        error instanceof Error ? error.message : String(error));
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
