/**
 * Enhanced KYB Form Service
 * 
 * Provides a standardized interface for working with KYB forms.
 */

import { QueryClient } from '@tanstack/react-query';
import { FormField, FormServiceInterface } from './form-service-interface';

/**
 * Logger class for form services
 */
export class FormServiceLogger {
  private prefix: string;
  
  constructor(prefix: string) {
    this.prefix = prefix;
  }
  
  log(message: string, ...args: any[]): void {
    console.log(`INFO: [${this.prefix}] ${message}`, ...args);
  }
  
  warn(message: string, ...args: any[]): void {
    console.warn(`WARN: [${this.prefix}] ${message}`, ...args);
  }
  
  error(message: string, ...args: any[]): void {
    console.error(`ERROR: [${this.prefix}] ${message}`, ...args);
  }
}

/**
 * Enhanced KYB Form Service
 * 
 * This service provides a consistent API for working with KYB forms
 * and serves as a base class for other form services.
 */
export class EnhancedKybFormService implements FormServiceInterface {
  protected queryClient: QueryClient;
  protected logger: FormServiceLogger;
  protected serviceName: string = 'EnhancedKybFormService';
  
  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
    this.logger = new FormServiceLogger(this.serviceName);
  }
  
  /**
   * Get all form field definitions
   */
  async getFields(): Promise<FormField[]> {
    try {
      const response = await fetch('/api/kyb/fields');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch KYB fields: ${response.status} ${response.statusText}`);
      }
      
      const fields = await response.json();
      this.log(`Fetched ${fields.length} KYB field definitions`);
      
      return fields;
    } catch (error) {
      this.error('Error fetching KYB fields:', error);
      return [];
    }
  }
  
  /**
   * Get form data for a specific task
   */
  async getTaskData(taskId: number): Promise<Record<string, any>> {
    try {
      if (!taskId) return {};
      
      const response = await fetch(`/api/kyb/progress/${taskId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch KYB progress: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      this.log(`Fetched form data for task ${taskId} with ${Object.keys(data?.formData || {}).length} fields`);
      
      return data?.formData || {};
    } catch (error) {
      this.error('Error fetching KYB task data:', error);
      return {};
    }
  }
  
  /**
   * Update a single field value
   */
  async updateField(taskId: number, fieldKey: string, value: any): Promise<boolean> {
    try {
      this.log(`Updating field ${fieldKey} for task ${taskId}`);
      
      const response = await fetch(`/api/kyb/update-field/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fieldKey,
          value: value?.toString() || '',
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update field: ${response.status} ${response.statusText}`);
      }
      
      return true;
    } catch (error) {
      this.error(`Error updating field ${fieldKey}:`, error);
      return false;
    }
  }
  
  /**
   * Batch update multiple fields at once
   */
  async batchUpdate(taskId: number, formData: Record<string, any>): Promise<boolean> {
    try {
      this.log(`Batch updating ${Object.keys(formData).length} fields for task ${taskId}`);
      
      const response = await fetch(`/api/kyb/batch-update/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formData,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Batch update failed: ${response.status} ${response.statusText}`);
      }
      
      return true;
    } catch (error) {
      this.error('Error in batch update:', error);
      return false;
    }
  }
  
  /**
   * Apply demo data to populate the form (for testing)
   */
  async demoAutofill(taskId: number): Promise<boolean> {
    try {
      this.log(`Applying demo auto-fill for task ${taskId}`);
      
      const response = await fetch(`/api/kyb/demo-autofill/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Demo auto-fill failed: ${response.status} ${response.statusText}`);
      }
      
      return true;
    } catch (error) {
      this.error('Error applying demo auto-fill:', error);
      return false;
    }
  }
  
  /**
   * Clear all field values for the task
   */
  async clearAllFields(taskId: number): Promise<boolean> {
    try {
      this.log(`Clearing all fields for task ${taskId}`);
      
      const response = await fetch(`/api/kyb/clear/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Clear fields failed: ${response.status} ${response.statusText}`);
      }
      
      return true;
    } catch (error) {
      this.error('Error clearing fields:', error);
      return false;
    }
  }
  
  /**
   * Get the task type for this form service
   */
  getTaskType(): string {
    return 'kyb';
  }
  
  /**
   * Get the current form data
   * 
   * This method is required by form components to access the current state
   * without making a new API request.
   */
  getFormData(): Record<string, any> {
    // In the base class, we don't have cached data, so we return an empty object
    // Subclasses should override this to return their cached data
    this.log('Getting form data (base implementation returns empty object)');
    return {};
  }
  
  /**
   * Clear the service cache
   * 
   * This method is used to reset the service state when needed.
   * Subclasses should override this to clear their specific cached data.
   */
  clearCache(): void {
    this.log('Clearing cache (base implementation does nothing)');
    // In the base class, there's no cache to clear
    // Subclasses should override this to clear their specific caches
  }
  
  /**
   * Load saved progress for a task
   * 
   * This method is used by FormDataManager to retrieve saved form data.
   * It uses getTaskData internally and should be consistent with it.
   */
  async loadProgress(taskId: number): Promise<Record<string, any>> {
    this.log(`Loading progress for task ${taskId}`);
    try {
      // By default, just call getTaskData which fetches the latest data
      return await this.getTaskData(taskId);
    } catch (error) {
      this.error('Error loading progress:', error);
      return {};
    }
  }
  
  // Logging methods
  protected log(message: string, ...args: any[]): void {
    this.logger.log(message, ...args);
  }
  
  protected warn(message: string, ...args: any[]): void {
    this.logger.warn(message, ...args);
  }
  
  protected error(message: string, ...args: any[]): void {
    this.logger.error(message, ...args);
  }
}

// Create a default instance with an empty QueryClient
// This allows for compatibility with the existing code without breaking changes
export const enhancedKybService = new EnhancedKybFormService(new QueryClient());

/**
 * Factory for creating isolated instances of the Enhanced KYB Form Service
 * This ensures that each company and task gets its own isolated service instance
 * to prevent cross-contamination of data
 */
class EnhancedKybServiceFactory {
  private instanceMap: Map<string, EnhancedKybFormService> = new Map();
  private logger = new FormServiceLogger('EnhancedKybServiceFactory');
  
  /**
   * Gets or creates an isolated service instance for a specific company and task
   * @param companyId Company ID
   * @param taskId Task ID
   * @returns Isolated EnhancedKybFormService instance
   */
  getInstance(companyId: number | string, taskId: number | string): EnhancedKybFormService {
    const key = `${companyId}_${taskId}`;
    
    if (!this.instanceMap.has(key)) {
      this.logger.log(`Creating new KYB service instance for company ${companyId}, task ${taskId}`);
      const service = new EnhancedKybFormService(new QueryClient());
      this.instanceMap.set(key, service);
    } else {
      this.logger.log(`Reusing existing KYB service instance for company ${companyId}, task ${taskId}`);
    }
    
    return this.instanceMap.get(key)!;
  }
  
  /**
   * Clears the instance for a specific company and task (useful for cleanup)
   * @param companyId Company ID
   * @param taskId Task ID
   */
  clearInstance(companyId: number | string, taskId: number | string): void {
    const key = `${companyId}_${taskId}`;
    if (this.instanceMap.has(key)) {
      this.logger.log(`Clearing KYB service instance for company ${companyId}, task ${taskId}`);
      this.instanceMap.delete(key);
    }
  }
  
  /**
   * Clears all instances (useful for testing and forced resets)
   */
  clearAllInstances(): void {
    this.logger.log(`Clearing all KYB service instances (${this.instanceMap.size} total)`);
    this.instanceMap.clear();
  }
}

// Export singleton factory
export const enhancedKybServiceFactory = new EnhancedKybServiceFactory();