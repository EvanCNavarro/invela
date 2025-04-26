/**
 * Standardized KY3P Form Service
 * 
 * This service provides standardized functionality for KY3P forms
 * with enhanced error handling, endpoint fallback, and consistent
 * interfaces that work with the StandardizedUniversalForm component.
 */

import { apiRequest, queryClient } from "@/lib/queryClient";
import { FormSection, FormField, FormServiceInterface } from "./formService";
import getLogger from "@/utils/logger";
import { standardizedBulkUpdate } from "@/components/forms/standardized-ky3p-update";

const logger = getLogger('StandardizedKY3PFormService');

// Cache for form data, fields, and sections to avoid redundant requests
interface ServiceCache {
  fields: FormField[];
  sections: FormSection[];
  formData: Record<string, any>;
  progress: number;
  status: string;
  lastUpdated: number;
  lastTaskId?: number;
}

export class StandardizedKY3PFormService implements FormServiceInterface {
  private taskId?: number;
  private cache: ServiceCache = {
    fields: [],
    sections: [],
    formData: {},
    progress: 0,
    status: 'not_started',
    lastUpdated: 0,
  };
  
  // Track successful endpoints to prioritize them in future requests
  private successfulEndpoints: Record<string, boolean> = {
    batch: false,
    auto_fill: false,
    demo_autofill: false,
  };

  constructor(taskId?: number) {
    this.taskId = taskId;
    logger.info(`Initialized with taskId: ${taskId}`);
    
    // If we have a task ID, initialize the cache with that task
    if (taskId) {
      this.cache.lastTaskId = taskId;
    }
  }

  /**
   * Get all form fields
   * 
   * @returns Array of form fields
   */
  getFields(): FormField[] {
    // If cache is empty or stale, fetch fields
    if (this.cache.fields.length === 0) {
      this.fetchFields();
      return [];
    }
    
    return this.cache.fields;
  }

  /**
   * Get all form sections with their fields
   * 
   * @returns Array of form sections
   */
  getSections(): FormSection[] {
    // If cache is empty or stale, fetch sections
    if (this.cache.sections.length === 0) {
      this.fetchSections();
      return [];
    }
    
    return this.cache.sections;
  }

  /**
   * Get current form data
   * 
   * @returns Form data object
   */
  getFormData(): Record<string, any> {
    return this.cache.formData || {};
  }

  /**
   * Load form data into the service
   * 
   * @param data Form data to load
   */
  loadFormData(data: Record<string, any>): void {
    this.cache.formData = { ...data };
    this.cache.lastUpdated = Date.now();
    logger.info(`Loaded ${Object.keys(data).length} form data fields`);
  }

  /**
   * Fetch form fields from the server
   * 
   * @returns Promise that resolves when fields are fetched
   */
  async fetchFields(): Promise<void> {
    try {
      logger.info('Fetching KY3P fields');
      const response = await apiRequest('GET', '/api/ky3p-fields');
      const data = await response.json();
      
      if (Array.isArray(data)) {
        this.cache.fields = data.map(field => ({
          ...field,
          // Ensure we have the right key format for standardized approach
          key: field.key || `${field.id}`,
          // Standardize field options
          options: field.options || [],
        }));
        
        logger.info(`Fetched ${this.cache.fields.length} KY3P fields`);
      } else {
        logger.error('Invalid KY3P fields data format:', data);
        this.cache.fields = [];
      }
    } catch (error) {
      logger.error('Error fetching KY3P fields:', error);
      this.cache.fields = [];
    }
  }

  /**
   * Fetch form sections from the server
   * 
   * @returns Promise that resolves when sections are fetched
   */
  async fetchSections(): Promise<void> {
    try {
      logger.info('Fetching KY3P sections');
      const response = await apiRequest('GET', '/api/ky3p-sections');
      const data = await response.json();
      
      if (Array.isArray(data)) {
        // Process sections and organize fields into them
        await this.processSections(data);
        logger.info(`Fetched ${this.cache.sections.length} KY3P sections`);
      } else {
        logger.error('Invalid KY3P sections data format:', data);
        this.cache.sections = [];
        
        // Fallback: Try to create sections from fields
        await this.createSectionsFromFields();
      }
    } catch (error) {
      logger.error('Error fetching KY3P sections:', error);
      this.cache.sections = [];
      
      // Fallback: Try to create sections from fields
      await this.createSectionsFromFields();
    }
  }

  /**
   * Process sections data and organize fields into them
   * 
   * @param sectionsData Sections data from the server
   */
  private async processSections(sectionsData: any[]): Promise<void> {
    // Ensure we have fields
    if (this.cache.fields.length === 0) {
      await this.fetchFields();
    }
    
    // Create sections with their fields
    this.cache.sections = sectionsData.map((section) => {
      const sectionFields = this.cache.fields.filter((field) => {
        // Check for various section ID formats
        return (
          field.sectionId === section.id || 
          field.section === section.id || 
          field.section === section.name || 
          field.group === section.id || 
          field.group === section.name
        );
      });
      
      return {
        ...section,
        id: section.id || section.name,
        fields: sectionFields,
      };
    });
  }

  /**
   * Create sections from fields as a fallback
   */
  private async createSectionsFromFields(): Promise<void> {
    logger.info('Creating sections from fields as fallback');
    
    // Ensure we have fields
    if (this.cache.fields.length === 0) {
      await this.fetchFields();
    }
    
    // Group fields by section or group
    const sectionMap = new Map<string, FormField[]>();
    
    this.cache.fields.forEach((field) => {
      const sectionId = field.sectionId || field.section || field.group || 'default';
      
      if (!sectionMap.has(sectionId)) {
        sectionMap.set(sectionId, []);
      }
      
      sectionMap.get(sectionId)?.push(field);
    });
    
    // Create sections from the map
    this.cache.sections = Array.from(sectionMap.entries()).map(([sectionId, fields]) => {
      return {
        id: sectionId,
        title: sectionId.charAt(0).toUpperCase() + sectionId.slice(1).replace(/_/g, ' '),
        fields,
      };
    });
    
    logger.info(`Created ${this.cache.sections.length} sections from fields`);
  }

  /**
   * Update form data for a specific field
   * 
   * @param fieldKey Field key or ID
   * @param value New field value
   * @param taskId Optional task ID for auto-save
   */
  async updateFormData(fieldKey: string, value: any, taskId?: number): Promise<void> {
    // Update the local cache
    this.cache.formData[fieldKey] = value;
    this.cache.lastUpdated = Date.now();
    
    // If task ID is provided, save progress
    if (taskId) {
      try {
        // Use standardized bulk update for the field
        await standardizedBulkUpdate(taskId, {
          [fieldKey]: value,
        });
      } catch (error) {
        logger.error(`Error auto-saving field ${fieldKey}:`, error);
      }
    }
  }

  /**
   * Load progress for a task
   * 
   * @param taskId Task ID
   * @returns Form data object
   */
  async loadProgress(taskId: number): Promise<Record<string, any>> {
    try {
      logger.info(`Loading progress for task ${taskId}`);
      
      // Send request to get progress
      const response = await apiRequest('GET', `/api/ky3p-task/${taskId}/progress`);
      const data = await response.json();
      
      logger.info(`Loaded progress for task ${taskId}:`, {
        progress: data.progress,
        status: data.status,
        fieldCount: data.formData ? Object.keys(data.formData).length : 0,
      });
      
      // Update cache
      this.cache.formData = data.formData || {};
      this.cache.progress = data.progress || 0;
      this.cache.status = data.status || 'in_progress';
      this.cache.lastUpdated = Date.now();
      this.cache.lastTaskId = taskId;
      
      return this.cache.formData;
    } catch (error) {
      logger.error(`Failed to load progress for task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Save progress for a task
   * 
   * @param taskId Task ID
   * @returns Success status
   */
  async saveProgress(taskId: number): Promise<boolean> {
    try {
      logger.info(`Saving progress for task ${taskId} with ${Object.keys(this.cache.formData).length} fields`);
      
      // Use standardized bulk update for all fields
      const success = await standardizedBulkUpdate(taskId, this.cache.formData);
      
      // Mark the batch endpoint as successful
      if (success) {
        this.successfulEndpoints.batch = true;
      }
      
      return success;
    } catch (error) {
      logger.error(`Failed to save progress for task ${taskId}:`, error);
      return false;
    }
  }

  /**
   * Submit the form for a task
   * 
   * @param options Submit options with task ID
   * @returns Success status
   */
  async submit(options: { taskId?: number }): Promise<boolean> {
    const taskId = options.taskId || this.taskId;
    
    if (!taskId) {
      logger.error('Cannot submit without a task ID');
      return false;
    }
    
    try {
      logger.info(`Submitting form for task ${taskId}`);
      
      // Save progress first
      await this.saveProgress(taskId);
      
      // Then submit the form
      const response = await apiRequest('POST', `/api/ky3p-task/${taskId}/submit`);
      
      if (response.ok) {
        logger.info(`Successfully submitted form for task ${taskId}`);
        
        // Invalidate task cache to reflect updated status
        queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
        queryClient.invalidateQueries({ queryKey: [`/api/ky3p-task/${taskId}`] });
        
        return true;
      } else {
        const errorData = await response.json();
        logger.error(`Error submitting form for task ${taskId}:`, errorData);
        return false;
      }
    } catch (error) {
      logger.error(`Failed to submit form for task ${taskId}:`, error);
      return false;
    }
  }

  /**
   * Validate form data
   * 
   * @param formData Form data to validate
   * @returns True if valid, or error object if invalid
   */
  validate(formData: Record<string, any>): true | Record<string, string> {
    const errors: Record<string, string> = {};
    
    // If cache is empty, load fields
    if (this.cache.fields.length === 0) {
      logger.warn('Validating with empty fields cache');
      return true;
    }
    
    // Check required fields
    this.cache.fields.forEach((field) => {
      // Skip non-required fields
      if (!field.validation?.required && !field.required) {
        return;
      }
      
      const value = formData[field.key];
      
      // Check if value is missing
      if (value === undefined || value === null || value === '') {
        errors[field.key] = 'This field is required';
      }
    });
    
    // Return true if no errors, otherwise return errors
    return Object.keys(errors).length === 0 ? true : errors;
  }

  /**
   * Calculate form completion progress
   * 
   * @returns Progress percentage (0-100)
   */
  calculateProgress(): number {
    // If cache is empty, return cached progress
    if (this.cache.fields.length === 0) {
      return this.cache.progress;
    }
    
    // Count required fields
    const requiredFields = this.cache.fields.filter(
      (field) => field.validation?.required || field.required
    );
    
    if (requiredFields.length === 0) {
      return 100;
    }
    
    // Count completed required fields
    const completedRequiredFields = requiredFields.filter((field) => {
      const value = this.cache.formData[field.key];
      return value !== undefined && value !== null && value !== '';
    });
    
    // Calculate progress percentage
    const progress = (completedRequiredFields.length / requiredFields.length) * 100;
    
    // Update cache
    this.cache.progress = progress;
    
    return progress;
  }

  /**
   * Get demo data for the form
   * 
   * @param taskId Optional task ID
   * @returns Demo data object
   */
  async getDemoData(taskId?: number): Promise<Record<string, any>> {
    const targetTaskId = taskId || this.taskId;
    
    if (!targetTaskId) {
      logger.error('Cannot get demo data without a task ID');
      throw new Error('Task ID is required for demo data');
    }
    
    try {
      logger.info(`Getting demo data for task ${targetTaskId}`);
      
      // Try multiple endpoints in sequence, starting with previously successful ones
      const endpointAttempts = this.getEndpointPriority();
      
      for (const endpoint of endpointAttempts) {
        try {
          let response;
          let data;
          
          switch (endpoint) {
            case 'batch':
              // Try batch update-based demo auto-fill
              response = await apiRequest('GET', `/api/ky3p-task/${targetTaskId}/demo-data`);
              data = await response.json();
              break;
              
            case 'auto_fill':
              // Try legacy auto-fill endpoint
              response = await apiRequest('POST', `/api/ky3p-task/${targetTaskId}/auto-fill`);
              data = await response.json();
              break;
              
            case 'demo_autofill':
              // Try universal demo auto-fill endpoint
              response = await apiRequest('POST', `/api/ky3p-task/${targetTaskId}/demo-autofill`);
              data = await response.json();
              break;
              
            default:
              continue;
          }
          
          // Process the response data based on the format
          const demoData = this.processDemoDataResponse(data);
          
          if (demoData && Object.keys(demoData).length > 0) {
            logger.info(`Successfully retrieved demo data from ${endpoint} endpoint`);
            
            // Mark this endpoint as successful for future priority
            this.successfulEndpoints[endpoint] = true;
            
            // Update cache
            this.cache.formData = demoData;
            this.cache.lastUpdated = Date.now();
            
            return demoData;
          }
        } catch (error) {
          logger.warn(`Error getting demo data from ${endpoint} endpoint:`, error);
          // Continue to next endpoint
        }
      }
      
      // If we've tried all endpoints and none worked, throw error
      throw new Error('Failed to get demo data from any endpoint');
    } catch (error) {
      logger.error(`Error getting KY3P demo data:`, error);
      throw error;
    }
  }

  /**
   * Process demo data response to extract form data consistently
   * 
   * @param data Response data from demo data endpoint
   * @returns Processed form data
   */
  private processDemoDataResponse(data: any): Record<string, any> {
    // Handle different response formats:
    
    // Format 1: { formData: {...} }
    if (data && data.formData && typeof data.formData === 'object') {
      return data.formData;
    }
    
    // Format 2: { responses: [...] }
    if (data && data.responses && Array.isArray(data.responses)) {
      const formData: Record<string, any> = {};
      
      data.responses.forEach((response: any) => {
        if (response.field_id && response.response_value !== undefined) {
          formData[response.field_id] = response.response_value;
        }
      });
      
      return formData;
    }
    
    // Format 3: { form_data: {...} }
    if (data && data.form_data && typeof data.form_data === 'object') {
      return data.form_data;
    }
    
    // Format 4: { data: {...} }
    if (data && data.data && typeof data.data === 'object') {
      return data.data;
    }
    
    // Format 5: Just the data object itself
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      // Filter out non-field properties
      const { formData, responses, form_data, data: innerData, progress, status, ...rest } = data;
      
      // If we have field data directly in the object
      if (Object.keys(rest).length > 0) {
        return rest;
      }
    }
    
    logger.error('Could not process demo data response:', data);
    return {};
  }

  /**
   * Get prioritized list of endpoints to try
   * 
   * @returns Array of endpoint names in priority order
   */
  private getEndpointPriority(): string[] {
    const successful: string[] = [];
    const notTried: string[] = [];
    
    // Categorize endpoints by success status
    Object.entries(this.successfulEndpoints).forEach(([endpoint, success]) => {
      if (success) {
        successful.push(endpoint);
      } else {
        notTried.push(endpoint);
      }
    });
    
    // Order: successful endpoints first, then untried ones
    return [...successful, ...notTried];
  }

  /**
   * Clear the service cache
   */
  clearCache(): void {
    this.cache = {
      fields: this.cache.fields, // Keep fields
      sections: this.cache.sections, // Keep sections
      formData: {}, // Clear form data
      progress: 0,
      status: 'not_started',
      lastUpdated: 0,
      lastTaskId: this.cache.lastTaskId,
    };
    
    logger.info('Cache cleared');
  }
}