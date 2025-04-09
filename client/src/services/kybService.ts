import { apiRequest } from '@/lib/queryClient';
import { FormData, FormField, FormSection, FormServiceInterface, FormSubmitOptions } from './formService';
import { sortFields, getFieldComponentType } from '../utils/formUtils';
import getLogger from '../utils/logger';

export interface KybField {
  id: number;
  field_key: string;
  display_name: string;
  field_type: string;
  question: string;
  group: string;
  required: boolean;
  order: number;
  validation_rules: any;
  help_text: string | null;
}

export interface KybProgressResponse {
  formData: Record<string, any>;
  progress: number;
  status?: string;
}

/**
 * KYB Form Service
 * Implementation of FormServiceInterface for the KYB form type
 */
export class KybFormService implements FormServiceInterface {
  private fields: FormField[] = [];
  private sections: FormSection[] = [];
  private formData: Record<string, any> = {};
  private initialized = false;
  private templateId: number | null = null;
  private logger = getLogger('KYB Service', {
    levels: {
      debug: false, // Turn off debug logging by default
      info: false,  // Turn off info logging by default
      warn: true,   // Keep warnings enabled
      error: true   // Keep errors enabled
    }
  });
  
  /**
   * Initialize the KYB form service
   * @param templateId ID of the task template
   */
  // Static cache for fields to prevent redundant API calls
  private static fieldsCache: Record<number, KybField[]> = {};
  private static initializationPromise: Record<number, Promise<void>> = {};
  
  async initialize(templateId: number): Promise<void> {
    // Only log at debug level to reduce console noise
    this.logger.debug(`Initialize called with templateId: ${templateId}, already initialized: ${this.initialized}, time: ${new Date().toISOString()}`);
    
    // Add a check for invalid template ID
    if (!templateId || isNaN(templateId)) {
      this.logger.error(`Invalid template ID: ${templateId}`);
      throw new Error(`Invalid KYB template ID: ${templateId}`);
    }
    
    // If we're already initialized, just return immediately
    if (this.initialized) {
      this.logger.debug('Already initialized, returning early');
      return;
    }
    
    // If another initialization is in progress for this template, wait for it
    if (templateId in KybFormService.initializationPromise && 
        KybFormService.initializationPromise[templateId] !== undefined) {
      this.logger.debug(`Another initialization in progress for template ${templateId}, waiting for it to complete`);
      await KybFormService.initializationPromise[templateId];
      
      // If we're now initialized (by the other process), just return
      if (this.initialized) {
        this.logger.debug('Initialization completed by another instance');
        return;
      }
    }
    
    // Start a new initialization and track the promise
    const initPromise = this._initialize(templateId);
    KybFormService.initializationPromise[templateId] = initPromise;
    
    try {
      await initPromise;
    } finally {
      // Clear the promise reference once done
      delete KybFormService.initializationPromise[templateId];
    }
  }
  
  private async _initialize(templateId: number): Promise<void> {
    this.templateId = templateId;
    
    try {
      this.logger.debug(`Fetching KYB fields for template ID: ${templateId}`);
      
      // Check if we have cached fields for this template ID
      let kybFields: KybField[] = KybFormService.fieldsCache[templateId] || [];
      
      // If we have cached fields, use them
      if (kybFields.length > 0) {
        this.logger.debug(`Using ${kybFields.length} cached fields for template ${templateId}`);
      } else {
        // Fetch KYB fields from the API with retry
        let retryCount = 0;
        const maxRetries = 2; // Reduced from 3 to 2
        
        while (retryCount < maxRetries && kybFields.length === 0) {
          try {
            this.logger.debug(`Attempt ${retryCount + 1}/${maxRetries} to fetch KYB fields...`);
            kybFields = await this.getKybFields();
            
            if (kybFields && kybFields.length > 0) {
              // Cache the fields for future use
              KybFormService.fieldsCache[templateId] = kybFields;
              this.logger.debug(`Successfully fetched and cached ${kybFields.length} fields`);
              break; // Success, exit the loop
            }
            
            retryCount++;
            // Reduced backoff to improve performance
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (fetchError) {
            this.logger.debug(`Error fetching KYB fields (attempt ${retryCount + 1}/${maxRetries})`);
            
            // Try the alternative step-based endpoint as fallback
            try {
              const stepFields = await this.getKybFieldsByStepIndex(1);
              if (stepFields && stepFields.length > 0) {
                kybFields = stepFields;
                // Cache these fields too
                KybFormService.fieldsCache[templateId] = kybFields;
                break; // Success with alternative endpoint
              }
            } catch (stepError) {
              // Just continue with the retry loop
            }
            
            retryCount++;
            if (retryCount >= maxRetries) throw fetchError;
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
      }
      
      this.logger.info(`Fetched ${kybFields.length} KYB fields`);
      
      // Guard against empty fields array
      if (!kybFields || kybFields.length === 0) {
        this.logger.warn('No KYB fields found after retries, initializing with empty fields');
        this.fields = [];
        this.sections = [];
        this.initialized = true;
        return;
      }
      
      // Group fields by section (group)
      const fieldGroups = this.groupFieldsBySection(kybFields);
      this.logger.info(`Created ${Object.keys(fieldGroups).length} field groups`);
      
      // Define section display order with properly normalized section names
      // This ensures consistent section naming throughout the application
      const sectionOrder = [
        { id: "Company Profile", title: "Company Profile" },
        { id: "Governance & Leadership", title: "Governance & Leadership" },
        { id: "Financial Profile", title: "Financial Profile" },
        { id: "Operations & Compliance", title: "Operations & Compliance" }
      ];
      
      // Log all available field groups for debugging
      this.logger.debug(`Available field groups: ${Object.keys(fieldGroups).join(', ')}`);
      
      // Create sections in the predefined order using our normalized section names
      this.sections = sectionOrder
        .filter(section => fieldGroups[section.id]) // Only include sections that have fields
        .map((section, index) => {
          const groupFields = fieldGroups[section.id] || [];
          this.logger.debug(`Processing group: ${section.id} with ${groupFields.length} fields`);
          return {
            id: section.id,
            title: section.title,
            order: index,
            collapsed: false,
            // Convert fields using our normalization-aware converter
            fields: groupFields.map(field => this.convertToFormField(field))
          };
        });
      
      this.logger.info(`Created ${this.sections.length} sections`);
      
      // Flatten all fields
      this.fields = this.sections.flatMap(section => section.fields);
      this.logger.info(`Flattened ${this.fields.length} fields total`);
      
      this.initialized = true;
      this.logger.info('Initialization complete');
    } catch (error) {
      this.logger.error('Initialization failed:', error);
      
      // Set initialized flag to false to allow retry
      this.initialized = false;
      
      // Initialize with empty collections on error to prevent crashes
      this.fields = [];
      this.sections = [];
      
      // Rethrow to allow the caller to handle the error
      throw error;
    }
  }
  
  /**
   * Fetches all KYB fields from the server, ordered by group and order
   * @returns Promise with an array of KYB fields
   */
  async getKybFields(): Promise<KybField[]> {
    try {
      this.logger.info(`Fetching KYB fields from API... Time: ${new Date().toISOString()}`);
      
      // Check if templateId is set
      this.logger.debug(`Current templateId: ${this.templateId || 'not set'}`);
      
      // Log the request
      this.logger.debug(`Making fetch request to /api/kyb/fields with credentials`);
      const requestStartTime = Date.now();
      
      // Try to get info on available endpoints
      try {
        this.logger.debug('Checking available endpoints from server for debugging...');
        const endpointsResponse = await fetch('/api-docs', {
          method: 'GET',
          credentials: 'include'
        }).catch(e => ({ ok: false, error: e }));
        
        if (endpointsResponse.ok) {
          this.logger.debug('API documentation available at /api-docs');
        } else {
          this.logger.debug('API documentation not available at /api-docs');
        }
      } catch (e) {
        this.logger.debug('Error checking API docs:', e);
      }
      
      // Use a direct fetch with credentials to ensure cookies are sent
      const response = await fetch('/api/kyb/fields', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Request-ID': `kyb-fields-${Date.now()}`
        }
      });
      
      // Log timing and response status
      const requestDuration = Date.now() - requestStartTime;
      this.logger.debug(`KYB fields API response status: ${response.status}, duration: ${requestDuration}ms`);
      
      // Log response headers (we'll always send it at debug level which will be filtered by the logger)
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      this.logger.debug('Response headers:', headers);
      
      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Error fetching KYB fields: HTTP ${response.status}`, errorText);
        
        // Try to check if it's an auth issue
        try {
          this.logger.debug('Checking auth status due to field fetch failure...');
          const authCheckResponse = await fetch('/api/auth/status', {
            method: 'GET',
            credentials: 'include'
          }).catch(e => ({ ok: false, status: 'error', statusText: e.message }));
          
          this.logger.debug(`Auth check response status: ${authCheckResponse.status || 'unknown'}`);
        } catch (authError) {
          this.logger.warn('Auth check also failed:', authError);
        }
        
        throw new Error(`Failed to fetch KYB fields: ${response.status} ${errorText}`);
      }
      
      let fields;
      try {
        fields = await response.json();
        this.logger.debug('Successfully parsed response JSON');
      } catch (jsonError: unknown) {
        this.logger.error('Error parsing response JSON:', jsonError);
        // Safely convert error to string for the error message
        const errorMessage = jsonError instanceof Error ? jsonError.message : String(jsonError);
        throw new Error(`Failed to parse KYB fields response: ${errorMessage}`);
      }
      
      // Log to help debug
      const fieldsCount = Array.isArray(fields) ? fields.length : 0;
      this.logger.info('Successfully fetched KYB fields:', { 
        count: fieldsCount, 
        firstField: fieldsCount > 0 ? fields[0].field_key : 'none',
        fieldTypes: fieldsCount > 0 ? [...new Set(fields.map((f: KybField) => f.field_type))].join(', ') : 'none',
        groups: fieldsCount > 0 ? [...new Set(fields.map((f: KybField) => f.group))].join(', ') : 'none'
      });
      
      if (fieldsCount === 0) {
        this.logger.warn('Empty fields array received, which may cause issues with form rendering');
      }
      
      return Array.isArray(fields) ? fields : [];
    } catch (error: unknown) {
      this.logger.error('Error fetching KYB fields:', error);
      throw error; // Rethrow to allow the calling function to handle it
    }
  }
  
  /**
   * Get KYB fields for a specific step index
   * This is used for multi-step form rendering
   * @param stepIndex The step index to fetch fields for
   * @returns Array of KYB fields for the specified step
   */
  async getKybFieldsByStepIndex(stepIndex: number): Promise<KybField[]> {
    try {
      this.logger.info(`Fetching fields for step index: ${stepIndex}`);
      
      // Use direct fetch with credentials to ensure cookies are sent
      const response = await fetch(`/api/form-fields/company_kyb/${stepIndex}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Request-ID': `kyb-fields-step-${stepIndex}-${Date.now()}`
        }
      });
      
      this.logger.debug(`Step fields API response status: ${response.status} for step ${stepIndex}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Error fetching KYB fields for step ${stepIndex}: HTTP ${response.status}`, errorText);
        throw new Error(`Failed to fetch KYB fields for step ${stepIndex}: ${response.status} ${errorText}`);
      }
      
      const fields = await response.json();
      
      // Safe check if fields is an array
      const fieldsArray = Array.isArray(fields) ? fields : [];
      this.logger.debug(`Found ${fieldsArray.length} fields for step ${stepIndex}`);
      return fieldsArray;
    } catch (error: unknown) {
      this.logger.error(`Error fetching KYB fields for step ${stepIndex}:`, error);
      throw error; // Rethrow to allow the calling function to handle it
    }
  }
  
  /**
   * Groups KYB fields by their group property
   * @param fields Array of KYB fields to group
   * @returns Object with group names as keys and arrays of fields as values
   */
  /**
   * Get the standardized section name mapping dictionary
   * This ensures consistent section name normalization across the service
   * @returns Record mapping various section name formats to their standardized version
   */
  private getSectionNormalizationMap(): Record<string, string> {
    return {
      // Map camelCase to display format
      "companyProfile": "Company Profile",
      "governanceLeadership": "Governance & Leadership",
      "financialProfile": "Financial Profile",
      "operationsCompliance": "Operations & Compliance",
      
      // Map lowercase to display format for case-insensitive matching
      "company profile": "Company Profile",
      "governance & leadership": "Governance & Leadership",
      "financial profile": "Financial Profile", 
      "operations & compliance": "Operations & Compliance"
    };
  }
  
  /**
   * Normalize a section/group name to its standardized display format
   * @param groupName The section/group name to normalize
   * @returns The normalized section name
   */
  private normalizeSectionName(groupName: string): string {
    const normalizedGroups = this.getSectionNormalizationMap();
    
    // Try exact match, then lowercase match, or fall back to original
    const normalizedName = normalizedGroups[groupName] || 
                         normalizedGroups[groupName.toLowerCase()] || 
                         groupName;
                         
    // Log for debugging if a normalization happened
    if (normalizedName !== groupName) {
      this.logger.debug(`Normalized section name: "${groupName}" → "${normalizedName}"`);
    }
    
    return normalizedName;
  }
  
  // Cache for normalized group names to avoid recalculating
  private normalizedGroupCache: Record<string, string> = {};
  
  // Cache for grouped fields to avoid reprocessing
  private static groupedFieldsCache: Record<string, Record<string, KybField[]>> = {};
  
  /**
   * Groups KYB fields by their group property with aggressive caching for performance
   * Normalizes section names to avoid duplicates like "Company Profile" and "companyProfile"
   * @param fields Array of KYB fields to group
   * @returns Object with normalized group names as keys and arrays of fields as values
   */
  groupFieldsBySection(fields: KybField[]): Record<string, KybField[]> {
    if (!fields || fields.length === 0) {
      return {};
    }
    
    // Generate a simple cache key based on the first and last field
    const cacheKey = `${fields.length}-${fields[0].id}-${fields[fields.length-1].id}`;
    
    // Check if we have a cached result
    if (KybFormService.groupedFieldsCache[cacheKey]) {
      return KybFormService.groupedFieldsCache[cacheKey];
    }
    
    const groups: Record<string, KybField[]> = {};
    
    // Pre-populate groups with known sections to avoid repeated condition checks
    const knownSections = [
      "Company Profile", 
      "Governance & Leadership", 
      "Financial Profile", 
      "Operations & Compliance"
    ];
    
    for (const section of knownSections) {
      groups[section] = [];
    }
    
    // Group the fields using normalized section names
    for (const field of fields) {
      // Get normalized group name using our cache
      let normalizedGroup = this.normalizedGroupCache[field.group];
      if (!normalizedGroup) {
        normalizedGroup = this.normalizeSectionName(field.group);
        this.normalizedGroupCache[field.group] = normalizedGroup;
      }
      
      // Add the field to the normalized group, creating the array if needed
      (groups[normalizedGroup] = groups[normalizedGroup] || []).push(field);
    }
    
    // Sort fields within each group by their order property
    // Only sort non-empty groups to save processing
    for (const group in groups) {
      if (groups[group].length > 1) {
        groups[group].sort((a, b) => a.order - b.order);
      }
    }
    
    // Cache the result for future calls with these fields
    KybFormService.groupedFieldsCache[cacheKey] = groups;
    
    return groups;
  }
  
  /**
   * Convert KybField from database to FormField format for the form
   * Also normalizes the section name to ensure consistent grouping
   * @param field KYB field from the API
   * @returns FormField object ready for the universal form
   */
  convertToFormField(field: KybField): FormField {
    // Use the common normalization helper for consistency
    const normalizedSection = this.normalizeSectionName(field.group);
    
    return {
      key: field.field_key,
      label: field.display_name,
      type: field.field_type,
      section: normalizedSection, // Use the normalized section name
      placeholder: field.question,
      helpText: field.help_text || undefined,
      validation: {
        required: field.required,
        ...(field.validation_rules || {})
      },
      order: field.order,
      metadata: {
        id: field.id,
        original: field
      }
    };
  }
  
  /**
   * Get all form fields
   * @returns Array of form fields
   */
  getFields(): FormField[] {
    return [...this.fields];
  }
  
  /**
   * Get all form sections
   * @returns Array of form sections
   */
  getSections(): FormSection[] {
    return [...this.sections];
  }
  
  /**
   * Load form data into the service
   * @param data Form data to load
   */
  loadFormData(data: FormData): void {
    this.logger.debug(`Loading form data:`, 
      data ? `${Object.keys(data).length} fields` : 'null or undefined data'
    );
    
    // Ensure we never set formData to null or undefined
    if (!data) {
      this.logger.warn('Received null or undefined form data, using empty object instead');
      this.formData = {};
      return;
    }
    
    // Store the form data
    this.formData = { ...data };
    
    this.logger.debug('Form data loaded successfully');
  }
  
  /**
   * Update a specific field in the form data
   * @param fieldKey Field key to update
   * @param value New value for the field
   */
  updateFormData(fieldKey: string, value: any): void {
    this.formData[fieldKey] = value;
  }
  
  /**
   * Get the current form data
   * @returns Current form data
   */
  getFormData(): FormData {
    return { ...this.formData };
  }
  
  /**
   * Calculate form completion progress
   * @returns Percentage of form completion (0-100)
   */
  calculateProgress(): number {
    if (!this.fields.length) return 0;
    
    // Count the number of required fields that have values
    const requiredFields = this.fields.filter(field => field.validation?.required);
    
    if (!requiredFields.length) {
      // If no required fields, base progress on all fields
      const filledFields = this.fields.filter(field => {
        const value = this.formData[field.key];
        return value !== undefined && value !== null && value !== '';
      });
      
      return Math.round((filledFields.length / this.fields.length) * 100);
    }
    
    // Count filled required fields
    const filledRequiredFields = requiredFields.filter(field => {
      const value = this.formData[field.key];
      return value !== undefined && value !== null && value !== '';
    });
    
    return Math.round((filledRequiredFields.length / requiredFields.length) * 100);
  }
  
  /**
   * Saves progress for a KYB form
   * @param taskId ID of the task
   * @returns Promise that resolves when progress is saved
   */
  async saveProgress(taskId?: number): Promise<void> {
    if (!taskId) {
      console.error("[DEBUG KybService] Task ID is required to save progress");
      return;
    }
    
    try {
      const progress = this.calculateProgress();
      console.log(`[DEBUG KybService] Saving progress: ${progress}% for task ${taskId}`);
      await this.saveKybProgress(taskId, progress, this.formData);
      console.log(`[DEBUG KybService] Progress saved successfully: ${progress}% for task ${taskId}`);
    } catch (error: unknown) {
      this.logger.error('Error saving KYB progress:', error);
      console.error('[DEBUG KybService] Error saving KYB progress:', error);
      // Don't throw the error as this would interrupt autosave functionality
      // Silently fail so the user can continue working
    }
  }
  
  /**
   * Saves progress for a KYB form
   * @param taskId ID of the task
   * @param progress Progress percentage (0-100)
   * @param formData Form data to save
   * @returns Promise with saved data
   */
  async saveKybProgress(taskId: number, progress: number, formData: Record<string, any>) {
    try {
      const requestId = `kyb-progress-${taskId}-${Date.now()}`;
      this.logger.info(`Saving progress for task ${taskId}, progress: ${progress}%`);
      console.log(`[DEBUG KybService] Saving progress for task ${taskId}, progress: ${progress}%, fields: ${Object.keys(formData).length}, request ID: ${requestId}`);
      
      // Log data sample for debugging (first few fields)
      const fieldSample = Object.entries(formData).slice(0, 3);
      console.log(`[DEBUG KybService] Form data sample:`, fieldSample);
      
      // Get a list of all field keys
      const fieldKeys = Object.keys(formData);
      console.log(`[DEBUG KybService] Field keys: ${fieldKeys.join(', ').substring(0, 100)}...`);
      
      // API endpoint URL
      const apiUrl = `/api/kyb/progress`;
      console.log(`[DEBUG KybService] API URL: ${apiUrl}`);
      
      console.log(`[DEBUG KybService] Sending save progress API request at ${new Date().toISOString()}`);
      
      // Create an AbortController for timeout handling
      const controller = new AbortController();
      
      // Set a simple timeout that aborts the request after the specified time
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 10000); // 10 second timeout
      
      try {
        // Use direct fetch with credentials and timeout handling
        const response = await fetch(apiUrl, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Request-ID': requestId,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          },
          body: JSON.stringify({
            taskId,
            progress,
            formData
          }),
          signal: controller.signal
        });
        
        // Clear the timeout since the request completed
        // No need to clear timeouts with the new implementation
        
        this.logger.debug(`Save progress API response status: ${response.status} for task ${taskId}`);
        console.log(`[DEBUG KybService] Save progress API response - Status: ${response.status}, Status Text: ${response.statusText} for task ${taskId} at ${new Date().toISOString()}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          this.logger.error(`Error saving KYB progress for task ${taskId}: HTTP ${response.status}`, errorText);
          console.log(`[DEBUG KybService] Error saving progress: ${response.status} - ${errorText}`);
          throw new Error(`Failed to save KYB progress: ${response.status} ${errorText}`);
        }
        
        console.log(`[DEBUG KybService] Parsing JSON response at ${new Date().toISOString()}`);
        const result = await response.json();
        
        // Log the success response with details
        console.log(`[DEBUG KybService] Progress saved successfully:`, {
          success: result.success,
          taskId: taskId,
          progress: progress,
          status: result.savedData?.status,
          fieldsSaved: result.savedData?.formData ? Object.keys(result.savedData.formData).length : 0,
          timestamp: new Date().toISOString()
        });
        
        return result;
      } catch (fetchError) {
        // Clear the timeout in case of error
        // No need to clear timeouts with the new implementation
        
        // Check if this was an abort error (timeout)
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
          console.error(`[DEBUG KybService] Save progress request timed out after 10 seconds for task ${taskId}`);
          throw new Error(`Save progress request timed out after 10 seconds`);
        }
        
        // Rethrow other fetch errors
        throw fetchError;
      }
    } catch (error: unknown) {
      this.logger.error('Error saving KYB progress:', error);
      console.error(`[DEBUG KybService] Error saving KYB progress:`, error);
      
      // Return a "fake" success response to prevent form submission from failing
      // This is a fallback to ensure user data isn't lost due to network/API issues
      return {
        success: false,
        savedData: {
          status: 'ERROR',
          message: 'Failed to save progress due to network or server issue'
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Gets saved progress for a KYB form
   * @param taskId ID of the task
   * @returns Promise with saved form data and progress
   */
  async getKybProgress(taskId: number): Promise<KybProgressResponse> {
    try {
      const requestId = `kyb-get-progress-${taskId}-${Date.now()}`;
      this.logger.info(`Getting progress for task ${taskId}`);
      console.log(`[DEBUG KybService] Getting progress for task ${taskId}, request ID: ${requestId}`);
      
      // Log the exact API URL being used
      const apiUrl = `/api/kyb/progress/${taskId}`;
      console.log(`[DEBUG KybService] API URL: ${apiUrl}`);
      
      // Use direct fetch with credentials with timeout handling
      console.log(`[DEBUG KybService] Sending API request at ${new Date().toISOString()}`);
      
      // Create an AbortController for timeout handling
      const controller = new AbortController();
      
      // Set a simple timeout that aborts the request after the specified time
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 5000); // 5 second timeout
      
      try {
        const response = await fetch(apiUrl, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Request-ID': requestId,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          },
          signal: controller.signal
        });
        
        // Clear the timeout since the request completed
        // No need to clear timeouts with the new implementation
        
        this.logger.debug(`Get progress API response status: ${response.status} for task ${taskId}`);
        console.log(`[DEBUG KybService] Progress API response - Status: ${response.status}, Status Text: ${response.statusText} for task ${taskId} at ${new Date().toISOString()}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          this.logger.error(`Error getting KYB progress for task ${taskId}: HTTP ${response.status}`, errorText);
          console.log(`[DEBUG KybService] Error getting KYB progress: ${response.status}, Details: ${errorText}`);
          throw new Error(`Failed to get KYB progress: ${response.status} ${errorText}`);
        }
        
        console.log(`[DEBUG KybService] Parsing JSON response at ${new Date().toISOString()}`);
        const data = await response.json();
        
        // Type assertion for the response data
        const typedData = data as KybProgressResponse;
        
        // Check if data has the expected structure
        if (!typedData) {
          console.log(`[DEBUG KybService] Invalid response data: null or undefined`);
          throw new Error('Invalid response data: received null or undefined');
        }
        
        // Log key fields from the response
        console.log(`[DEBUG KybService] Progress data received:`, {
          progress: typedData.progress,
          status: typedData.status,
          formDataPresent: !!typedData.formData,
          formDataKeys: typedData.formData ? Object.keys(typedData.formData) : [],
          formDataSize: typedData.formData ? Object.keys(typedData.formData).length : 0
        });
        
        this.logger.debug(`Progress data received:`, typedData);
        
        // Ensure the required fields are present and log detailed information
        const result = {
          formData: typedData.formData || {},
          progress: typedData.progress || 0,
          status: typedData.status
        };
        
        console.log(`[DEBUG KybService] Returning processed progress data:`, {
          progress: result.progress,
          status: result.status,
          formDataFields: Object.keys(result.formData).length
        });
        
        return result;
      } catch (fetchError) {
        // Clear the timeout in case of error
        // No need to clear timeouts with the new implementation
        
        // Check if this was an abort error (timeout)
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
          console.error(`[DEBUG KybService] Request timed out after 5 seconds for task ${taskId}`);
          throw new Error(`Request timed out after 5 seconds`);
        }
        
        // Rethrow other fetch errors
        throw fetchError;
      }
    } catch (error: unknown) {
      this.logger.error('Error getting KYB progress:', error);
      console.error(`[DEBUG KybService] Error getting KYB progress:`, error);
      
      // Return a default/empty response instead of throwing
      // This makes the API more resilient to network errors
      return {
        formData: {},
        progress: 0,
        status: undefined
      };
    }
  }
  
  /**
   * Load saved progress for a task
   * @param taskId ID of the task
   * @returns Promise that resolves with loaded form data
   */
  async loadProgress(taskId: number): Promise<FormData> {
    try {
      this.logger.info(`Loading saved progress for task ${taskId}`);
      console.log(`[DEBUG KybService] Loading saved progress for task ${taskId}`);
      
      // Get current form data before loading - we'll use this if the API call fails
      const currentFormData = this.formData;
      console.log(`[DEBUG KybService] Current form data before loading has ${Object.keys(currentFormData).length} fields`);
      
      // Retrieve progress data from API - this has improved error handling now
      const progressData = await this.getKybProgress(taskId);
      console.log(`[DEBUG KybService] Progress data received:`, progressData);
      
      const { formData } = progressData;
      
      if (!formData || Object.keys(formData).length === 0) {
        this.logger.warn(`No form data found for task ${taskId}, using empty object`);
        console.log(`[DEBUG KybService] No form data found for task ${taskId}, using empty object`);
        
        // If we received no data and already have data loaded, keep the current data 
        // to prevent data loss during page navigation
        if (Object.keys(currentFormData).length > 0) {
          console.log(`[DEBUG KybService] Keeping existing form data with ${Object.keys(currentFormData).length} fields`);
          return currentFormData;
        }
        
        // Otherwise load an empty object
        this.loadFormData({});
        return {};
      }
      
      // Log field keys and values for debugging
      console.log(`[DEBUG KybService] Form data fields (${Object.keys(formData).length} total):`);
      Object.entries(formData).forEach(([key, value]) => {
        console.log(`[DEBUG KybService] Field: ${key} = ${value !== null && value !== undefined ? 
          (typeof value === 'object' ? JSON.stringify(value) : value) : 'empty'}`);
      });
      
      this.logger.debug(`Form data loaded successfully for task ${taskId}:`, 
        Object.keys(formData).length > 0 
          ? `${Object.keys(formData).length} fields found` 
          : 'Empty form data'
      );
      
      console.log(`[DEBUG KybService] Loading form data into service (${Object.keys(formData).length} fields)`);
      this.loadFormData(formData);
      console.log(`[DEBUG KybService] Form data successfully loaded into service`);
      
      return formData;
    } catch (error: unknown) {
      this.logger.error(`Error loading KYB progress for task ${taskId}:`, error);
      console.error(`[DEBUG KybService] Error loading KYB progress for task ${taskId}:`, error);
      
      // Get the current form data that's already loaded in the service
      try {
        const existingData = this.formData;
        console.log(`[DEBUG KybService] Error occurred, but using existing form data with ${Object.keys(existingData).length} fields`);
        
        // If we already have data, keep it to prevent data loss during navigation errors
        if (Object.keys(existingData).length > 0) {
          return existingData;
        }
      } catch (e) {
        console.error(`[DEBUG KybService] Could not get existing form data:`, e);
      }
      
      // Fall back to empty object on error, but don't throw
      this.loadFormData({});
      return {};
    }
  }
  
  /**
   * Save the form data
   * @param options Form submission options
   * @returns Promise that resolves when form data is saved
   */
  async save(options: FormSubmitOptions): Promise<boolean> {
    if (!options.taskId) {
      throw new Error('Task ID is required to save the form');
    }
    
    try {
      console.log(`[DEBUG KybService] Saving form for task ID: ${options.taskId}, form has ${
        Object.keys(this.formData).length
      } fields`);
      
      // Log field keys and a sample of values
      const fieldKeys = Object.keys(this.formData);
      console.log(`[DEBUG KybService] Form fields to save: ${fieldKeys.join(', ').substring(0, 100)}...`);
      
      // Sample the first few fields for debugging
      const fieldSample = Object.entries(this.formData).slice(0, 3);
      console.log(`[DEBUG KybService] Field data sample:`, fieldSample);
      
      // Calculate progress before saving
      const progress = this.calculateProgress();
      console.log(`[DEBUG KybService] Calculated progress: ${progress}%`);
      
      // Use the existing saveProgress method
      await this.saveProgress(options.taskId);
      console.log(`[DEBUG KybService] Form saved successfully for task ID: ${options.taskId}`);
      return true;
    } catch (error: unknown) {
      this.logger.error('Error saving KYB form:', error);
      console.error(`[DEBUG KybService] Error saving KYB form:`, error);
      return false;
    }
  }
  
  /**
   * Submit the form
   * @param options Form submission options
   * @returns Promise that resolves with submission result
   */
  async submit(options: FormSubmitOptions): Promise<any> {
    if (!options.taskId) {
      throw new Error('Task ID is required to submit the form');
    }
    
    try {
      return await this.submitKybForm(options.taskId, this.formData, options.fileName);
    } catch (error: unknown) {
      this.logger.error('Error submitting KYB form:', error);
      throw error;
    }
  }
  
  /**
   * Submits a completed KYB form
   * @param taskId ID of the task
   * @param formData Complete form data
   * @param fileName Optional file name for the CSV export
   * @returns Promise with submission result
   */
  async submitKybForm(taskId: number, formData: Record<string, any>, fileName?: string) {
    try {
      this.logger.info(`Submitting form for task ${taskId}`);
      
      // Use direct fetch with credentials
      const response = await fetch(`/api/kyb/submit/${taskId}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Request-ID': `kyb-submit-${taskId}-${Date.now()}`
        },
        body: JSON.stringify({
          formData,
          fileName
        })
      });
      
      this.logger.debug(`Submit form API response status: ${response.status} for task ${taskId}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Error submitting KYB form for task ${taskId}: HTTP ${response.status}`, errorText);
        throw new Error(`Failed to submit KYB form: ${response.status} ${errorText}`);
      }
      
      return await response.json();
    } catch (error: unknown) {
      this.logger.error('Error submitting KYB form:', error);
      throw error;
    }
  }
  
  /**
   * Validate form data
   * @param data Form data to validate
   * @returns Validation result (true if valid, error object if invalid)
   */
  validate(data: FormData): boolean | Record<string, string> {
    const errors: Record<string, string> = {};
    
    for (const field of this.fields) {
      const { key, validation, label } = field;
      const value = data[key];
      
      // Skip fields that don't have validation rules
      if (!validation) continue;
      
      // Required validation
      if (validation.required && (value === undefined || value === null || value === '')) {
        errors[key] = `${label} is required`;
        continue;
      }
      
      // Skip further validation for empty optional fields
      if (value === undefined || value === null || value === '') continue;
      
      // String validations
      if (typeof value === 'string') {
        // Min length validation
        if (validation.minLength !== undefined && value.length < validation.minLength) {
          errors[key] = `${label} must be at least ${validation.minLength} characters`;
          continue;
        }
        
        // Max length validation
        if (validation.maxLength !== undefined && value.length > validation.maxLength) {
          errors[key] = `${label} must be at most ${validation.maxLength} characters`;
          continue;
        }
        
        // Pattern validation
        if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
          errors[key] = validation.message || `${label} has an invalid format`;
          continue;
        }
      }
      
      // Number validations
      if (typeof value === 'number') {
        // Min value validation
        if (validation.min !== undefined && value < validation.min) {
          errors[key] = `${label} must be at least ${validation.min}`;
          continue;
        }
        
        // Max value validation
        if (validation.max !== undefined && value > validation.max) {
          errors[key] = `${label} must be at most ${validation.max}`;
          continue;
        }
      }
    }
    
    // Return true if no errors, otherwise return the errors object
    return Object.keys(errors).length === 0 ? true : errors;
  }
}

// Export a singleton instance of the KYB form service
export const kybService = new KybFormService();

// Export convenience functions
export const getKybFields = (): Promise<KybField[]> => kybService.getKybFields();
export const getKybFieldsByStepIndex = (stepIndex: number): Promise<KybField[]> => kybService.getKybFieldsByStepIndex(stepIndex);
export const groupKybFieldsBySection = (fields: KybField[]): Record<string, KybField[]> => kybService.groupFieldsBySection(fields);
export const saveKybProgress = (taskId: number, progress: number, formData: Record<string, any>) => kybService.saveKybProgress(taskId, progress, formData);
export const getKybProgress = (taskId: number): Promise<KybProgressResponse> => kybService.getKybProgress(taskId);
export const submitKybForm = (taskId: number, formData: Record<string, any>, fileName?: string) => kybService.submitKybForm(taskId, formData, fileName);