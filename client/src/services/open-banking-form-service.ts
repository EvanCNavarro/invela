/**
 * Open Banking Form Service
 * 
 * This service handles the Open Banking Survey form data
 * and provides an interface to the Universal Form component.
 */
import { EnhancedKybFormService } from './enhanced-kyb-service';
import { SyncFormDataResponse } from './form-service.interface';

// Simple console-based logger
const logger = {
  info: (message: string, ...args: any[]) => console.log(`INFO: ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`ERROR: ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`WARN: ${message}`, ...args),
  debug: (message: string, ...args: any[]) => console.debug(`DEBUG: ${message}`, ...args),
};

// Singleton instance
let _instance: OpenBankingFormService | null = null;

export class OpenBankingFormService extends EnhancedKybFormService {
  // Override the form type to match the task type in the database
  protected readonly formType = 'open_banking_survey';
  
  // Cache for Open Banking fields by template ID
  private static openBankingFieldsCache: Record<number, any[]> = {};
  
  constructor(companyId?: number, taskId?: number) {
    super(companyId, taskId);
    
    logger.info(
      '[OpenBankingFormService] Initializing Open Banking Form Service',
      { companyId, taskId }
    );
  }
  
  /**
   * COMPLETE OVERRIDE of initialize method from EnhancedKybFormService
   * to prevent inheriting the KYB section logic
   * 
   * Modified to make templateId optional and to use a direct field fetch 
   * even when no template is available
   */
  async initialize(templateId?: number): Promise<void> {
    // If already initialized and the same template ID, just return
    if (this.initialized && (templateId === undefined || this.templateId === templateId)) {
      logger.info('[OpenBankingFormService] Already initialized', { 
        templateId: templateId || 'none provided'
      });
      return; 
    }
    
    try {
      // Store template ID if provided
      if (templateId !== undefined) {
        this.templateId = templateId;
      }
      
      // Step 1: Get the field definitions from the Open Banking fields table
      // Uses a custom API endpoint for Open Banking fields
      let fields;
      
      // Only use cache if we have a template ID and it exists in cache
      if (templateId !== undefined && OpenBankingFormService.openBankingFieldsCache[templateId]) {
        fields = OpenBankingFormService.openBankingFieldsCache[templateId];
        logger.info('[OpenBankingFormService] Using cached fields for template', templateId);
      } else {
        // Always fetch fields directly from API, ignoring template
        logger.info('[OpenBankingFormService] Fetching fields from API directly');
        
        try {
          // Add credentials to ensure session cookies are sent for authentication
          const apiResponse = await fetch('/api/open-banking/fields', {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (!apiResponse.ok) {
            // Handle authentication errors specifically
            if (apiResponse.status === 401) {
              logger.error('[OpenBankingFormService] Authentication required for API access');
              throw new Error('Authentication required. Please log in again.');
            }
            
            throw new Error(`Failed to fetch Open Banking fields: ${apiResponse.statusText}`);
          }
          
          fields = await apiResponse.json();
          logger.info(`[OpenBankingFormService] Successfully fetched ${fields.length} fields`);
          
          // Cache if we have a template ID
          if (templateId !== undefined) {
            OpenBankingFormService.openBankingFieldsCache[templateId] = fields;
          }
        } catch (fetchError) {
          logger.error('[OpenBankingFormService] Field fetch error', fetchError);
          throw new Error(`Failed to fetch Open Banking fields: ${fetchError.message}`);
        }
      }
      
      // Validate fields array exists and has content
      if (!fields || !Array.isArray(fields) || fields.length === 0) {
        logger.error('[OpenBankingFormService] No fields returned from API', { fields });
        throw new Error('No Open Banking fields found');
      }
      
      // Step 2: Process the fields into sections based on group and step_index
      const sections = this.processFieldsIntoSections(fields);
      
      // Validate sections were created
      if (!sections || !Array.isArray(sections) || sections.length === 0) {
        logger.error('[OpenBankingFormService] No sections generated from fields', { fields });
        throw new Error('Failed to create sections from Open Banking fields');
      }
      
      // Step 3: Store the sections and set initialized flag
      this.sections = sections;
      this.initialized = true;
      
      logger.info('[OpenBankingFormService] Initialization complete', { 
        sectionsCount: sections.length,
        fieldsCount: fields.length
      });
      
    } catch (error) {
      logger.error('[OpenBankingFormService] Initialization failed', { error });
      throw error;
    }
  }
  
  /**
   * Process fields into sections based on group and step_index
   */
  private processFieldsIntoSections(fields: any[]): any[] {
    logger.info('[OpenBankingFormService] Processing fields into sections', { 
      fieldsCount: fields.length,
      fieldSample: fields.length > 0 ? {
        id: fields[0].id,
        field_key: fields[0].field_key,
        field_type: fields[0].field_type,
        group: fields[0].group,
        step_index: fields[0].step_index
      } : 'no fields'
    });
    
    try {
      // Ensure we have fields to process
      if (!fields || fields.length === 0) {
        logger.error('[OpenBankingFormService] No fields to process into sections');
        return [];
      }
      
      // Group fields by step index and group
      const fieldsByStep = fields.reduce((acc: Record<number, Record<string, any[]>>, field) => {
        // Always default to step_index 0 if missing
        const stepIndex = typeof field.step_index === 'number' ? field.step_index : 0;
        // Always default to 'General' if group is missing
        const group = field.group || 'General';
        
        if (!acc[stepIndex]) {
          acc[stepIndex] = {};
        }
        
        if (!acc[stepIndex][group]) {
          acc[stepIndex][group] = [];
        }
        
        acc[stepIndex][group].push(field);
        return acc;
      }, {});
      
      // Log the grouped structure for debugging
      logger.info('[OpenBankingFormService] Fields grouped by step and group', {
        stepCount: Object.keys(fieldsByStep).length,
        steps: Object.keys(fieldsByStep)
      });
      
      // Convert to sections array
      const sections = Object.entries(fieldsByStep)
        .map(([stepIndex, groups]) => {
          return Object.entries(groups).map(([groupName, groupFields]) => {
            // Sort fields by display_order or order within each group
            const sortedFields = [...groupFields].sort((a, b) => {
              const aOrder = a.display_order || a.order || 0;
              const bOrder = b.display_order || b.order || 0;
              return aOrder - bOrder;
            });
            
            // Map fields to the format expected by the Universal Form
            const formattedFields = sortedFields.map(field => {
              // Generate a section ID to match this field's section (for proper section organization)
              const sectionId = `step${stepIndex}_${groupName.replace(/[^a-zA-Z0-9]/g, '_')}`;
              
              return {
                id: field.id,
                name: field.field_key,
                key: field.field_key, // Important: add key property for form mapping
                label: field.display_name,
                displayName: field.display_name, // Add displayName for consistency
                description: field.help_text || field.description,
                tooltip: field.help_text || field.description,
                question: field.question || field.display_name, // Add question for form display
                type: this.mapFieldType(field.field_type),
                required: field.is_required || field.required || false,
                options: this.parseFieldOptions(field),
                placeholder: "",
                validationType: field.validation_type,
                validationRules: field.validation_rules,
                section: sectionId, // Critical for field-section association
                group: groupName
              };
            });
            
            return {
              id: `step${stepIndex}_${groupName.replace(/[^a-zA-Z0-9]/g, '_')}`,
              title: groupName,
              order: parseInt(stepIndex),
              fields: formattedFields,
              collapsed: false,
              description: ``
            };
          });
        })
        .flat()
        // Sort sections by order
        .sort((a, b) => a.order - b.order);
      
      logger.info('[OpenBankingFormService] Sections processing complete', { 
        sectionsCount: sections.length
      });
      
      return sections;
    } catch (error) {
      logger.error('[OpenBankingFormService] Error processing fields into sections', { error });
      throw error;
    }
  }
  
  /**
   * Parse field options from various formats
   */
  private parseFieldOptions(field: any): any[] {
    try {
      // If field already has parsed options array, return it
      if (field.options && Array.isArray(field.options)) {
        return field.options;
      }
      
      // If field has options as a string, try to parse it
      if (field.options && typeof field.options === 'string') {
        return JSON.parse(field.options);
      }
      
      // Try to parse from validation_rules if available
      if (field.validation_rules) {
        const rules = typeof field.validation_rules === 'string' 
          ? JSON.parse(field.validation_rules) 
          : field.validation_rules;
          
        if (rules.options && Array.isArray(rules.options)) {
          return rules.options;
        }
        
        // Some formats store options directly in validation_rules as an array
        if (Array.isArray(rules)) {
          return rules;
        }
      }
      
      // Default to empty array if no options found
      return [];
    } catch (error) {
      logger.warn(`[OpenBankingFormService] Error parsing options for field ${field.id || 'unknown'}`, { error });
      return [];
    }
  }

  /**
   * Map field type from database to Universal Form field type
   */
  private mapFieldType(fieldType: string): string {
    if (!fieldType) return 'textarea';
    
    switch (fieldType.toUpperCase()) {
      case 'TEXT':
        return 'textarea'; // Changed from 'text' to 'textarea' for larger input fields
      case 'TEXTAREA':
        return 'textarea';
      case 'SELECT':
        return 'select';
      case 'MULTISELECT':
        return 'multiselect';
      case 'CHECKBOX':
        return 'checkbox';
      case 'RADIO':
        return 'radio';
      case 'DATE':
        return 'date';
      case 'FILE':
        return 'file';
      default:
        return 'textarea'; // Changed default to textarea as well
    }
  }
  
  /**
   * Get the sections for the current form template
   */
  async getSections(): Promise<any[]> {
    if (!this.initialized) {
      logger.warn('[OpenBankingFormService] Not initialized, attempting auto-initialization');
      try {
        await this.initialize();
      } catch (error) {
        logger.error('[OpenBankingFormService] Auto-initialization failed', { error });
        throw new Error('Open Banking Form Service not initialized. Call initialize() first.');
      }
    }
    
    // If sections are still empty despite initialization, try one more time
    if (!this.sections || this.sections.length === 0) {
      logger.warn('[OpenBankingFormService] Sections array is empty after initialization, forcing reload');
      try {
        // Force re-initialization to reload fields and sections
        this.initialized = false; 
        await this.initialize();
        
        // Still empty? Log detailed error
        if (!this.sections || this.sections.length === 0) {
          logger.error('[OpenBankingFormService] Failed to load sections after forced reload', {
            initialized: this.initialized,
            sectionsState: this.sections ? 'empty array' : 'null',
            templateId: this.templateId || 'none'
          });
        }
      } catch (reloadError) {
        logger.error('[OpenBankingFormService] Error during forced reload', { reloadError });
      }
    }
    
    logger.info('[OpenBankingFormService] Getting sections', { 
      count: this.sections ? this.sections.length : 0,
      sectionIds: this.sections ? this.sections.map(s => s.id).join(', ') : 'none'
    });
    
    return this.sections || [];
  }
  
  /**
   * Get all fields from all sections
   * This is required by the FormServiceInterface
   */
  getFields(): any[] {
    if (!this.initialized) {
      logger.warn('[OpenBankingFormService] getFields called before initialization');
      return [];
    }
    
    // Extract fields from all sections and flatten into a single array
    const allFields = this.sections.flatMap(section => {
      // Make sure each field has the correct section ID
      return (section.fields || []).map(field => ({
        ...field,
        section: section.id // Critical: ensure every field has a section property
      }));
    });
    
    // Log detailed field mapping for debugging
    if (allFields.length > 0) {
      logger.info('[OpenBankingFormService] Field sample with section mapping', {
        fieldSample: {
          key: allFields[0].key,
          name: allFields[0].name,
          section: allFields[0].section
        }
      });
    }
    
    // Map fields to ensure they have a "key" property that matches "name"
    // This is needed for compatibility with the Universal Form component
    const fieldsWithKeys = allFields.map(field => ({
      ...field,
      key: field.name || field.key, // Ensure key exists
      section: field.section // Ensure section is present
    }));
    
    logger.info('[OpenBankingFormService] Returning all fields', { 
      count: fieldsWithKeys.length,
      distinctSections: [...new Set(fieldsWithKeys.map(f => f.section))].join(', ')
    });
    
    return fieldsWithKeys;
  }
  
  /**
   * Save form responses for a task
   */
  async saveResponses(taskId: number, data: Record<string, any>): Promise<void> {
    logger.info('[OpenBankingFormService] Saving responses', { taskId, dataKeys: Object.keys(data).length });
    
    try {
      // Convert data to array of responses
      const responses = Object.entries(data).map(([fieldKey, value]) => ({
        field_key: fieldKey,
        response_value: value
      }));
      
      // Save responses
      const apiResponse = await fetch(`/api/open-banking/responses/${taskId}`, {
        method: 'POST',
        credentials: 'include', // Include session cookies
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ responses })
      });
      
      if (!apiResponse.ok) {
        throw new Error(`Failed to save responses: ${apiResponse.statusText}`);
      }
      
      logger.info('[OpenBankingFormService] Responses saved successfully', { taskId });
    } catch (error) {
      logger.error('[OpenBankingFormService] Error saving responses', { error, taskId });
      throw error;
    }
  }
  
  // Simple in-memory cache for progress data to improve load times
  private static progressCache: Map<number, {
    formData: Record<string, any>;
    progress: number;
    status: string;
    timestamp: number;
  }> = new Map();
  
  /**
   * Get progress data for the task in the format expected by UniversalForm
   * This method uses our dedicated progress endpoint for Open Banking tasks
   * 
   * Enhanced with retry logic, caching, and better error handling to prevent infinite loading
   */
  public async getProgress(taskId?: number): Promise<{
    formData: Record<string, any>;
    progress: number;
    status: string;
  }> {
    const effectiveTaskId = taskId || this.taskId;
    
    if (!effectiveTaskId) {
      // Return default empty progress instead of throwing to make the component more resilient
      logger.warn('[OpenBankingFormService] No task ID provided for getting progress, returning default empty progress');
      return {
        formData: {},
        progress: 0,
        status: 'not_started'
      };
    }
    
    // Check cache first to speed up loading
    const cachedData = OpenBankingFormService.progressCache.get(effectiveTaskId);
    const now = Date.now();
    // Use cache if it exists and is less than 10 seconds old - prevents slow reloading issue
    if (cachedData && (now - cachedData.timestamp) < 10000) {
      logger.info(`[OpenBankingFormService] Using cached progress data for task ${effectiveTaskId}`, {
        age: `${(now - cachedData.timestamp)}ms`,
        progress: cachedData.progress,
        formDataKeys: Object.keys(cachedData.formData).length
      });
      return {
        formData: cachedData.formData,
        progress: cachedData.progress,
        status: cachedData.status
      };
    }
    
    try {
      logger.info(`[OpenBankingFormService] Getting progress for task ${effectiveTaskId}`);
      
      // Try fetching with retries to handle transient network issues
      let retries = 0;
      const maxRetries = 3;
      let response = null;
      let startTime = Date.now();
      
      // Set a timeout for the entire operation to prevent being stuck too long
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Progress fetch timeout exceeded'));
        }, 8000); // 8 second overall timeout
      });
      
      // Create the fetch promise with retries
      const fetchWithRetries = async (): Promise<Response> => {
        while (retries < maxRetries) {
          try {
            const fetchResponse = await fetch(`/api/open-banking/progress/${effectiveTaskId}`, {
              credentials: 'include', // Include session cookies
              headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            });
            
            // If successful, return the response
            if (fetchResponse && fetchResponse.ok) return fetchResponse;
            
            // If we get here, the response was not ok
            logger.warn(`[OpenBankingFormService] Progress fetch attempt ${retries + 1} failed with status ${fetchResponse?.status}`);
            
            // Only retry on certain error codes (5xx server errors, 429 throttling)
            if (!fetchResponse || (fetchResponse.status >= 500 || fetchResponse.status === 429)) {
              retries++;
              // Exponential backoff with jitter
              const delay = Math.min(500 * Math.pow(2, retries) + Math.random() * 100, 3000);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              // For other error codes like 404, 403, etc. don't retry
              return fetchResponse;
            }
          } catch (fetchError) {
            logger.warn(`[OpenBankingFormService] Network error on attempt ${retries + 1}:`, fetchError);
            retries++;
            // Linear backoff for network errors
            await new Promise(resolve => setTimeout(resolve, 500 * retries));
          }
        }
        throw new Error(`Failed after ${maxRetries} retries`);
      };
      
      try {
        // Race between the fetch with retries and the timeout
        response = await Promise.race([fetchWithRetries(), timeoutPromise]);
      } catch (timeoutError) {
        logger.warn(`[OpenBankingFormService] Request timed out after ${Date.now() - startTime}ms:`, timeoutError);
        
        // If we have a cached version, use it as fallback
        if (cachedData) {
          logger.info(`[OpenBankingFormService] Using cached data as fallback after timeout for task ${effectiveTaskId}`);
          return {
            formData: cachedData.formData,
            progress: cachedData.progress,
            status: cachedData.status
          };
        }
        
        // If we don't have a cached version, return default data
        return {
          formData: {},
          progress: 0,
          status: 'not_started'
        };
      }
      
      if (!response || !response.ok) {
        // If endpoint not found (404), return empty data instead of throwing
        if (response && response.status === 404) {
          logger.warn(`[OpenBankingFormService] Progress endpoint not found for task ${effectiveTaskId}, returning default values`);
          return {
            formData: {},
            progress: 0,
            status: 'not_started'
          };
        }
        
        // If we reach here, there was an error response
        try {
          const errorText = response ? await response.text() : 'No response';
          logger.error(`[OpenBankingFormService] Failed to get progress: ${response?.status}`, errorText);
          
          // If we have a cached version, use it as fallback
          if (cachedData) {
            logger.info(`[OpenBankingFormService] Using cached data as fallback after error for task ${effectiveTaskId}`);
            return {
              formData: cachedData.formData,
              progress: cachedData.progress,
              status: cachedData.status
            };
          }
        } catch (textError) {
          logger.error('[OpenBankingFormService] Error reading error response text', textError);
        }
        
        // Default return value for error case with no cache
        return {
          formData: {},
          progress: 0,
          status: 'not_started'
        };
      }
      
      // Process successful response
      try {
        const data = await response.json();
        
        // Create the result with fallbacks for missing data
        const result = {
          formData: data.formData || {},
          progress: typeof data.progress === 'number' ? data.progress : 0,
          status: data.status || 'not_started'
        };
        
        // Store in cache for future fast loading
        OpenBankingFormService.progressCache.set(effectiveTaskId, {
          ...result,
          timestamp: Date.now()
        });
        
        // Log the success info
        logger.info(`[OpenBankingFormService] Progress loaded successfully:`, {
          taskId: effectiveTaskId,
          progress: result.progress,
          status: result.status,
          formDataKeys: Object.keys(result.formData).length
        });
        
        return result;
      } catch (parseError) {
        logger.error('[OpenBankingFormService] Error parsing progress response JSON:', parseError);
        
        // Use cache as fallback if JSON parsing fails
        if (cachedData) {
          return {
            formData: cachedData.formData,
            progress: cachedData.progress,
            status: cachedData.status
          };
        }
        
        // Default return if no cache and parsing failed
        return {
          formData: {},
          progress: 0, 
          status: 'not_started'
        };
      }
    } catch (error) {
      logger.error('[OpenBankingFormService] Error getting progress:', error);
      
      // Use cache as fallback for any other errors
      if (cachedData) {
        logger.info(`[OpenBankingFormService] Using cached data as fallback after error for task ${effectiveTaskId}`);
        return {
          formData: cachedData.formData,
          progress: cachedData.progress,
          status: cachedData.status
        };
      }
      
      // Default return value for any errors with no cache
      return {
        formData: {},
        progress: 0,
        status: 'not_started'
      };
    }
  }
  
  /**
   * Synchronize form data between task.savedFormData and individual field responses
   * This prevents inconsistencies when navigating between forms
   * @param taskId The task ID to synchronize
   * @returns Promise<SyncFormDataResponse> The synchronized form data response
   */
  public async syncFormData(taskId: number): Promise<SyncFormDataResponse> {
    try {
      // Check if taskId is provided
      if (!taskId) {
        logger.error('[OpenBankingFormService] Missing taskId in syncFormData');
        throw new Error('Task ID is required for synchronization');
      }
      
      logger.info(`[OpenBankingFormService] Synchronizing form data for task: ${taskId}`);
      
      // Call the standardized synchronization endpoint
      const response = await fetch(`/api/tasks/${taskId}/sync-form-data`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Check for errors
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[OpenBankingFormService] Error synchronizing form data: ${errorText}`);
        throw new Error(`Failed to synchronize Open Banking form data: ${response.status} ${response.statusText}`);
      }
      
      // Parse response
      const result = await response.json();
      
      // Update local form data if data was synchronized
      if (result.success && result.formData && result.syncDirection !== 'none') {
        logger.info(`[OpenBankingFormService] Updating local form data with synchronized data (direction: ${result.syncDirection})`);
        this.loadFormData(result.formData);
      } else {
        logger.info(`[OpenBankingFormService] No synchronization needed (direction: ${result.syncDirection})`);
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`[OpenBankingFormService] Error in syncFormData: ${errorMessage}`);
      
      // Return a failed response
      return {
        success: false,
        formData: {},
        progress: 0,
        status: 'error',
        taskId,
        syncDirection: 'none'
      };
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
      logger.info(`[OpenBankingFormService] Loading progress for task ${effectiveTaskId}`);
      
      // First, synchronize form data to ensure we have consistent state
      try {
        logger.info(`[OpenBankingFormService] Synchronizing form data before loading progress for task ${effectiveTaskId}`);
        const syncResult = await this.syncFormData(effectiveTaskId);
        
        if (syncResult.success) {
          logger.info(`[OpenBankingFormService] Form data synchronized successfully before loading (direction: ${syncResult.syncDirection})`);
          
          // If we synchronized data and the direction was not 'none',
          // we can use the synchronized form data directly
          if (syncResult.syncDirection !== 'none' && Object.keys(syncResult.formData).length > 0) {
            logger.info(`[OpenBankingFormService] Using synchronized data from server (${Object.keys(syncResult.formData).length} fields)`);
            return syncResult.formData;
          }
        } else {
          logger.warn(`[OpenBankingFormService] Form data synchronization failed before loading, continuing with normal load`);
        }
      } catch (syncError) {
        logger.error(`[OpenBankingFormService] Error during pre-load synchronization: ${syncError}`);
        // Continue with normal loading even if sync fails
      }
      
      // Get the task information first to check if it's already submitted
      try {
        const taskResponse = await fetch(`/api/tasks/${effectiveTaskId}`, {
          credentials: 'include' // Include session cookies
        });
        if (taskResponse.ok) {
          const taskData = await taskResponse.json();
          if (taskData.status === 'submitted') {
            logger.info(`[OpenBankingFormService] Task ${effectiveTaskId} is already submitted, still loading form data for display`);
            // Special handling for submitted tasks, but we continue to load the data
            // Don't return an empty object, continue with loading the data
          }
        }
      } catch (taskError) {
        // If we can't get the task, continue with trying to get the progress
        logger.warn(`[OpenBankingFormService] Could not check task status: ${taskError}`);
      }
      
      // Use our dedicated Open Banking progress endpoint
      try {
        // Pass the effectiveTaskId to ensure it's used even if this.taskId is not yet set
        const progress = await this.getProgress(effectiveTaskId);
        
        if (progress && progress.formData) {
          // Store the form data in the service for future reference
          this.loadFormData(progress.formData);
          
          // Return the form data for the form manager to use
          return progress.formData;
        }
      } catch (progressError) {
        // If we fail to get progress, log it but don't throw
        logger.warn(`[OpenBankingFormService] Could not load progress, returning empty object: ${progressError}`);
        return {};
      }
      
      // If no data was found, return an empty object
      logger.warn(`[OpenBankingFormService] No form data found for task ${effectiveTaskId}`);
      return {};
    } catch (error) {
      logger.error('[OpenBankingFormService] Error loading progress:', error);
      // Return empty object instead of throwing to ensure the form still loads
      return {};
    }
  }
  
    // Add throttling variables for progress updates
  private static lastSaveTime: Record<number, number> = {};
  private static saveQueue: Record<number, any> = {};
  private static MIN_SAVE_INTERVAL = 2000; // 2 seconds between saves
  
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
    
    // Implement throttling to prevent too many save operations
    const now = Date.now();
    if (OpenBankingFormService.lastSaveTime[effectiveTaskId]) {
      const timeSinceLastSave = now - OpenBankingFormService.lastSaveTime[effectiveTaskId];
      if (timeSinceLastSave < OpenBankingFormService.MIN_SAVE_INTERVAL) {
        // Queue the save to be done later
        logger.debug(`[OpenBankingFormService] Throttling save for task ${effectiveTaskId} - queued for later`);
        
        // Store the latest form data in the queue
        OpenBankingFormService.saveQueue[effectiveTaskId] = {
          formData: this.getFormData(),
          timestamp: now
        };
        
        // Successfully queued
        return true;
      }
    }
    
    // If we're here, it's been long enough since the last save
    // Update the last save time
    OpenBankingFormService.lastSaveTime[effectiveTaskId] = now;
    
    // Clear the queue entry if it exists
    if (OpenBankingFormService.saveQueue[effectiveTaskId]) {
      delete OpenBankingFormService.saveQueue[effectiveTaskId];
    }
    
    try {
      logger.info(`[OpenBankingFormService] Saving form data for task ${effectiveTaskId}`);
      
      // Get current form data
      const formData = this.getFormData();
      
      // Calculate which fields were updated - for timestamp tracking
      const fieldUpdates = Object.keys(formData);
      
      // Get current progress and status to include in the save
      let progress, status;
      try {
        // Try to fetch current progress first - pass the effective task ID explicitly
        const progressData = await this.getProgress(effectiveTaskId);
        progress = progressData.progress;
        status = progressData.status;
      } catch (progressError) {
        logger.warn('[OpenBankingFormService] Unable to fetch current progress, will calculate on server', progressError);
        // Progress will be calculated on the server side
      }
      
      // Use the standardized Open Banking progress endpoint
      const response = await fetch(`/api/open-banking/progress`, {
        method: 'POST',
        credentials: 'include', 
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: effectiveTaskId,
          formData,
          fieldUpdates,
          progress,
          status
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[OpenBankingFormService] Failed to save form data: ${response.status}`, errorText);
        return false;
      }
      
      const result = await response.json();
      
      // Update local form data with any server-side changes
      if (result.savedData && result.savedData.formData) {
        this.loadFormData(result.savedData.formData);
        
        // Also update the cache to maintain consistency
        const updatedProgress = result.savedData.progress;
        const updatedStatus = result.savedData.status;
        
        // Update our cache for next time to prevent progress mismatches
        OpenBankingFormService.progressCache.set(effectiveTaskId, {
          formData: result.savedData.formData,
          progress: updatedProgress,
          status: updatedStatus,
          timestamp: Date.now()
        });
      }
      
      logger.info(`[OpenBankingFormService] Form data saved successfully for task ${effectiveTaskId}`, {
        progress: result.savedData?.progress,
        status: result.savedData?.status
      });
      
      return true;
    } catch (error) {
      logger.error('[OpenBankingFormService] Error saving form data:', error);
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
   * Reset form data in the service and local state without saving to server
   * @param taskId Optional task ID (uses this.taskId if not provided)
   */
  public resetFormData(taskId?: number): void {
    const effectiveTaskId = taskId || this.taskId;
    
    if (!effectiveTaskId) {
      logger.error('[OpenBankingFormService] No task ID provided for resetting form data');
      return;
    }
    
    try {
      // Create empty data object with all fields set to empty strings
      const emptyData: Record<string, string> = {};
      
      // Set all fields to empty strings if we have them loaded
      if (this.fields && this.fields.length > 0) {
        this.fields.forEach(field => {
          if (field && field.key) {
            emptyData[field.key] = '';
          }
        });
      }
      
      // Reset the form data in memory
      this.loadFormData(emptyData);
      
      logger.info(`[OpenBankingFormService] Form data reset successfully for task ${effectiveTaskId}`);
    } catch (error) {
      logger.error('[OpenBankingFormService] Error resetting form data:', error);
    }
  }
  
  /**
   * Clear all field values for the current task (server-side)
   * @param taskId Optional task ID (uses this.taskId if not provided)
   * @returns True if clearing was successful, false otherwise
   */
  public async clearAllFields(taskId?: number): Promise<boolean> {
    const effectiveTaskId = taskId || this.taskId;
    
    if (!effectiveTaskId) {
      logger.error('[OpenBankingFormService] No task ID provided for clearing fields');
      return false;
    }
    
    try {
      logger.info(`[OpenBankingFormService] Clearing all fields for task ${effectiveTaskId}`);
      
      // Create empty data object with all fields set to empty strings
      const emptyData: Record<string, string> = {};
      
      // Get all field definitions
      const fields = await this.getFields();
      
      // Set all fields to empty strings
      fields.forEach(field => {
        if (field && field.key) {
          emptyData[field.key] = '';
        }
      });
      
      // Temporarily disable automatic form saving during clear operation
      // to prevent firing multiple reconciliation requests
      const wasSavingEnabled = this.autoSaveEnabled;
      this.autoSaveEnabled = false;
      
      // First try the fast clear endpoint that matches KYB/KY3P
      let response = await fetch(`/api/tasks/${effectiveTaskId}/open-banking-responses/clear-all`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      // If fast clear fails, fall back to the standard clear endpoint
      if (!response.ok) {
        logger.warn(`[OpenBankingFormService] Fast clear failed, trying standard clear endpoint: ${response.status}`);
        response = await fetch(`/api/open-banking/clear/${effectiveTaskId}`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        });
      }
      
      if (!response.ok) {
        logger.error(`[OpenBankingFormService] Failed to clear fields: ${response.status}`);
        this.autoSaveEnabled = wasSavingEnabled; // Restore previous auto-save setting
        return false;
      }
      
      // Update form data in our service without triggering save
      this.loadFormData(emptyData);
      
      // Instead of immediately saving/reconciling, wait a bit to let server-side 
      // reconciliation skip timer expire
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Restore auto-save setting
      this.autoSaveEnabled = wasSavingEnabled;
      
      logger.info(`[OpenBankingFormService] Successfully cleared all fields for task ${effectiveTaskId}`);
      return true;
    } catch (error) {
      logger.error('[OpenBankingFormService] Error clearing fields:', error);
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
      throw new Error('No task ID provided for submitting form');
    }
    
    try {
      logger.info(`[OpenBankingFormService] Submitting form for task ${effectiveTaskId}`);
      
      // First save all form data to ensure everything is up to date
      const saveResult = await this.save({ taskId: effectiveTaskId, includeMetadata: true });
      
      if (!saveResult) {
        logger.error(`[OpenBankingFormService] Failed to save form data before submission`);
        return {
          success: false,
          error: 'Failed to save form data before submission',
        };
      }
      
      // Call the submit endpoint
      const response = await fetch(`/api/tasks/${effectiveTaskId}/open-banking-submit`, {
        method: 'POST',
        credentials: 'include', // Include session cookies
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
        logger.error(`[OpenBankingFormService] Form submission failed: ${response.status}`, errorText);
        return {
          success: false,
          error: `Form submission failed: ${response.status}`,
          details: errorText
        };
      }
      
      const result = await response.json();
      
      logger.info(`[OpenBankingFormService] Form submitted successfully:`, {
        fileId: result.fileId,
        fileName: result.fileName
      });
      
      return {
        success: true,
        fileId: result.fileId,
        fileName: result.fileName
      };
    } catch (error) {
      logger.error('[OpenBankingFormService] Form submission error:', error);
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
    const requiredFields = this.getFields().filter(field => field.required);
    
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
 * Factory class for creating isolated Open Banking form service instances
 * Follows the same pattern as EnhancedKybServiceFactory
 */
export class OpenBankingFormServiceFactory {
  private static instance: OpenBankingFormServiceFactory;
  private instances: Map<string, OpenBankingFormService> = new Map();
  
  private constructor() {}
  
  public static getInstance(): OpenBankingFormServiceFactory {
    if (!OpenBankingFormServiceFactory.instance) {
      OpenBankingFormServiceFactory.instance = new OpenBankingFormServiceFactory();
    }
    return OpenBankingFormServiceFactory.instance;
  }
  
  /**
   * Get or create an isolated Open Banking form service instance
   * @param companyId The company ID
   * @param taskId The task ID
   * @returns Open Banking form service instance specific to this company and task
   */
  public getServiceInstance(companyId: number | string, taskId: number | string): OpenBankingFormService {
    const key = `${companyId}-${taskId}`;
    
    if (!this.instances.has(key)) {
      logger.info(`[OpenBankingFormServiceFactory] Creating new Open Banking form service instance for company ${companyId}, task ${taskId}`);
      this.instances.set(key, new OpenBankingFormService(Number(companyId), Number(taskId)));
    }
    
    return this.instances.get(key)!;
  }
}

// Create singleton instance for use in the application
export const openBankingFormService = _instance || (_instance = new OpenBankingFormService());
export const openBankingFormServiceFactory = OpenBankingFormServiceFactory.getInstance();