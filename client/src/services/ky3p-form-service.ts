/**
 * S&P KY3P Security Assessment Form Service
 * 
 * This service extends the EnhancedKybFormService to provide specialized 
 * functionality for the S&P KY3P Security Assessment form.
 */

import { EnhancedKybFormService } from './enhanced-kyb-service';
import { FormField, FormSection } from './formService';
import getLogger from '@/utils/logger';

const logger = getLogger('KY3PFormService');

// Singleton instance for backwards compatibility
let _instance: KY3PFormService | null = null;

export class KY3PFormService extends EnhancedKybFormService {
  // Override the form type to match the task type in the database
  protected readonly formType = 'sp_ky3p_assessment';
  
  // Cache for KY3P fields by template ID
  private static ky3pFieldsCache: Record<number, any[]> = {};
  
  constructor(companyId?: number, taskId?: number) {
    super(companyId, taskId);
    
    logger.info(
      '[KY3P Form Service] Initializing KY3P Form Service',
      { companyId, taskId }
    );
  }
  
  /**
   * COMPLETE OVERRIDE of initialize method from EnhancedKybFormService
   * to prevent inheriting the KYB section logic
   */
  async initialize(templateId: number): Promise<void> {
    if (this.initialized && this.templateId === templateId) {
      logger.info('[KY3P Form Service] Already initialized with template:', templateId);
      return; // Already initialized with this template
    }

    try {
      this.templateId = templateId;
      logger.info(`[KY3P Form Service] Initializing with template ID: ${templateId}`);
      
      // CLEAR PREVIOUS STATE to ensure fresh initialization
      this.fields = [];
      this.sections = [];
      this.initialized = false;
      
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
      logger.info(`[KY3P Form Service] Groups found: ${Object.keys(groupedFields).join(', ')}`);
      
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
      const response = await fetch('/api/ky3p-fields');
      
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
      
      // Log some sample fields for debugging
      if (fields.length > 0) {
        logger.info('[KY3P Form Service] Sample KY3P fields:', 
          fields.slice(0, 3).map((f: any) => ({ 
            id: f.id, 
            key: f.field_key, 
            displayName: f.display_name, 
            group: f.group
          }))
        );
      }
      
      return fields;
    } catch (error) {
      logger.error('[KY3P Form Service] Error loading KY3P fields:', error);
      throw error;
    }
  }
  
  /**
   * Load form fields from the server
   * Override to use the KY3P-specific endpoint
   */
  protected async loadFormFields(): Promise<FormField[]> {
    try {
      logger.info('[KY3P Form Service] Loading fields from /api/ky3p-fields endpoint');
      
      const response = await fetch('/api/ky3p-fields');
      
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
      
      const transformedFields = this.transformFieldsFromApi(fields);
      logger.info(`[KY3P Form Service] Transformed ${transformedFields.length} fields for rendering`);
      
      // Log some sample fields for debugging
      if (transformedFields.length > 0) {
        logger.info('[KY3P Form Service] Sample fields:', 
          transformedFields.slice(0, 3).map(f => ({ 
            id: f.id, 
            key: f.key, 
            label: f.label, 
            group: f.group,
            section: f.section,
            stepIndex: f.stepIndex
          }))
        );
        
        // Group fields by step index for logging
        const fieldsByStep = transformedFields.reduce((acc, field) => {
          const step = field.stepIndex || 0;
          if (!acc[step]) acc[step] = [];
          acc[step].push(field.key);
          return acc;
        }, {} as Record<number, string[]>);
        
        logger.info('[KY3P Form Service] Fields grouped by step index:', 
          Object.entries(fieldsByStep).map(([step, keys]) => 
            `Step ${step}: ${keys.length} fields`
          )
        );
      }
      
      return transformedFields;
    } catch (error) {
      logger.error('[KY3P Form Service] Error loading fields:', error);
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
   * Transform the API fields into the format expected by the UniversalForm
   */
  private transformFieldsFromApi(apiFields: any[]): FormField[] {
    return apiFields.map(apiField => ({
      id: apiField.id,
      key: apiField.field_key,
      label: apiField.display_name,
      // Use question field which matches KYB field structure
      description: apiField.question,
      type: apiField.field_type,
      // Now we directly use group since we've migrated the database schema
      group: apiField.group,
      // Set section to match group for consistency
      section: apiField.group,
      required: apiField.is_required,
      helpText: apiField.help_text,
      demoAutofill: apiField.demo_autofill,
      validation: {
        type: apiField.validation_type,
        rules: apiField.validation_rules
      },
      answerExpectation: apiField.answer_expectation,
      stepIndex: apiField.step_index || 0
    }));
  }
  
  /**
   * Get form sections from fields
   * Group fields by section - Override to prevent inheriting KYB section logic
   */
  protected async getFormSections(): Promise<FormSection[]> {
    const fields = await this.getFormFields();
    
    // Group fields by section
    const sectionMap = new Map<string, FormField[]>();
    fields.forEach(field => {
      if (!sectionMap.has(field.section)) {
        sectionMap.set(field.section, []);
      }
      sectionMap.get(field.section)?.push(field);
    });
    
    // Create sections - only use the sections that have fields
    // Don't add any sections from the EnhancedKybFormService base class
    const sections = Array.from(sectionMap.entries())
      .filter(([_, sectionFields]) => sectionFields.length > 0) // Only include non-empty sections
      .map(([sectionName, sectionFields], index) => ({
        id: `section-${index}`,
        title: sectionName,
        fields: sectionFields,
        order: index,
        collapsed: false, // Required by FormSection interface
        description: ''   // Required by FormSection interface
      }))
      .sort((a, b) => a.order - b.order);
    
    this.logger.info('KY3P Form: Created sections with only KY3P fields:', 
      sections.map(s => `${s.title} (${s.fields.length} fields)`).join(', '));
    
    return sections;
  }
  
  /**
   * Save a specific field's response
   */
  public async saveField(fieldId: number, value: any): Promise<void> {
    if (!this.taskId) {
      throw new Error('No task ID provided for saving field');
    }
    
    try {
      const response = await fetch(`/api/tasks/${this.taskId}/ky3p-responses/${fieldId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          response_value: value
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save field: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      logger.error('[KY3P Form Service] Error saving field:', error);
      throw error;
    }
  }
  
  /**
   * Submit the entire form and return the server response
   * @returns The server response including the file ID for the generated CSV
   */
  public async submitForm(): Promise<{
    id: number;
    status: string;
    completion_date: string;
    fileId?: number;
    [key: string]: any;
  }> {
    if (!this.taskId) {
      throw new Error('No task ID provided for form submission');
    }
    
    try {
      logger.info(`[KY3P Form Service] Submitting form for task ${this.taskId}`);
      
      const response = await fetch(`/api/tasks/${this.taskId}/ky3p-submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[KY3P Form Service] Failed to submit form: ${response.status}`, errorText);
        throw new Error(`Failed to submit form: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      
      logger.info(`[KY3P Form Service] Form successfully submitted:`, {
        taskId: result.id,
        status: result.status,
        fileId: result.fileId
      });
      
      return result;
    } catch (error) {
      logger.error('[KY3P Form Service] Error submitting form:', error);
      throw error;
    }
  }
  
  /**
   * Load existing responses for the form
   */
  public async loadResponses(): Promise<Record<string, any>> {
    if (!this.taskId) {
      throw new Error('No task ID provided for loading responses');
    }
    
    try {
      const response = await fetch(`/api/tasks/${this.taskId}/ky3p-responses`);
      
      if (!response.ok) {
        throw new Error(`Failed to load responses: ${response.status}`);
      }
      
      const responses = await response.json();
      
      // Convert responses to a key-value map
      const responseMap: Record<string, any> = {};
      for (const resp of responses) {
        const field = await this.getFieldById(resp.field_id);
        if (field) {
          responseMap[field.key] = resp.response_value;
        }
      }
      
      return responseMap;
    } catch (error) {
      logger.error('[KY3P Form Service] Error loading responses:', error);
      return {};
    }
  }
  
  /**
   * Get progress data for the task in the format expected by UniversalForm
   * This method uses our new dedicated progress endpoint for KY3P tasks
   */
  public async getProgress(): Promise<{
    formData: Record<string, any>;
    progress: number;
    status: string;
  }> {
    if (!this.taskId) {
      throw new Error('No task ID provided for getting progress');
    }
    
    try {
      logger.info(`[KY3P Form Service] Getting progress for task ${this.taskId}`);
      
      const response = await fetch(`/api/ky3p/progress/${this.taskId}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[KY3P Form Service] Failed to get progress: ${response.status}`, errorText);
        throw new Error(`Failed to get progress: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      
      logger.info(`[KY3P Form Service] Progress loaded successfully:`, {
        taskId: this.taskId,
        progress: data.progress,
        status: data.status,
        formDataKeys: Object.keys(data.formData || {}).length
      });
      
      // If no form data, use an empty object as fallback
      return {
        formData: data.formData || {},
        progress: data.progress || 0,
        status: data.status || 'not_started'
      };
    } catch (error) {
      logger.error('[KY3P Form Service] Error getting progress:', error);
      throw error;
    }
  }
  
  /**
   * Load progress from the server
   * This method is used by the FormDataManager to load saved form data
   */
  public async loadProgress(taskId?: number): Promise<Record<string, any>> {
    // Use provided taskId or fall back to the service's taskId
    const effectiveTaskId = taskId || this.taskId;
    
    if (!effectiveTaskId) {
      throw new Error('No task ID provided for loading progress');
    }
    
    try {
      logger.info(`[KY3P Form Service] Loading progress for task ${effectiveTaskId}`);
      
      // Get the task information first to check if it's already submitted
      try {
        const taskResponse = await fetch(`/api/tasks/${effectiveTaskId}`);
        if (taskResponse.ok) {
          const taskData = await taskResponse.json();
          if (taskData.status === 'submitted') {
            logger.info(`[KY3P Form Service] Task ${effectiveTaskId} is already submitted, returning empty form data`);
            return {};
          }
        }
      } catch (taskError) {
        // If we can't get the task, continue with trying to get the progress
        logger.warn(`[KY3P Form Service] Could not check task status: ${taskError}`);
      }
      
      // Use our dedicated KY3P progress endpoint
      const progress = await this.getProgress();
      
      if (progress && progress.formData) {
        // Store the form data in the service for future reference
        this.loadFormData(progress.formData);
        
        // Return the form data for the form manager to use
        return progress.formData;
      }
      
      // If no data was found, return an empty object
      logger.warn(`[KY3P Form Service] No form data found for task ${effectiveTaskId}`);
      return {};
    } catch (error) {
      logger.error('[KY3P Form Service] Error loading progress:', error);
      // Just return an empty object to prevent errors from bubbling up to the UI
      return {};
    }
  }
  
  /**
   * Save the form's current state
   * @param options Save options
   * @returns True if save was successful, false otherwise
   */
  public async save(options: { taskId?: number, includeMetadata?: boolean }): Promise<boolean> {
    if (!this.taskId && !options.taskId) {
      throw new Error('No task ID provided for saving form');
    }
    
    const effectiveTaskId = options.taskId || this.taskId;
    
    try {
      logger.info(`[KY3P Form Service] Saving form data for task ${effectiveTaskId}`);
      
      // Get current form data
      const formData = this.getFormData();
      
      // Call bulk save API to save all form data at once
      // This is a more efficient approach than saving individual fields
      const response = await fetch(`/api/tasks/${effectiveTaskId}/ky3p-responses/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          responses: formData
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
   * Save the current progress 
   * @param taskId The task ID (optional, will use instance's taskId if not provided)
   */
  public async saveProgress(taskId?: number): Promise<void> {
    await this.save({ taskId, includeMetadata: true });
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
      throw new Error('No task ID provided for submitting form');
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
      
      // Call the submit endpoint
      const response = await fetch(`/api/tasks/${effectiveTaskId}/ky3p-submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formData: this.getFormData(),
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
export const ky3pFormService = _instance || (_instance = new KY3PFormService());
export const ky3pFormServiceFactory = KY3PFormServiceFactory.getInstance();