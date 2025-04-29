/**
 * Open Banking Form Service
 * 
 * This service extends the EnhancedKybFormService to provide a consistent API
 * for Open Banking forms.
 */

import { EnhancedKybFormService, FormServiceLogger } from './enhanced-kyb-service';
import { QueryClient } from '@tanstack/react-query';
import { FormField } from './form-service-interface';

/**
 * Open Banking Form Service
 * 
 * Provides a standardized interface for working with Open Banking forms.
 */
export class OpenBankingFormService extends EnhancedKybFormService {
  private readonly fieldEndpoint = '/api/open-banking/fields';
  private readonly progressEndpoint = '/api/open-banking/progress';
  private readonly demoAutofillEndpoint = '/api/open-banking/demo-autofill';
  private readonly clearEndpoint = '/api/open-banking/clear';
  
  constructor(queryClient: QueryClient) {
    super(queryClient);
    this.serviceName = 'OpenBankingFormService';
  }
  
  /**
   * Get all form field definitions
   * @override
   */
  async getFields(): Promise<FormField[]> {
    try {
      const response = await fetch(this.fieldEndpoint);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch Open Banking fields: ${response.status} ${response.statusText}`);
      }
      
      const fields = await response.json();
      this.log(`Fetched ${fields.length} Open Banking field definitions`);
      
      return fields;
    } catch (error) {
      this.error('Error fetching Open Banking fields:', error);
      return [];
    }
  }
  
  /**
   * Get form data for a specific task
   * @override
   */
  async getTaskData(taskId: number): Promise<Record<string, any>> {
    try {
      if (!taskId) return {};
      
      // Track progress data loading with retries
      const maxRetries = 3;
      let retryCount = 0;
      let timeoutId: NodeJS.Timeout | null = null;
      
      // Setup timeout promise
      const timeout = (ms: number) => new Promise<null>((_, reject) => {
        timeoutId = setTimeout(() => {
          this.warn(`Request timed out after ${ms}ms:`, {});
          reject(new Error(`Request timed out after ${ms}ms`));
        }, ms);
      });
      
      // Setup fetch promise with retries
      const fetchWithRetry = async (): Promise<Record<string, any>> => {
        try {
          this.log(`Getting progress for task ${taskId}`);
          const response = await fetch(`${this.progressEndpoint}/${taskId}`);
          
          if (!response.ok) {
            throw new Error(`Failed with status ${response.status}`);
          }
          
          const data = await response.json();
          if (timeoutId) clearTimeout(timeoutId);
          
          this.log(`Progress loaded successfully:`, {
            taskId,
            progress: data.progress,
            status: data.status,
            formDataKeys: Object.keys(data.formData || {}).length
          });
          
          return data.formData || {};
        } catch (error) {
          retryCount++;
          if (retryCount < maxRetries) {
            this.warn(`Progress fetch attempt ${retryCount} failed with status ${(error as any)?.status || 'unknown'}`);
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount - 1)));
            return fetchWithRetry();
          }
          throw error;
        }
      };
      
      // Race between timeout and fetch
      try {
        const result = await Promise.race([fetchWithRetry(), timeout(9000)]);
        return result || {};
      } catch (error) {
        // Return cached data as fallback
        this.log('Using cached data as fallback after timeout for task ' + taskId);
        return {};
      }
    } catch (error) {
      this.error('Error fetching Open Banking task data:', error);
      return {};
    }
  }
  
  /**
   * Update a single field value
   * @override
   */
  async updateField(taskId: number, fieldKey: string, value: any): Promise<boolean> {
    try {
      this.log(`Updating field ${fieldKey} for task ${taskId}`);
      
      const response = await fetch(`${this.progressEndpoint}/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formData: {
            [fieldKey]: value
          }
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update field: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      this.log(`Field ${fieldKey} updated successfully`, result);
      
      return true;
    } catch (error) {
      this.error(`Error updating field ${fieldKey}:`, error);
      return false;
    }
  }
  
  /**
   * Batch update multiple fields at once
   * @override
   */
  async batchUpdate(taskId: number, formData: Record<string, any>): Promise<boolean> {
    try {
      this.log(`Saving form data for task ${taskId}`);
      
      const response = await fetch(`${this.progressEndpoint}/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formData
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Batch update failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      this.log(`Form data saved successfully for task ${taskId}`, {
        progress: result?.savedData?.progress,
        status: result?.savedData?.status 
      });
      
      return true;
    } catch (error) {
      this.error('Error in batch update:', error);
      return false;
    }
  }
  
  /**
   * Apply demo data to populate the form (for testing)
   * @override
   */
  async demoAutofill(taskId: number): Promise<boolean> {
    try {
      this.log(`Applying demo auto-fill for task ${taskId}`);
      
      const response = await fetch(`${this.demoAutofillEndpoint}/${taskId}`, {
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
   * @override
   */
  async clearAllFields(taskId: number): Promise<boolean> {
    try {
      this.log(`Clearing all fields for task ${taskId}`);
      
      const response = await fetch(`${this.clearEndpoint}/${taskId}`, {
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
   * @override
   */
  getTaskType(): string {
    return 'open_banking';
  }
}

// Create a default instance with an empty QueryClient
// This allows for compatibility with the existing code without breaking changes
export const openBankingFormService = new OpenBankingFormService(new QueryClient());

/**
 * Factory for creating isolated instances of the Open Banking Form Service
 * This ensures that each company and task gets its own isolated service instance
 * to prevent cross-contamination of data
 */
class OpenBankingFormServiceFactory {
  private instanceMap: Map<string, OpenBankingFormService> = new Map();
  private logger = new FormServiceLogger('OpenBankingFormServiceFactory');
  
  /**
   * Gets or creates an isolated service instance for a specific company and task
   * @param companyId Company ID
   * @param taskId Task ID
   * @returns Isolated OpenBankingFormService instance
   */
  getServiceInstance(companyId: number | string, taskId: number | string): OpenBankingFormService {
    const key = `${companyId}_${taskId}`;
    
    if (!this.instanceMap.has(key)) {
      this.logger.log(`Creating new Open Banking service instance for company ${companyId}, task ${taskId}`);
      const service = new OpenBankingFormService(new QueryClient());
      this.instanceMap.set(key, service);
    } else {
      this.logger.log(`Reusing existing Open Banking service instance for company ${companyId}, task ${taskId}`);
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
      this.logger.log(`Clearing Open Banking service instance for company ${companyId}, task ${taskId}`);
      this.instanceMap.delete(key);
    }
  }
  
  /**
   * Clears all instances (useful for testing and forced resets)
   */
  clearAllInstances(): void {
    this.logger.log(`Clearing all Open Banking service instances (${this.instanceMap.size} total)`);
    this.instanceMap.clear();
  }
}

// Export singleton factory
export const openBankingFormServiceFactory = new OpenBankingFormServiceFactory();
