/**
 * S&P KY3P Security Assessment Form Service - Final Fixed Version
 * 
 * This service extends the EnhancedKybFormService to provide specialized 
 * functionality for the S&P KY3P Security Assessment form.
 */

import { EnhancedKybFormService } from './enhanced-kyb-service';
import { FormField, FormSection } from './formService';
import getLogger from '@/utils/logger';

const logger = getLogger('KY3PFormService');

export class KY3PFormService extends EnhancedKybFormService {
  // Override the form type to match the task type in the database
  protected readonly formType = 'sp_ky3p_assessment';
  
  // Cache for KY3P fields by template ID
  private static ky3pFieldsCache: Record<number, any[]> = {};
  
  // Field data for internal use
  protected formData: Record<string, any> = {};
  protected taskId?: number;
  
  constructor(companyId?: number, taskId?: number) {
    super();
    
    if (companyId) {
      this.companyId = companyId;
    }
    
    if (taskId) {
      this.taskId = taskId;
    }
    
    logger.info(
      '[KY3P Form Service] Initializing KY3P Form Service',
      { companyId, taskId }
    );
  }
  
  /**
   * Convert field ID to proper numeric format
   * This ensures compatibility with the server-side API which expects numeric IDs
   */
  private ensureNumericFieldId(fieldId: any, key?: string): number | null {
    const numericFieldId = typeof fieldId === 'string' ? parseInt(fieldId, 10) : fieldId;
    
    if (isNaN(numericFieldId)) {
      logger.warn(`[KY3P Form Service] Invalid field ID format (not a number): ${fieldId}${key ? ` for key ${key}` : ''}`);
      return null;
    }
    
    return numericFieldId;
  }
  
  /**
   * Convert a database field to FormField format
   * Used to format fields within sections
   */
  private convertToFormField(field: any, sectionId: string): FormField {
    return {
      id: field.id,
      key: field.field_key || field.key,
      label: field.display_name || field.label,
      description: field.description || '', // Keep description separate
      question: field.question || '', // Map question to question directly for the bold display
      type: field.field_type || field.type,
      required: field.is_required || field.required || false,
      section: sectionId,
      order: field.order || 0,
      defaultValue: field.default_value || field.defaultValue || '',
      placeholder: field.placeholder || '',
      helpText: field.help_text || field.helpText || '',
      options: field.options || [],
      demoAutofill: field.demo_autofill || field.demoAutofill || '',
      disabled: field.disabled || false,
      validation: field.validation || {
        type: field.validation_type || 'none',
        rules: field.validation_rules || {}
      }
    };
  }
  
  /**
   * COMPLETE OVERRIDE of initialize method from EnhancedKybFormService
   * to prevent inheriting the KYB section logic
   */
  async initialize(templateId: number): Promise<void> {
    logger.info(`[KY3P Form Service] Initializing with template ID: ${templateId}`);
    
    try {
      // Set template ID
      this.templateId = templateId;
      
      // Fetch KY3P fields from the server or cache
      const fields = await this.getKybFields(); // This calls our overridden method that fetches KY3P fields
      logger.info(`[KY3P Form Service] Retrieved KY3P fields from API: ${fields.length}`);
      
      if (fields.length === 0) {
        logger.error('[KY3P Form Service] No KY3P fields retrieved from API - form will be empty');
        this.initialized = true; // Mark as initialized even though it's empty
        return;
      }
      
      // Group fields by group name (formerly section) without any expected/hardcoded groups
      const groupedFields = this.groupFieldsByGroup(fields);
      logger.info(`[KY3P Form Service] Field grouping result: ${Object.keys(groupedFields).length} groups found`);
      
      // Create sections directly from the groups without any normalization or injecting empty KYB sections
      this.sections = Object.entries(groupedFields).map(([sectionName, sectionFields], index) => {
        const sectionId = `section-${index}`;
        
        logger.info(`[KY3P Form Service] Creating section "${sectionName}" with ID "${sectionId}" (${sectionFields.length} fields)`);
        
        // Create the section with the properly assigned fields
        const section = {
          id: sectionId,
          title: sectionName,
          description: '',
          order: index,
          collapsed: false,
          // Convert each field and assign the proper section ID
          fields: sectionFields.map(field => this.convertToFormField(field, sectionId))
        };
        
        return section;
      });
      
      // Create a flat array of all fields from all sections
      this.fields = this.sections.flatMap(section => section.fields);
      
      logger.info('[KY3P Form Service] Form initialization complete:',
        `${this.sections.length} sections, ${this.fields.length} fields`);
      
      // Mark as initialized
      this.initialized = true;
    } catch (error) {
      logger.error('[KY3P Form Service] Error initializing form:', error);
      throw error;
    }
  }
  
  /**
   * Override getKybFields to use KY3P fields instead
   * This is the main method called by the EnhancedKybFormService
   */
  async getKybFields(): Promise<any[]> {
    logger.info('[KY3P Form Service] getKybFields called - using KY3P fields instead of KYB fields');
    
    // Use cache if available
    if (this.templateId && KY3PFormService.ky3pFieldsCache[this.templateId]) {
      logger.info(`[KY3P Form Service] Using cached KY3P fields for template ${this.templateId}`);
      return KY3PFormService.ky3pFieldsCache[this.templateId];
    }
    
    try {
      const response = await fetch('/api/ky3p-fields', {
        credentials: 'include' // Include session cookies
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[KY3P Form Service] Failed to load KY3P fields:', { 
          status: response.status, 
          statusText: response.statusText,
          responseBody: errorText
        });
        throw new Error(`Failed to load KY3P fields: ${response.status} - ${errorText}`);
      }
      
      const fields = await response.json();
      logger.info(`[KY3P Form Service] Successfully loaded ${fields.length} fields from API`);
      
      // Cache fields for future use
      if (this.templateId) {
        KY3PFormService.ky3pFieldsCache[this.templateId] = fields;
      }
      
      return fields;
    } catch (error) {
      logger.error('[KY3P Form Service] Error loading KY3P fields:', error);
      throw error;
    }
  }
  
  /**
   * Group fields by their group property
   */
  private groupFieldsByGroup(fields: any[]): Record<string, any[]> {
    const groups: Record<string, any[]> = {};
    
    for (const field of fields) {
      const groupName = field.group || 'Ungrouped';
      
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      
      groups[groupName].push(field);
    }
    
    // Sort fields within each group by ID to maintain consistent order
    for (const groupName in groups) {
      groups[groupName].sort((a, b) => a.id - b.id);
    }
    
    return groups;
  }
  
  /**
   * Save the form's current state
   * @param options Save options
   * @returns True if save was successful, false otherwise
   */
  public async save(options: { taskId?: number, includeMetadata?: boolean }): Promise<boolean> {
    if (!this.taskId && !options.taskId) {
      logger.warn('[KY3P Form Service] No task ID provided for saving form, cannot save');
      return false;
    }
    
    const effectiveTaskId = options.taskId || this.taskId;
    
    try {
      logger.info(`[KY3P Form Service] Saving form data for task ${effectiveTaskId}`);
      
      // Get current form data
      const formData = this.getFormData();
      
      // Filter out metadata fields before sending to server
      const cleanData = { ...formData };
      Object.keys(cleanData).forEach(key => {
        if (key.startsWith('_')) {
          delete cleanData[key];
        }
      });
      
      // Create a mapping from field keys to field IDs
      // The backend expects field IDs, not field keys
      // We need to map our field.key values to field.id values
      const keyToIdResponses: Record<string, any> = {};
      const allFields = await this.getFields();
      
      // Create a map of field key to field ID for quick lookup
      const fieldKeyToIdMap = new Map(
        allFields.map(field => [field.key, field.id])
      );
      
      // Track fields found in the system versus received in the data
      let totalFieldsInData = Object.keys(cleanData).length;
      let validFieldsFound = 0;
      
      // Convert the keys in cleanData to field IDs
      // Only include fields that actually exist in this form service
      for (const [key, value] of Object.entries(cleanData)) {
        const fieldId = fieldKeyToIdMap.get(key);
        if (fieldId) {
          // Convert to numeric ID if needed
          const numericFieldId = this.ensureNumericFieldId(fieldId, key);
          if (numericFieldId !== null) {
            keyToIdResponses[numericFieldId] = value;
            validFieldsFound++;
          }
        } else {
          // Just log the warning but don't include this field in the mapping
          logger.debug(`[KY3P Form Service] Field key not found in mapping: ${key}`);
        }
      }
      
      logger.info(`[KY3P Form Service] Mapped ${validFieldsFound} out of ${totalFieldsInData} fields for save operation. Using ${Object.keys(keyToIdResponses).length} valid fields.`);
      
      // Convert the object with keys as field IDs to array format with explicit fieldId property
      // This is needed because the backend API expects a different format
      const responsesArray = Object.entries(keyToIdResponses).map(([fieldId, value]) => ({
        fieldId: parseInt(fieldId, 10), // Ensure field ID is numeric
        value: value
      }));

      logger.info(`[KY3P Form Service] Converted to ${responsesArray.length} array format responses`);
      
      // Use the standardized pattern but with array format
      const response = await fetch(`/api/tasks/${effectiveTaskId}/ky3p-responses/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include session cookies
        body: JSON.stringify({
          responses: responsesArray // Using array format with explicit fieldId property
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[KY3P Form Service] Failed to save form data: ${response.status}`, errorText);
        return false;
      }
      
      logger.info(`[KY3P Form Service] Form data saved successfully for task ${effectiveTaskId}`);
      return true;
    } catch (error) {
      logger.error('[KY3P Form Service] Error saving form data:', error);
      return false;
    }
  }
  
  /**
   * Bulk update form responses
   * This is a direct implementation of the bulk update functionality 
   * that's called from the UniversalForm auto-fill mechanism
   * 
   * @param data Record of field keys to values
   * @param taskId Optional task ID override
   * @returns Promise resolving to success status
   */
  public async bulkUpdate(data: Record<string, any>, taskId?: number): Promise<boolean> {
    if (!this.taskId && !taskId) {
      logger.warn('[KY3P Form Service] No task ID provided for bulk update, cannot update');
      return false;
    }
    
    const effectiveTaskId = taskId || this.taskId;
    
    try {
      logger.info(`[KY3P Form Service] Performing bulk update for task ${effectiveTaskId}`);
      
      // First update the local form data - this follows the KYB implementation pattern
      Object.entries(data).forEach(([key, value]) => {
        // Only update if not a metadata field (starting with _)
        if (!key.startsWith('_')) {
          // Update our local form data
          this.formData[key] = value;
        }
      });
      
      // Filter out metadata fields before sending to server
      const cleanData = { ...data };
      Object.keys(cleanData).forEach(key => {
        if (key.startsWith('_')) {
          delete cleanData[key];
        }
      });

      // Create a mapping from field keys to field IDs
      // The backend expects field IDs, not field keys
      // We need to map our field.key values to field.id values
      const keyToIdResponses: Record<string, any> = {};
      const allFields = await this.getFields();
      
      // Create a map of field key to field ID for quick lookup
      const fieldKeyToIdMap = new Map(
        allFields.map(field => [field.key, field.id])
      );
      
      // Track fields found in the system versus received in the demo data
      let totalFieldsInDemoData = Object.keys(cleanData).length;
      let validFieldsFound = 0;
      
      // Convert the keys in cleanData to field IDs
      // Only include fields that actually exist in this form service
      for (const [key, value] of Object.entries(cleanData)) {
        const fieldId = fieldKeyToIdMap.get(key);
        if (fieldId) {
          // Convert to numeric ID if needed
          const numericFieldId = this.ensureNumericFieldId(fieldId, key);
          if (numericFieldId !== null) {
            keyToIdResponses[numericFieldId] = value;
            validFieldsFound++;
          }
        } else {
          // Just log the warning but don't include this field in the mapping
          logger.debug(`[KY3P Form Service] Field key not found in mapping: ${key}`);
        }
      }
      
      logger.info(`[KY3P Form Service] Mapped ${validFieldsFound} out of ${totalFieldsInDemoData} fields for bulk update. Using ${Object.keys(keyToIdResponses).length} valid fields.`);

      // Convert the object with keys as field IDs to array format with explicit fieldId property
      // This is needed because the backend API expects a different format
      const responsesArray = Object.entries(keyToIdResponses).map(([fieldId, value]) => ({
        fieldId: parseInt(fieldId, 10), // Ensure field ID is numeric
        value: value
      }));

      logger.info(`[KY3P Form Service] Converted to ${responsesArray.length} array format responses`);
      
      // Use the standardized pattern from KYB service but with array format
      const response = await fetch(`/api/tasks/${effectiveTaskId}/ky3p-responses/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include session cookies
        body: JSON.stringify({
          responses: responsesArray // Using array format with explicit fieldId property
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[KY3P Form Service] Failed to perform bulk update: ${response.status}`, errorText);
        return false;
      }
      
      logger.info(`[KY3P Form Service] Bulk update successful for task ${effectiveTaskId}`);
      return true;
    } catch (error) {
      logger.error('[KY3P Form Service] Error during bulk update:', error);
      return false;
    }
  }
  
  /**
   * Submit the form
   * @param options The submission options
   * @returns The submission response
   */
  public async submit(options: { taskId?: number, fileName?: string, format?: 'json' | 'pdf' | 'csv' }): Promise<{
    success: boolean;
    error?: string;
    details?: string;
    fileName?: string;
    fileId?: number;
  }> {
    const effectiveTaskId = options.taskId || this.taskId;
    
    if (!effectiveTaskId) {
      logger.warn('[KY3P Form Service] No task ID provided for submitting form, cannot submit');
      return {
        success: false,
        error: 'No task ID provided for form submission'
      };
    }
    
    try {
      logger.info(`[KY3P Form Service] Submitting form for task ${effectiveTaskId}`);
      
      // First save all form data to ensure everything is up to date
      const saveResult = await this.save({ taskId: effectiveTaskId, includeMetadata: true });
      
      if (!saveResult) {
        logger.error(`[KY3P Form Service] Failed to save form data before submission`);
        return {
          success: false,
          error: 'Failed to save form data before submission',
        };
      }
      
      // Get form data and clean it by removing metadata fields
      const formData = this.getFormData();
      const cleanData = { ...formData };
      Object.keys(cleanData).forEach(key => {
        if (key.startsWith('_')) {
          delete cleanData[key];
        }
      });
      
      // Create a mapping from field keys to field IDs
      // The backend expects field IDs, not field keys
      // We need to map our field.key values to field.id values
      const keyToIdResponses: Record<string, any> = {};
      const allFields = await this.getFields();
      
      // Create a map of field key to field ID for quick lookup
      const fieldKeyToIdMap = new Map(
        allFields.map(field => [field.key, field.id])
      );
      
      // Track fields found in the system versus received in the data
      let totalFieldsInData = Object.keys(cleanData).length;
      let validFieldsFound = 0;
      
      // Convert the keys in cleanData to field IDs
      // Only include fields that actually exist in this form service
      for (const [key, value] of Object.entries(cleanData)) {
        const fieldId = fieldKeyToIdMap.get(key);
        if (fieldId) {
          // Convert to numeric ID if needed
          const numericFieldId = this.ensureNumericFieldId(fieldId, key);
          if (numericFieldId !== null) {
            keyToIdResponses[numericFieldId] = value;
            validFieldsFound++;
          }
        } else {
          // Just log the warning but don't include this field in the mapping
          logger.debug(`[KY3P Form Service] Field key not found in mapping for submission: ${key}`);
        }
      }
      
      logger.info(`[KY3P Form Service] Mapped ${validFieldsFound} out of ${totalFieldsInData} fields for submission. Using ${Object.keys(keyToIdResponses).length} valid fields.`);
      
      // Convert the object with keys as field IDs to array format with explicit fieldId property
      // This is needed because the backend API expects a different format
      const responsesArray = Object.entries(keyToIdResponses).map(([fieldId, value]) => ({
        fieldId: parseInt(fieldId, 10), // Ensure field ID is numeric
        value: value
      }));

      logger.info(`[KY3P Form Service] Converted to ${responsesArray.length} array format responses for submission`);
      
      // Call the submit endpoint with clean data in array format
      // Use the standardized endpoint for KY3P submission with proper file generation
      logger.info(`[KY3P Form Service] Using standardized KY3P submit endpoint with enhanced file generation`);
      const response = await fetch(`/api/tasks/${effectiveTaskId}/ky3p-submit-standard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include session cookies
        body: JSON.stringify({
          formData: responsesArray, // Using array format with explicit fieldId property
          fileName: options.fileName
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[KY3P Form Service] Form submission failed: ${response.status}`, errorText);
        return {
          success: false,
          error: `Form submission failed: ${response.status}`,
          details: errorText
        };
      }
      
      const result = await response.json();
      
      logger.info(`[KY3P Form Service] Form submitted successfully:`, {
        fileId: result.fileId,
        fileName: result.fileName
      });
      
      return {
        success: true,
        fileId: result.fileId,
        fileName: result.fileName
      };
    } catch (error) {
      logger.error('[KY3P Form Service] Form submission error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: String(error)
      };
    }
  }
  
  /**
   * Simple validation for the form
   * @param data The form data to validate
   * @returns True if the form is valid, or an object with validation errors
   */
  public validate(data: Record<string, any>): boolean | Record<string, string> {
    // Basic form validation logic
    const errors: Record<string, string> = {};
    
    // Get all required fields
    const requiredFields = this.fields.filter(field => field.required);
    
    for (const field of requiredFields) {
      const value = data[field.key];
      
      // Check if field has a value
      if (value === undefined || value === null || value === '') {
        errors[field.key] = 'This field is required';
      }
    }
    
    // Return true if no errors, otherwise return errors object
    return Object.keys(errors).length === 0 ? true : errors;
  }
  
  /**
   * Get demo data for auto-filling the form
   * 
   * @param taskId Optional task ID to specify which task to retrieve demo data for
   * @returns Record of field keys to values for demo auto-fill
   */
  /**
   * Check if a field key exists in the form service
   * @param fieldKey The field key to check
   * @returns True if the field key exists, false otherwise
   */
  public hasField(fieldKey: string): boolean {
    return this.fields.some(field => field.key === fieldKey);
  }
  
  /**
   * Get demo data for auto-filling the form, filtered to only include keys that 
   * match our known field keys
   * 
   * @param taskId Optional task ID to specify which task to retrieve demo data for
   * @returns Record of field keys to values for demo auto-fill
   */
  public async getDemoData(taskId?: number): Promise<Record<string, any>> {
    const effectiveTaskId = taskId || this.taskId;
    
    if (!effectiveTaskId) {
      logger.error('[KY3P Form Service] No task ID provided for demo data retrieval');
      throw new Error('Task ID is required to retrieve demo data');
    }
    
    try {
      logger.info(`[KY3P Form Service] Fetching demo auto-fill data for task ${effectiveTaskId}`);
      
      // Use the specific endpoint for KY3P demo auto-fill
      const response = await fetch(`/api/ky3p/demo-autofill/${effectiveTaskId}`, {
        credentials: 'include', // Include session cookies
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[KY3P Form Service] Failed to get demo data: ${response.status}`, errorText);
        throw new Error(`Failed to get demo data: ${response.status} - ${errorText}`);
      }
      
      // Process the raw demo data from the server
      const rawDemoData = await response.json();
      
      // Filter out fields that don't exist in our fields array
      const filteredDemoData: Record<string, any> = {};
      let skippedFields = 0;
      
      // Only include fields that exist in our form service
      for (const [key, value] of Object.entries(rawDemoData)) {
        if (this.hasField(key)) {
          filteredDemoData[key] = value;
        } else {
          logger.warn(`[KY3P Form Service] Skipping demo field key that doesn't exist in our form: ${key}`);
          skippedFields++;
        }
      }
      
      const fieldCount = Object.keys(filteredDemoData).length;
      
      logger.info(`[KY3P Form Service] Successfully fetched and filtered demo fields: ${fieldCount} valid, ${skippedFields} skipped`);
      
      return filteredDemoData;
    } catch (error) {
      logger.error('[KY3P Form Service] Error retrieving demo data:', error);
      throw error;
    }
  }
}

/**
 * Factory class for creating isolated KY3P form service instances
 * Follows the same pattern as EnhancedKybServiceFactory
 */
export class KY3PFormServiceFactory {
  private static instance: KY3PFormServiceFactory;
  private instances: Map<string, KY3PFormService> = new Map();
  
  private constructor() {}
  
  public static getInstance(): KY3PFormServiceFactory {
    if (!KY3PFormServiceFactory.instance) {
      KY3PFormServiceFactory.instance = new KY3PFormServiceFactory();
    }
    return KY3PFormServiceFactory.instance;
  }
  
  /**
   * Get or create an isolated KY3P form service instance
   * @param companyId The company ID
   * @param taskId The task ID
   * @returns KY3P form service instance specific to this company and task
   */
  public getServiceInstance(companyId: number | string, taskId: number | string): KY3PFormService {
    const key = `${companyId}-${taskId}`;
    
    if (!this.instances.has(key)) {
      logger.info(`[KY3PFormServiceFactory] Creating new KY3P form service instance for company ${companyId}, task ${taskId}`);
      this.instances.set(key, new KY3PFormService(Number(companyId), Number(taskId)));
    }
    
    return this.instances.get(key)!;
  }
}

// Create singleton instance for use in the application
export const ky3pFormService = new KY3PFormService();
export const ky3pFormServiceFactory = KY3PFormServiceFactory.getInstance();