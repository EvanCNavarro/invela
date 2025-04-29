/**
 * Enhanced KY3P Form Service
 * 
 * This service implements a wrapper pattern around the existing KY3P form service
 * instead of using inheritance. This approach resolves the "Class extends value is not a constructor"
 * error and ensures consistent form handling across all form types.
 * 
 * It provides string-based field key support and enhanced logging.
 */

import { KY3PFormService } from './ky3p-form-service';
import { FormServiceInterface, FormField, FormSection, FormSubmitOptions } from './formService';
import getLogger from '@/utils/logger';

// Set up a dedicated logger for this service
const logger = getLogger('EnhancedKY3PFormService');

/**
 * EnhancedKY3PFormService - Wrapper for KY3PFormService
 * 
 * This class wraps the KY3PFormService instead of extending it, which avoids
 * inheritance issues. It delegates most methods to the original service but
 * enhances key functionality like bulkUpdate and clearFields.
 */
/**
 * Type alias for form data
 */
type FormData = Record<string, any>;

export class EnhancedKY3PFormService implements FormServiceInterface {
  private originalService: KY3PFormService;
  private _formType = 'ky3p';
  
  /**
   * Create a new enhanced KY3P form service instance
   * 
   * @param companyId Optional company ID
   * @param taskId Optional task ID
   */
  constructor(companyId?: number, taskId?: number) {
    logger.info('Initializing EnhancedKY3PFormService', {
      companyId,
      taskId,
      timestamp: new Date().toISOString()
    });
    
    // Create the original service that we'll wrap
    this.originalService = new KY3PFormService(companyId, taskId);
    
    logger.info('Original KY3P service created successfully');
  }
  
  // FormServiceInterface implementation
  
  /**
   * Initialize the form with a template ID
   * Delegates to the original service
   */
  async initialize(templateId: number): Promise<void> {
    logger.info(`[EnhancedKY3P] Initializing with template ID: ${templateId}`);
    return this.originalService.initialize(templateId);
  }
  
  /**
   * Get the form type
   */
  get formType(): string {
    return this._formType;
  }
  
  /**
   * Get all fields
   * Delegates to the original service
   */
  getFields(): FormField[] {
    const fields = this.originalService.getFields();
    logger.info(`[EnhancedKY3P] Retrieved ${fields.length} fields`);
    return fields;
  }
  
  /**
   * Get all sections
   * Delegates to the original service
   */
  getSections(): FormSection[] {
    const sections = this.originalService.getSections();
    logger.info(`[EnhancedKY3P] Retrieved ${sections.length} sections`);
    return sections;
  }
  
  /**
   * Get all form data
   * Delegates to the original service
   */
  getFormData(): Record<string, any> {
    const formData = this.originalService.getFormData();
    logger.info(`[EnhancedKY3P] Retrieved form data with ${Object.keys(formData).length} entries`);
    return formData;
  }
  
  /**
   * Load form data into the service
   * @param data Form data to load
   */
  loadFormData(data: FormData): void {
    logger.info(`[EnhancedKY3P] Loading form data with ${Object.keys(data).length} entries`);
    
    // Check if the original service has a loadFormData method
    if (typeof this.originalService.loadFormData === 'function') {
      this.originalService.loadFormData(data);
      logger.info('[EnhancedKY3P] Used original service loadFormData method');
      return;
    }
    
    // Fall back to directly setting the form data property
    try {
      logger.info('[EnhancedKY3P] Using fallback method to load form data');
      // Set the form data directly on the original service
      (this.originalService as any).formData = data;
      logger.info('[EnhancedKY3P] Successfully set form data directly');
    } catch (error) {
      logger.error('[EnhancedKY3P] Error directly setting form data:', error);
    }
  }
  
  /**
   * Update a specific field in the form data
   * @param fieldKey Field key to update
   * @param value New value for the field
   * @param taskId Optional task ID for immediate saving
   */
  updateFormData(fieldKey: string, value: any, taskId?: number): void {
    logger.info(`[EnhancedKY3P] Updating form data for field ${fieldKey}`);
    
    // Check if the original service has an updateFormData method
    if (typeof this.originalService.updateFormData === 'function') {
      this.originalService.updateFormData(fieldKey, value, taskId);
      logger.info('[EnhancedKY3P] Used original service updateFormData method');
      return;
    }
    
    // Fall back to directly updating the form data
    try {
      logger.info('[EnhancedKY3P] Using fallback method to update form data');
      
      // Get the current form data
      const formData = this.getFormData() || {};
      
      // Update the field
      formData[fieldKey] = value;
      
      // Set the updated form data back to the service
      (this.originalService as any).formData = formData;
      
      logger.info(`[EnhancedKY3P] Successfully updated field ${fieldKey} directly`);
    } catch (error) {
      logger.error(`[EnhancedKY3P] Error directly updating field ${fieldKey}:`, error);
    }
  }
  
  /**
   * Get specific field value
   * Delegates to the original service
   */
  getFieldValue(fieldId: string): any {
    return this.originalService.getFieldValue(fieldId);
  }
  
  /**
   * Sync form data with the server
   * Delegates to the original service
   */
  async syncFormData(taskId?: number): Promise<void> {
    logger.info(`[EnhancedKY3P] Syncing form data for task ${taskId || 'unknown'}`);
    // Call the original service if it has this method, otherwise do nothing
    if (typeof this.originalService.syncFormData === 'function') {
      return this.originalService.syncFormData(taskId);
    }
    logger.warn('[EnhancedKY3P] Original service does not have syncFormData method');
  }
  
  /**
   * Load form data for this form
   * @param taskId The task ID to load data for
   * @returns The loaded form data
   */
  async loadProgress(taskId: number): Promise<FormData> {
    logger.info(`[EnhancedKY3P] Loading progress for task ${taskId}`);
    
    try {
      // First try using the original service's loadProgress method
      if (typeof this.originalService.loadProgress === 'function') {
        const result = await this.originalService.loadProgress(taskId);
        logger.info(`[EnhancedKY3P] Successfully loaded progress using original service method`);
        return result;
      }
      
      // Fall back to loadResponses and then return the form data
      logger.info(`[EnhancedKY3P] Original service does not have loadProgress method, using loadResponses fallback`);
      await this.loadResponses(taskId);
      
      // Return the form data from the original service
      const formData = this.originalService.getFormData() || {};
      logger.info(`[EnhancedKY3P] Loaded ${Object.keys(formData).length} form data entries from loadResponses fallback`);
      
      return formData;
    } catch (error) {
      logger.error(`[EnhancedKY3P] Error loading progress:`, error);
      return {}; // Return empty form data on error
    }
  }
  
  /**
   * Calculate form progress
   * Delegates to the original service
   */
  calculateProgress(): number {
    const progress = this.originalService.calculateProgress();
    logger.info(`[EnhancedKY3P] Calculated progress: ${progress}%`);
    return progress;
  }
  
  /**
   * Load existing responses
   * ENHANCED implementation with better error handling
   */
  async loadResponses(taskId?: number): Promise<boolean> {
    const effectiveTaskId = taskId || (this.originalService as any).taskId;
    logger.info(`[EnhancedKY3P] Loading responses for task ${effectiveTaskId || 'unknown'}`);
    
    try {
      // Try to load responses from the original service
      const result = await this.originalService.loadResponses(effectiveTaskId);
      logger.info(`[EnhancedKY3P] Responses loaded successfully for task ${effectiveTaskId}`);
      return result;
    } catch (error) {
      logger.error(`[EnhancedKY3P] Error loading responses:`, error);
      
      // Fallback approach - directly fetch responses from API
      try {
        if (!effectiveTaskId) {
          logger.warn('[EnhancedKY3P] No task ID available for fallback response loading');
          return false;
        }
        
        logger.info(`[EnhancedKY3P] Attempting fallback response loading for task ${effectiveTaskId}`);
        
        const response = await fetch(`/api/ky3p/responses/${effectiveTaskId}`);
        if (!response.ok) {
          logger.error(`[EnhancedKY3P] Fallback response loading failed: ${response.status}`);
          return false;
        }
        
        const responseData = await response.json();
        if (!responseData.responses || !Array.isArray(responseData.responses)) {
          logger.warn('[EnhancedKY3P] Fallback response loading returned invalid data format');
          return false;
        }
        
        // Process the responses
        logger.info(`[EnhancedKY3P] Processing ${responseData.responses.length} responses from fallback method`);
        
        // Update form data in the original service
        // Create a new form data object directly
        const formData: Record<string, any> = {};
        
        // Process the responses and build form data object
        responseData.responses.forEach((response: any) => {
          if (response.field_id && response.response_value) {
            try {
              // Try to update the original service internal data
              (this.originalService as any).updateInternalFormData(response.field_id, response.response_value);
              
              // Also add to our backup form data structure using field ID as string key
              formData[String(response.field_id)] = response.response_value;
              logger.info(`[EnhancedKY3P] Added form data for field ID ${response.field_id}`);
            } catch (updateError) {
              logger.warn(`[EnhancedKY3P] Could not update form data for field ${response.field_id}`);
              
              // Still try to add to our backup form data structure
              formData[String(response.field_id)] = response.response_value;
              logger.info(`[EnhancedKY3P] Added form data for field ID ${response.field_id} via fallback`);
            }
          }
        });
        
        // Get the current fields from the original service to ensure we have the correct data structure
        try {
          const fields = this.originalService.getFields() || [];
          
          // Create a mapping from field ID to field key
          const fieldIdToKeyMap = new Map(fields.map(field => [
            typeof field.id === 'string' ? parseInt(field.id, 10) : field.id, 
            typeof field.key === 'string' ? field.key : String(field.id)
          ]));
          
          // Create field-key based data for the form data object
          const keyBasedData: Record<string, any> = {};
          
          // Try to map numeric field IDs to field keys for better form display
          Object.entries(formData).forEach(([fieldIdStr, value]) => {
            const fieldId = parseInt(fieldIdStr, 10);
            if (!isNaN(fieldId)) {
              const fieldKey = fieldIdToKeyMap.get(fieldId);
              if (fieldKey) {
                keyBasedData[fieldKey] = value;
                logger.info(`[EnhancedKY3P] Mapped field ID ${fieldId} to key ${fieldKey}`);
              }
            }
          });
          
          // Merge the key-based data back into the form data
          Object.assign(formData, keyBasedData);
          
        } catch (mappingError) {
          logger.warn('[EnhancedKY3P] Error mapping field IDs to keys:', mappingError);
        }
        
        // Update the original service's form data directly
        if (Object.keys(formData).length > 0) {
          logger.info(`[EnhancedKY3P] Setting form data directly with ${Object.keys(formData).length} entries`);
          (this.originalService as any).formData = formData;
        }
        
        logger.info('[EnhancedKY3P] Fallback response loading and processing completed successfully');
        return true;
      } catch (fallbackError) {
        logger.error('[EnhancedKY3P] Fallback response loading also failed:', fallbackError);
        return false;
      }
    }
  }
  
  /**
   * Update a single field
   * ENHANCED implementation with logging
   */
  async updateField(fieldIdOrKey: string, value: any, taskId?: number): Promise<any> {
    logger.info(`[EnhancedKY3P] Updating field ${fieldIdOrKey} for task ${taskId || 'unknown'}`);
    
    try {
      // First try string-based batch update for a single field
      const result = await this.standardizedFieldUpdate(fieldIdOrKey, value, taskId);
      if (result) {
        logger.info(`[EnhancedKY3P] Successfully updated field ${fieldIdOrKey} using standardized approach`);
        return result;
      }
      
      // Fall back to original service method
      logger.info(`[EnhancedKY3P] Falling back to original service for field ${fieldIdOrKey}`);
      return this.originalService.updateField(fieldIdOrKey, value, taskId);
    } catch (error) {
      logger.error(`[EnhancedKY3P] Error updating field ${fieldIdOrKey}:`, error);
      throw error;
    }
  }
  
  /**
   * Use string-based field update approach
   * This is a new method specific to the enhanced service
   */
  private async standardizedFieldUpdate(fieldKey: string, value: any, taskId?: number): Promise<any> {
    try {
      const effectiveTaskId = taskId || (this.originalService as any).taskId;
      if (!effectiveTaskId) {
        logger.warn('[EnhancedKY3P] No task ID available for standardized field update');
        return null;
      }
      
      logger.info(`[EnhancedKY3P] Using standardized update for field ${fieldKey}`);
      
      // Use the same endpoint as the bulk update but with a single field
      const response = await fetch(`/api/ky3p/batch-update/${effectiveTaskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          responses: [{
            fieldKey,
            value
          }]
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[EnhancedKY3P] Standardized field update failed: ${response.status}`, errorText);
        return null;
      }
      
      logger.info(`[EnhancedKY3P] Standardized field update succeeded for ${fieldKey}`);
      return response.json();
    } catch (error) {
      logger.error('[EnhancedKY3P] Error in standardized field update:', error);
      return null;
    }
  }
  
  /**
   * Bulk update multiple fields at once
   * ENHANCED implementation with string-based keys
   */
  async bulkUpdate(data: Record<string, any>, taskId?: number): Promise<boolean> {
    logger.info(`[EnhancedKY3P] Bulk updating ${Object.keys(data).length} fields for task ${taskId || 'unknown'}`);
    
    try {
      // Try standardized bulk update first
      const result = await this.standardizedBulkUpdate(data, taskId);
      if (result) {
        logger.info('[EnhancedKY3P] Successfully updated fields using standardized bulk update');
        return true;
      }
      
      // Fall back to original service
      logger.info('[EnhancedKY3P] Falling back to original service bulk update');
      return this.originalService.bulkUpdate(data, taskId);
    } catch (error) {
      logger.error('[EnhancedKY3P] Error during bulk update:', error);
      return false;
    }
  }
  
  /**
   * Standardized bulk update approach
   * This is a new method specific to the enhanced service
   */
  private async standardizedBulkUpdate(data: Record<string, any>, taskId?: number): Promise<boolean> {
    try {
      const effectiveTaskId = taskId || (this.originalService as any).taskId;
      if (!effectiveTaskId) {
        logger.warn('[EnhancedKY3P] No task ID available for standardized bulk update');
        return false;
      }
      
      // Filter out metadata fields before sending to server
      const cleanData = { ...data };
      Object.keys(cleanData).forEach(key => {
        if (key.startsWith('_') || key === 'taskId') {
          delete cleanData[key];
        }
      });
      
      logger.info(`[EnhancedKY3P] Using standardized bulk update for ${Object.keys(cleanData).length} fields`);
      
      // Convert to array format expected by the batch endpoint
      const arrayResponses = Object.entries(cleanData).map(([fieldKey, value]) => ({
        fieldKey,
        value
      }));
      
      const response = await fetch(`/api/ky3p/batch-update/${effectiveTaskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          responses: arrayResponses
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[EnhancedKY3P] Standardized bulk update failed: ${response.status}`, errorText);
        return false;
      }
      
      const responseJson = await response.json();
      logger.info(`[EnhancedKY3P] Standardized bulk update succeeded: ${responseJson.updatedCount || 0} fields updated`);
      
      // Update local data for any successfully updated fields
      if (responseJson.updatedKeys && Array.isArray(responseJson.updatedKeys)) {
        responseJson.updatedKeys.forEach((key: string) => {
          (this.originalService as any).formData[key] = cleanData[key];
        });
      }
      
      return true;
    } catch (error) {
      logger.error('[EnhancedKY3P] Error in standardized bulk update:', error);
      return false;
    }
  }
  
  /**
   * Save form progress
   * Delegates to the original service with enhanced logging
   * Implementation modified to match FormServiceInterface return type
   */
  async saveProgress(taskId?: number): Promise<void> {
    logger.info(`[EnhancedKY3P] Saving progress for task ${taskId || 'unknown'}`);
    
    try {
      const effectiveTaskId = taskId || (this.originalService as any).taskId;
      const success = await this.originalService.saveProgress(effectiveTaskId);
      logger.info(`[EnhancedKY3P] Progress save ${success ? 'successful' : 'failed'}`);
      // Return void to satisfy interface, but log the success result
      // Interface expects Promise<void>, original implementation returns Promise<boolean>
      return;
    } catch (error) {
      logger.error('[EnhancedKY3P] Error saving progress:', error);
      // Don't rethrow the error to match the interface, which expects void return
    }
  }
  
  /**
   * Submit the form
   * Delegates to the original service with enhanced logging
   * Modified to accept FormSubmitOptions parameter to match FormServiceInterface
   */
  async submit(options: FormSubmitOptions): Promise<any> {
    const taskId = options?.taskId || (this.originalService as any).taskId;
    logger.info(`[EnhancedKY3P] Submitting form for task ${taskId || 'unknown'}`);
    
    try {
      // If the original service accepts FormSubmitOptions, pass the options directly
      // Otherwise extract the taskId and pass that
      const originalSubmitParams = options.taskId ? options : taskId;
      const result = await this.originalService.submit(originalSubmitParams);
      logger.info('[EnhancedKY3P] Form submission successful');
      return result;
    } catch (error) {
      logger.error('[EnhancedKY3P] Error submitting form:', error);
      // Standardize error objects for consistent pattern in UI
      if (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error : new Error(String(error))
        };
      }
      // Return a standardized error object instead of throwing
      return { success: false, error: new Error('Unknown form submission error') };
    }
  }
  
  /**
   * Clear all fields
   * ENHANCED implementation that ensures navigation to first section
   */
  async clearFields(taskId?: number): Promise<boolean> {
    const effectiveTaskId = taskId || (this.originalService as any).taskId;
    
    logger.info(`[EnhancedKY3P] Clearing all fields for task ${effectiveTaskId || 'unknown'}`);
    
    try {
      // First, use the original service's method to clear fields
      // Make sure to pass the effectiveTaskId parameter to ensure it works
      const result = await this.originalService.clearFields(effectiveTaskId);
      
      if (!result) {
        logger.warn('[EnhancedKY3P] Failed to clear fields using original service');
        return false;
      }
      
      logger.info('[EnhancedKY3P] Fields successfully cleared');
      
      // Send a WebSocket event to notify the client to navigate to the first section
      // This ensures navigation happens AFTER fields have been cleared
      try {
        // Use the internal WebSocket connection if available
        if (window && window.WebSocket) {
          // First make sure we have sections to navigate to
          const sections = this.getSections();
          if (sections && sections.length > 0) {
            const firstSectionId = sections[0].id;
            
            // Try to send a navigation message via WebSocket
            logger.info(`[EnhancedKY3P] Sending navigation event to first section: ${firstSectionId}`);
            
            // Create a generic navigation event that can be handled by the form components
            const navigationEvent = {
              type: 'form_navigation',
              payload: {
                action: 'navigate_to_section',
                sectionId: firstSectionId,
                taskId: effectiveTaskId,
                formType: this.formType,
                timestamp: new Date().toISOString()
              }
            };
            
            // Dispatch an event for local components to pick up
            // This is a fallback in case WebSocket is not available
            const event = new CustomEvent('form-navigation', { 
              detail: navigationEvent,
              bubbles: true
            });
            document.dispatchEvent(event);
            
            logger.info('[EnhancedKY3P] Navigation event dispatched successfully');
          } else {
            logger.warn('[EnhancedKY3P] No sections found for navigation after clearing fields');
          }
        }
      } catch (navError) {
        logger.error('[EnhancedKY3P] Error sending navigation event:', navError);
        // Don't fail the entire clear operation if navigation fails
      }
      
      return true;
    } catch (error) {
      logger.error('[EnhancedKY3P] Error clearing fields:', error);
      return false;
    }
  }
  
  /**
   * Save form data
   * Delegates to the original service with enhanced logging
   */
  async save(options: Record<string, any>): Promise<any> {
    logger.info('[EnhancedKY3P] Saving form data with options:', options);
    
    try {
      const result = await this.originalService.save(options);
      logger.info('[EnhancedKY3P] Form data save successful');
      return result;
    } catch (error) {
      logger.error('[EnhancedKY3P] Error saving form data:', error);
      throw error;
    }
  }
}

/**
 * Factory for creating EnhancedKY3PFormService instances
 * This provides a consistent interface with other form service factories
 */
export const enhancedKY3PFormServiceFactory = {
  /**
   * Get or create a service instance for a specific company and task
   * 
   * @param companyId Company ID
   * @param taskId Task ID
   * @returns EnhancedKY3PFormService instance
   */
  getServiceInstance(companyId?: number | string, taskId?: number | string): EnhancedKY3PFormService {
    const companyIdNum = typeof companyId === 'string' ? parseInt(companyId, 10) : companyId;
    const taskIdNum = typeof taskId === 'string' ? parseInt(taskId, 10) : taskId;
    
    logger.info(`[EnhancedKY3PFactory] Creating service instance for company ${companyIdNum}, task ${taskIdNum}`);
    
    return new EnhancedKY3PFormService(
      companyIdNum as number, 
      taskIdNum as number
    );
  }
};
