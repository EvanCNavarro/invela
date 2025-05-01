/**
 * Unified KY3P Form Service
 * 
 * This service combines the best features of all three KY3P service implementations
 * (original, enhanced, and fixed) into a single, unified service that handles all
 * edge cases and avoids duplicate API calls.
 */

import { FormField, FormSection, FormServiceInterface, FormSubmitOptions } from './formService';
import { apiRequest } from '@/lib/queryClient';
import getLogger from '@/utils/logger';

// Use Record<string, any> for our form data to avoid conflicts with DOM FormData
type FormDataRecord = Record<string, any>;

const logger = getLogger('UnifiedKY3PFormService');

/**
 * Unified KY3P Form Service
 * 
 * This class provides a complete implementation of the FormServiceInterface
 * for KY3P forms, with robust error handling, caching, and standardized
 * batch update functionality.
 */
export class UnifiedKY3PFormService implements FormServiceInterface {
  // Service configuration
  private _companyId?: number;
  private _taskId?: number;
  private _templateId?: number;
  private _formType = 'ky3p';
  
  // Form data storage
  private _formData: FormDataRecord = {};
  private _fields: FormField[] = [];
  private _sections: FormSection[] = [];
  
  // Cache settings
  private lastFormDataRetrievalTime = 0;
  private formDataCacheTTL = 500; // milliseconds
  private static fieldsCache: Record<number, FormField[]> = {};
  
  // Batch update handling
  private pendingUpdates: Record<string, any> = {};
  private isBatchUpdateActive = false;
  private batchUpdateTimer: any = null;
  private batchUpdateInterval = 250; // milliseconds
  
  /**
   * Constructor
   * 
   * @param companyId Optional company ID
   * @param taskId Optional task ID
   */
  constructor(companyId?: number, taskId?: number) {
    this._companyId = companyId;
    this._taskId = taskId;
    
    logger.info('[Unified KY3P] Initializing service', {
      companyId,
      taskId,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Initialize the service with a template ID
   * 
   * @param templateId The template ID to initialize with
   */
  async initialize(templateId: number): Promise<void> {
    this._templateId = templateId;
    
    logger.info(`[Unified KY3P] Initializing with template ID: ${templateId}`);
    
    try {
      await this.loadFields();
      this.generateSections();
      
      logger.info(`[Unified KY3P] Successfully initialized with ${this._fields.length} fields and ${this._sections.length} sections`);
    } catch (error) {
      logger.error(`[Unified KY3P] Initialization error:`, error);
      throw error;
    }
  }
  
  /**
   * Get the form type
   */
  get formType(): string {
    return this._formType;
  }
  
  /**
   * Get the task ID
   */
  get taskId(): number | undefined {
    return this._taskId;
  }
  
  /**
   * Set the task ID
   */
  set taskId(value: number | undefined) {
    this._taskId = value;
  }
  
  /**
   * Get all fields
   */
  getFields(): FormField[] {
    return this._fields;
  }
  
  /**
   * Get all sections
   */
  getSections(): FormSection[] {
    return this._sections;
  }
  
  /**
   * Get all form data
   */
  getFormData(): Record<string, any> {
    return this._formData;
  }
  
  /**
   * Load form data into the service
   * 
   * @param data Form data to load
   */
  loadFormData(data: FormDataRecord): void {
    // Safely merge in the new data
    this._formData = { ...this._formData, ...data };
    
    logger.info(`[Unified KY3P] Loaded form data with ${Object.keys(data).length} entries`);
  }
  
  /**
   * Update a single form field value with batching to reduce API calls
   * 
   * @param fieldKey The field key to update
   * @param value The new value to set
   * @param taskId Optional task ID for immediate saving
   */
  updateFormData(fieldKey: string, value: any, taskId?: number): void {
    // Check if value has changed before queueing update to prevent infinite loops
    const existingValue = this._formData[fieldKey];
    const valueChanged = JSON.stringify(existingValue) !== JSON.stringify(value);
    
    // Skip update if value hasn't changed to prevent infinite loops
    if (!valueChanged && existingValue !== undefined) {
      return;
    }
    
    // Update local form data immediately for UI consistency
    this._formData[fieldKey] = value;
    
    // Queue the update for batch processing
    this.pendingUpdates[fieldKey] = value;
    
    // If we're already processing a batch update, don't schedule another one
    if (this.isBatchUpdateActive) {
      return;
    }
    
    // Clear any existing timer
    if (this.batchUpdateTimer) {
      clearTimeout(this.batchUpdateTimer);
    }
    
    // Schedule a batch update
    this.batchUpdateTimer = setTimeout(() => {
      this.flushPendingUpdates(taskId);
    }, this.batchUpdateInterval);
  }
  
  /**
   * Process all pending updates in a single batch API call
   * 
   * @param taskId Optional task ID to use for the update
   */
  private async flushPendingUpdates(taskId?: number): Promise<boolean> {
    // Skip if no pending updates
    if (Object.keys(this.pendingUpdates).length === 0) {
      return true;
    }
    
    try {
      this.isBatchUpdateActive = true;
      this.batchUpdateTimer = null;
      
      // Get the effective task ID
      const effectiveTaskId = taskId || this._taskId;
      if (!effectiveTaskId) {
        logger.warn('[Unified KY3P] No task ID available for batch update');
        throw new Error('No task ID available for batch update');
      }
      
      // Log the batch update
      logger.info(`[Unified KY3P] Processing batch update with ${Object.keys(this.pendingUpdates).length} fields for task ${effectiveTaskId}`);
      
      // Clone and clear pending updates
      const updates = { ...this.pendingUpdates };
      this.pendingUpdates = {};
      
      // Use standardized batch update endpoint
      const result = await this.sendBatchUpdate(updates, effectiveTaskId);
      
      logger.info(`[Unified KY3P] Batch update ${result ? 'succeeded' : 'failed'}`);
      return result;
    } catch (error) {
      logger.error('[Unified KY3P] Error in batch update:', error);
      return false;
    } finally {
      this.isBatchUpdateActive = false;
    }
  }
  
  /**
   * Send a batch update to the server
   * 
   * @param data The data to update
   * @param taskId The task ID to update
   */
  private async sendBatchUpdate(data: Record<string, any>, taskId: number): Promise<boolean> {
    try {
      // Filter out metadata fields before sending to server
      const cleanData = { ...data };
      Object.keys(cleanData).forEach(key => {
        if (key.startsWith('_') || key === 'taskId') {
          delete cleanData[key];
        }
      });
      
      if (Object.keys(cleanData).length === 0) {
        logger.info('[Unified KY3P] No valid fields to update after filtering');
        return true; // No updates needed, return success
      }
      
      // Send the update using the batch update endpoint
      logger.info(`[Unified KY3P] Sending batch update for ${Object.keys(cleanData).length} fields`);
      
      const response = await fetch(`/api/ky3p/batch-update/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskIdRaw: String(taskId),
          fieldIdRaw: 'bulk',
          responseValue: JSON.stringify(cleanData),
          responseValueType: 'object'
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[Unified KY3P] Batch update failed: ${response.status} - ${errorText}`);
        return false;
      }
      
      // Parse response to check for success
      const result = await response.json();
      
      if (result.success) {
        logger.info('[Unified KY3P] Server confirmed successful batch update');
        
        // Update progress if it's included in the response
        if (result.progress !== undefined) {
          this._formData._progress = result.progress;
        }
        
        // If the server sent updated form data, update our local copy
        if (result.formData) {
          this.loadFormData(result.formData);
        }
        
        return true;
      }
      
      logger.warn('[Unified KY3P] Server reported batch update failure:', result.message || 'Unknown error');
      return false;
    } catch (error) {
      logger.error('[Unified KY3P] Error sending batch update:', error);
      return false;
    }
  }
  
  /**
   * Get a specific field value
   * 
   * @param fieldId The field ID or key to get the value for
   */
  getFieldValue(fieldId: string): any {
    return this._formData[fieldId];
  }
  
  /**
   * Synchronize form data with the server
   * 
   * @param taskId Optional task ID to synchronize
   */
  async syncFormData(taskId?: number): Promise<any> {
    logger.info(`[Unified KY3P] Syncing form data for task ${taskId || this._taskId || 'unknown'}`);
    
    try {
      // Use the effective task ID
      const effectiveTaskId = taskId || this._taskId;
      if (!effectiveTaskId) {
        logger.warn('[Unified KY3P] No task ID available for sync');
        throw new Error('No task ID available for sync');
      }
      
      // Fetch the latest progress data from the server
      logger.info(`[Unified KY3P] Fetching latest form data from /api/ky3p/progress/${effectiveTaskId}`);
      
      const response = await fetch(`/api/ky3p/progress/${effectiveTaskId}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.warn(`[Unified KY3P] Progress API returned error ${response.status}: ${errorText}`);
        throw new Error(`Progress API returned error ${response.status}`);
      }
      
      // Parse the response
      const progressData = await response.json();
      
      if (!progressData.success) {
        logger.warn('[Unified KY3P] Progress API reported failure');
        throw new Error('Progress API reported failure');
      }
      
      // Update local progress status
      if (progressData.progress !== undefined) {
        this._formData._progress = progressData.progress;
      }
      
      // Update our local form data from the response
      if (progressData.formData) {
        // Update our form data with the server's data
        this.loadFormData(progressData.formData);
        
        logger.info(`[Unified KY3P] Updated form data with ${Object.keys(progressData.formData).length} fields from server`);
      } else {
        logger.warn('[Unified KY3P] Progress API returned no form data');
      }
      
      // Return a valid response object
      return {
        success: true,
        formData: this._formData,
        progress: progressData.progress || 0,
        status: progressData.status || 'synced',
        taskId: effectiveTaskId,
        syncDirection: 'server_to_client',
        responseCount: progressData.responseCount,
        fieldCount: progressData.fieldCount
      };
    } catch (error) {
      logger.error(`[Unified KY3P] Error syncing form data:`, error);
      
      // Return an error response that matches what components expect
      return {
        success: false,
        formData: this._formData,
        progress: 0,
        status: 'error',
        taskId: taskId || this._taskId || 0,
        syncDirection: 'none',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Load form progress from the server
   * 
   * @param taskId The task ID to load progress for
   */
  async loadProgress(taskId: number): Promise<FormDataRecord> {
    logger.info(`[Unified KY3P] Loading progress for task ${taskId}`);
    
    try {
      // Store the task ID for future operations
      this._taskId = taskId;
      
      // First, try to fetch the task details to check status
      const taskInfo = await this.getTaskInfo(taskId);
      logger.info(`[Unified KY3P] Task info: status=${taskInfo.status}, isSubmitted=${taskInfo.isSubmitted}`);
      
      // Store task status in form data
      this._formData._taskStatus = taskInfo.status;
      this._formData._isSubmitted = taskInfo.isSubmitted;
      
      // Fetch responses from the responses endpoint
      const responses = await this.fetchResponses(taskId);
      
      // Also try the progress endpoint for complete data
      try {
        const progressData = await this.fetchProgress(taskId);
        
        // If we got progress data, prefer it over responses data
        if (progressData && progressData.formData) {
          // Update form data from progress endpoint which includes calculated fields
          this.loadFormData(progressData.formData);
          
          // Store progress percentage in form data
          if (progressData.progress !== undefined) {
            this._formData._progress = progressData.progress;
          }
          
          logger.info(`[Unified KY3P] Used progress endpoint data with ${Object.keys(progressData.formData).length} fields`);
        } else {
          // If no form data from progress endpoint, use the responses data
          logger.info(`[Unified KY3P] Falling back to responses data with ${Object.keys(responses).length} fields`);
          this.loadFormData(responses);
        }
      } catch (progressError) {
        // If progress endpoint fails, fall back to responses
        logger.warn(`[Unified KY3P] Progress endpoint failed, using responses data: ${progressError}`);
        this.loadFormData(responses);
      }
      
      // Return the loaded form data
      return this._formData;
    } catch (error) {
      logger.error(`[Unified KY3P] Error loading progress:`, error);
      
      // In case of error, return any data we already have
      return this._formData;
    }
  }
  
  /**
   * Get task information from the server
   * 
   * @param taskId The task ID to get information for
   */
  private async getTaskInfo(taskId: number): Promise<any> {
    try {
      const response = await fetch(`/api/tasks/${taskId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get task info: ${response.status}`);
      }
      
      const taskData = await response.json();
      
      return {
        status: taskData.status || 'not_started',
        isSubmitted: taskData.status === 'completed' || taskData.status === 'submitted',
        submissionDate: taskData.submitted_at,
        metadata: Object.keys(taskData)
      };
    } catch (error) {
      logger.error(`[Unified KY3P] Error getting task info:`, error);
      return { status: 'unknown', isSubmitted: false };
    }
  }
  
  /**
   * Fetch form responses from the server
   * 
   * @param taskId The task ID to fetch responses for
   */
  private async fetchResponses(taskId: number): Promise<Record<string, any>> {
    try {
      const url = `/api/tasks/${taskId}/ky3p-responses`;
      logger.info(`[Unified KY3P] Fetching responses from: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[Unified KY3P] Responses API error ${response.status}: ${errorText}`);
        throw new Error(`Failed to fetch responses: ${response.status}`);
      }
      
      const responseData = await response.json();
      logger.info(`[Unified KY3P] Responses API status: ${response.status}`);
      
      if (!responseData.success) {
        throw new Error('API returned success: false');
      }
      
      // Convert responses to form data format
      const formData: Record<string, any> = {};
      
      if (Array.isArray(responseData.responses)) {
        logger.info(`[Unified KY3P] Retrieved ${responseData.responses.length} raw responses`);
        
        // Map responses to field keys
        responseData.responses.forEach((response: any) => {
          // Get the field from our loaded fields
          const field = this._fields.find(f => f.id === response.field_id);
          
          if (field) {
            // Use the field key if available, otherwise use the field ID
            const key = field.fieldKey || `field_${response.field_id}`;
            formData[key] = response.response_value;
          } else {
            // Fallback to using just the field ID if we can't find the field
            formData[`field_${response.field_id}`] = response.response_value;
          }
        });
        
        // Also store the raw responses for reference
        formData._rawResponses = responseData.responses;
      }
      
      // Include task status if available
      if (responseData.status) {
        formData._taskStatus = responseData.status;
      }
      
      return formData;
    } catch (error) {
      logger.error(`[Unified KY3P] Error fetching responses:`, error);
      return {};
    }
  }
  
  /**
   * Fetch form progress from the server
   * 
   * @param taskId The task ID to fetch progress for
   */
  private async fetchProgress(taskId: number): Promise<any> {
    try {
      const url = `/api/ky3p/progress/${taskId}`;
      logger.info(`[Unified KY3P] Fetching progress from: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[Unified KY3P] Progress API error ${response.status}: ${errorText}`);
        throw new Error(`Failed to fetch progress: ${response.status}`);
      }
      
      const progressData = await response.json();
      logger.info(`[Unified KY3P] Progress API status: ${response.status}`);
      
      return progressData;
    } catch (error) {
      logger.error(`[Unified KY3P] Error fetching progress:`, error);
      throw error;
    }
  }
  
  /**
   * Clear all form fields
   * 
   * @param taskId Optional task ID to operate on
   */
  async clearFields(taskId?: number): Promise<boolean> {
    logger.info(`[Unified KY3P] Clearing all form fields for task ${taskId || this._taskId || 'unknown'}`);
    
    try {
      // Use the effective task ID
      const effectiveTaskId = taskId || this._taskId;
      if (!effectiveTaskId) {
        logger.warn('[Unified KY3P] No task ID available for clearing fields');
        throw new Error('No task ID available for clearing fields');
      }
      
      // Use the same approach as batch update for clearing fields
      const clearedFields: Record<string, any> = {};
      
      // Set empty values for all fields
      this._fields.forEach(field => {
        const key = field.fieldKey || `field_${field.id}`;
        clearedFields[key] = '';
      });
      
      // Send the cleared fields using batch update
      const success = await this.sendBatchUpdate(clearedFields, effectiveTaskId);
      
      if (success) {
        // Also clear local form data
        this._formData = {};
        logger.info('[Unified KY3P] Successfully cleared all form fields');
      } else {
        logger.warn('[Unified KY3P] Failed to clear form fields');
      }
      
      return success;
    } catch (error) {
      logger.error('[Unified KY3P] Error clearing form fields:', error);
      return false;
    }
  }
  
  /**
   * Bulk update multiple form fields at once
   * 
   * @param data The data to update
   * @param taskId Optional task ID to operate on
   */
  async bulkUpdate(data: Record<string, any>, taskId?: number): Promise<boolean> {
    logger.info(`[Unified KY3P] Bulk updating ${Object.keys(data).length} fields for task ${taskId || this._taskId || 'unknown'}`);
    
    try {
      // Use the effective task ID
      const effectiveTaskId = taskId || this._taskId;
      if (!effectiveTaskId) {
        logger.warn('[Unified KY3P] No task ID available for bulk update');
        throw new Error('No task ID available for bulk update');
      }
      
      // Update local form data immediately for UI consistency
      this.loadFormData(data);
      
      // Send the bulk update using batch update endpoint
      const success = await this.sendBatchUpdate(data, effectiveTaskId);
      
      if (success) {
        logger.info('[Unified KY3P] Successfully completed bulk update');
      } else {
        logger.warn('[Unified KY3P] Failed to complete bulk update');
      }
      
      return success;
    } catch (error) {
      logger.error('[Unified KY3P] Error in bulk update:', error);
      return false;
    }
  }
  
  /**
   * Submit the form to the server
   * 
   * @param options Optional submission options
   */
  async submit(options?: FormSubmitOptions): Promise<any> {
    const taskId = options?.taskId || this._taskId;
    
    logger.info(`[Unified KY3P] Submitting form for task ${taskId || 'unknown'}`);
    
    if (!taskId) {
      logger.error('[Unified KY3P] No task ID available for submission');
      throw new Error('No task ID available for submission');
    }
    
    try {
      // Flush any pending updates before submitting
      if (Object.keys(this.pendingUpdates).length > 0) {
        await this.flushPendingUpdates(taskId);
      }
      
      // Send the submission request to the server
      const response = await fetch(`/api/forms/submit-form`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId,
          formType: this._formType,
          status: 'submitted'
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[Unified KY3P] Submission failed: ${response.status} - ${errorText}`);
        throw new Error(`Submission failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        logger.info('[Unified KY3P] Form submission successful');
        
        // Update task status in form data
        this._formData._taskStatus = 'submitted';
        this._formData._isSubmitted = true;
        
        // Include file ID and other metadata if available
        if (result.fileId) {
          this._formData._fileId = result.fileId;
        }
        
        if (result.fileName) {
          this._formData._fileName = result.fileName;
        }
        
        return result;
      }
      
      logger.warn('[Unified KY3P] Server reported submission failure:', result.message || 'Unknown error');
      throw new Error(result.message || 'Server reported submission failure');
    } catch (error) {
      logger.error('[Unified KY3P] Error submitting form:', error);
      throw error;
    }
  }
  
  /**
   * Save the form data to the server
   * 
   * @param options Optional save options
   */
  async save(options?: FormSubmitOptions): Promise<any> {
    const taskId = options?.taskId || this._taskId;
    const formData = options?.formData || this._formData;
    
    logger.info(`[Unified KY3P] Saving form data for task ${taskId || 'unknown'}`);
    
    if (!taskId) {
      logger.error('[Unified KY3P] No task ID available for saving');
      throw new Error('No task ID available for saving');
    }
    
    try {
      // Use bulk update for saving form data
      const success = await this.bulkUpdate(formData, taskId);
      
      if (success) {
        logger.info('[Unified KY3P] Form data saved successfully');
        return { success: true, taskId };
      }
      
      logger.warn('[Unified KY3P] Failed to save form data');
      throw new Error('Failed to save form data');
    } catch (error) {
      logger.error('[Unified KY3P] Error saving form data:', error);
      throw error;
    }
  }
  
  /**
   * Load form fields from the server
   */
  private async loadFields(): Promise<void> {
    try {
      // Use cache if available
      if (this._templateId && UnifiedKY3PFormService.fieldsCache[this._templateId]) {
        this._fields = UnifiedKY3PFormService.fieldsCache[this._templateId];
        logger.info(`[Unified KY3P] Using cached fields for template ${this._templateId}`);
        return;
      }
      
      // Fetch fields from the server
      const response = await fetch('/api/ky3p-fields', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load KY3P fields: ${response.status}`);
      }
      
      const fields = await response.json();
      
      // Process fields to ensure they have all required properties
      this._fields = fields.map((field: any) => ({
        id: field.id,
        fieldKey: field.field_key,
        displayName: field.display_name,
        fieldType: field.field_type,
        required: field.required === true || field.required === 1,
        group: field.group,
        order: field.order,
        validationRule: field.validation_rule,
        description: field.description || field.question,
        options: field.options,
        section: field.section || field.group,
        step: field.step_index
      }));
      
      logger.info(`[Unified KY3P] Loaded ${this._fields.length} fields`);
      
      // Cache fields for future use
      if (this._templateId) {
        UnifiedKY3PFormService.fieldsCache[this._templateId] = this._fields;
      }
    } catch (error) {
      logger.error('[Unified KY3P] Error loading fields:', error);
      throw error;
    }
  }
  
  /**
   * Generate sections from loaded fields
   */
  private generateSections(): void {
    // Get all unique sections from fields
    const uniqueSections = new Set<string>();
    
    this._fields.forEach(field => {
      if (field.section) {
        uniqueSections.add(field.section);
      } else if (field.group) {
        uniqueSections.add(field.group);
      }
    });
    
    // Convert to array and sort
    const sections = Array.from(uniqueSections);
    
    // Map sections to FormSection objects
    this._sections = sections.map((section, index) => ({
      id: index + 1,
      name: section,
      title: section, // Required by FormSection interface
      label: section,
      order: index, // Required by FormSection interface
      collapsed: false, // Required by FormSection interface
      fields: this._fields.filter(field => 
        (field.section === section) || (field.group === section)
      ).sort((a, b) => (a.order || 0) - (b.order || 0))
    }));
    
    logger.info(`[Unified KY3P] Generated ${this._sections.length} sections`);
  }
}

// Factory function to create a new unified KY3P form service
export function createUnifiedKY3PFormService(companyId?: number, taskId?: number): UnifiedKY3PFormService {
  return new UnifiedKY3PFormService(companyId, taskId);
}
