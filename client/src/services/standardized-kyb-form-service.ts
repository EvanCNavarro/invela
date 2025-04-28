/**
 * Standardized KYB Form Service
 * 
 * This service provides a standardized implementation of the form service interface
 * for KYB forms, following the same pattern as the other standardized form services.
 */

import { EnhancedKybFormService } from './enhanced-kyb-service';
import { registerStandardizedService } from './standardized-service-registry';
import getLogger from '@/utils/logger';

const logger = getLogger('StandardizedKybFormService');

/**
 * StandardizedKybFormService extends the enhanced KYB form service
 * to provide a consistent interface with other standardized form services
 */
export class StandardizedKybFormService extends EnhancedKybFormService {
  constructor(taskId?: number) {
    super();
    
    // Set the task ID if provided
    if (taskId) {
      // Store the task ID for use in methods
      (this as any).taskId = taskId;
      
      logger.info(`Initialized StandardizedKybFormService with task ID: ${taskId}`);
    }
  }

  /**
   * Get demo data for auto-filling KYB forms
   * This method extends the one from the parent class but ensures
   * we use the task ID passed in the constructor
   */
  public async getDemoData(taskId?: number): Promise<Record<string, any>> {
    // Use the taskId from constructor if available, otherwise use the provided taskId
    const effectiveTaskId = (this as any).taskId || taskId;
    
    if (!effectiveTaskId) {
      throw new Error('Task ID is required to retrieve demo data');
    }
    
    logger.info(`StandardizedKybFormService getting demo data for task: ${effectiveTaskId}`);
    
    // Use the implementation from the parent class
    return super.getDemoData(effectiveTaskId);
  }
}

// Register the standardized KYB form service with the service registry
registerStandardizedService('standardizedKybFormService', StandardizedKybFormService);

// Export a singleton instance for convenience
export const standardizedKybFormService = new StandardizedKybFormService();