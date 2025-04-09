import { apiRequest } from '@/lib/queryClient';
import { FormData, FormField, FormSection, FormServiceInterface, FormSubmitOptions } from './formService';
import { sortFields, getFieldComponentType } from '../utils/formUtils';

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
  
  /**
   * Initialize the KYB form service
   * @param templateId ID of the task template
   */
  async initialize(templateId: number): Promise<void> {
    console.log(`[KYB Service] Initialize called with templateId: ${templateId}, already initialized: ${this.initialized}, time: ${new Date().toISOString()}`);
    
    // Add a check for invalid template ID
    if (!templateId || isNaN(templateId)) {
      console.error(`[KYB Service] Invalid template ID: ${templateId}`);
      throw new Error(`Invalid KYB template ID: ${templateId}`);
    }
    
    if (this.initialized) {
      console.log('[KYB Service] Already initialized, returning early');
      return;
    }
    
    this.templateId = templateId;
    
    try {
      console.log(`[KYB Service] Fetching KYB fields for template ID: ${templateId}, time: ${new Date().toISOString()}`);
      
      // Log service state before fetching fields
      console.log(`[KYB Service] Current service state: initialized=${this.initialized}, fields count=${this.fields.length}, sections count=${this.sections.length}`);
      
      // Check for alternative API endpoints
      try {
        console.log('[KYB Service] Attempting to fetch template configuration...');
        const templateResponse = await fetch(`/api/task-templates/${templateId}`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Request-ID': `kyb-template-${templateId}-${Date.now()}`
          }
        });
        console.log(`[KYB Service] Template response status: ${templateResponse.status}`);
        if (templateResponse.ok) {
          const templateData = await templateResponse.json();
          console.log('[KYB Service] Template data:', { 
            id: templateData.id, 
            name: templateData.name, 
            taskType: templateData.task_type,
            configCount: templateData.configurations?.length || 0
          });
        }
      } catch (templateError) {
        console.error('[KYB Service] Error fetching template:', templateError);
      }
      
      // Fetch KYB fields from the API with retry
      let kybFields: KybField[] = [];
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          console.log(`[KYB Service] Attempt ${retryCount + 1}/${maxRetries} to fetch KYB fields...`);
          kybFields = await this.getKybFields();
          console.log(`[KYB Service] Fields response received, count: ${kybFields?.length || 0}`);
          
          if (kybFields && kybFields.length > 0) {
            console.log(`[KYB Service] Successfully fetched ${kybFields.length} fields on attempt ${retryCount + 1}`);
            break; // Success, exit the loop
          }
          console.warn(`[KYB Service] No KYB fields found, retrying (${retryCount + 1}/${maxRetries})...`);
          retryCount++;
          // Short exponential backoff
          await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount)));
        } catch (fetchError) {
          console.error(`[KYB Service] Error fetching KYB fields (attempt ${retryCount + 1}/${maxRetries}):`, fetchError);
          
          // Try the alternative step-based endpoint
          try {
            console.log('[KYB Service] Attempting to fetch step 1 fields as fallback...');
            const stepFields = await this.getKybFieldsByStepIndex(1);
            if (stepFields && stepFields.length > 0) {
              console.log(`[KYB Service] Successfully fetched ${stepFields.length} fields from step 1 endpoint`);
              kybFields = stepFields;
              break; // Success with alternative endpoint
            }
          } catch (stepError) {
            console.error('[KYB Service] Step fields fallback also failed:', stepError);
          }
          
          retryCount++;
          if (retryCount >= maxRetries) throw fetchError;
          // Short exponential backoff
          await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount)));
        }
      }
      
      console.log(`[KYB Service] Fetched ${kybFields.length} KYB fields, time: ${new Date().toISOString()}`);
      
      // Guard against empty fields array
      if (!kybFields || kybFields.length === 0) {
        console.warn('[KYB Service] No KYB fields found after retries, initializing with empty fields');
        this.fields = [];
        this.sections = [];
        this.initialized = true;
        return;
      }
      
      // Group fields by section (group)
      const fieldGroups = this.groupFieldsBySection(kybFields);
      console.log(`[KYB Service] Created ${Object.keys(fieldGroups).length} field groups`);
      
      // Create sections from groups
      this.sections = Object.entries(fieldGroups).map(([groupName, groupFields], index) => {
        console.log(`[KYB Service] Processing group: ${groupName} with ${groupFields.length} fields`);
        return {
          id: groupName,
          title: groupName,
          order: index,
          collapsed: false,
          fields: groupFields.map(field => this.convertToFormField(field))
        };
      });
      
      console.log(`[KYB Service] Created ${this.sections.length} sections`);
      
      // Flatten all fields
      this.fields = this.sections.flatMap(section => section.fields);
      console.log(`[KYB Service] Flattened ${this.fields.length} fields total`);
      
      this.initialized = true;
      console.log('[KYB Service] Initialization complete');
    } catch (error) {
      console.error('[KYB Service] Initialization failed:', error);
      
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
      console.log(`[KYB Service] Fetching KYB fields from API... Time: ${new Date().toISOString()}`);
      
      // Check if templateId is set
      console.log(`[KYB Service] Current templateId: ${this.templateId || 'not set'}`);
      
      // Log the request
      console.log(`[KYB Service] Making fetch request to /api/kyb/fields with credentials`);
      const requestStartTime = Date.now();
      
      // Try to get info on available endpoints
      try {
        console.log('[KYB Service] Checking available endpoints from server for debugging...');
        const endpointsResponse = await fetch('/api-docs', {
          method: 'GET',
          credentials: 'include'
        }).catch(e => ({ ok: false, error: e }));
        
        if (endpointsResponse.ok) {
          console.log('[KYB Service] API documentation available at /api-docs');
        } else {
          console.log('[KYB Service] API documentation not available at /api-docs');
        }
      } catch (e) {
        console.log('[KYB Service] Error checking API docs:', e);
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
      console.log(`[KYB Service] KYB fields API response status: ${response.status}, duration: ${requestDuration}ms`);
      
      // Log response headers
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      console.log('[KYB Service] Response headers:', headers);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[KYB Service] Error fetching KYB fields: HTTP ${response.status}`, errorText);
        
        // Try to check if it's an auth issue
        try {
          console.log('[KYB Service] Checking auth status due to field fetch failure...');
          const authCheckResponse = await fetch('/api/auth/status', {
            method: 'GET',
            credentials: 'include'
          }).catch(e => ({ ok: false, status: 'error', statusText: e.message }));
          
          console.log(`[KYB Service] Auth check response status: ${authCheckResponse.status || 'unknown'}`);
        } catch (authError) {
          console.warn('[KYB Service] Auth check also failed:', authError);
        }
        
        throw new Error(`Failed to fetch KYB fields: ${response.status} ${errorText}`);
      }
      
      let fields;
      try {
        fields = await response.json();
        console.log('[KYB Service] Successfully parsed response JSON');
      } catch (jsonError) {
        console.error('[KYB Service] Error parsing response JSON:', jsonError);
        throw new Error(`Failed to parse KYB fields response: ${jsonError.message}`);
      }
      
      // Log to help debug
      const fieldsCount = Array.isArray(fields) ? fields.length : 0;
      console.log('[KYB Service] Successfully fetched KYB fields:', { 
        count: fieldsCount, 
        firstField: fieldsCount > 0 ? fields[0].field_key : 'none',
        fieldTypes: fieldsCount > 0 ? [...new Set(fields.map(f => f.field_type))].join(', ') : 'none',
        groups: fieldsCount > 0 ? [...new Set(fields.map(f => f.group))].join(', ') : 'none'
      });
      
      if (fieldsCount === 0) {
        console.warn('[KYB Service] Empty fields array received, which may cause issues with form rendering');
      }
      
      return Array.isArray(fields) ? fields : [];
    } catch (error) {
      console.error('[KYB Service] Error fetching KYB fields:', error);
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
      console.log(`[KYB Service] Fetching fields for step index: ${stepIndex}`);
      
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
      
      console.log(`[KYB Service] Step fields API response status: ${response.status} for step ${stepIndex}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[KYB Service] Error fetching KYB fields for step ${stepIndex}: HTTP ${response.status}`, errorText);
        throw new Error(`Failed to fetch KYB fields for step ${stepIndex}: ${response.status} ${errorText}`);
      }
      
      const fields = await response.json();
      
      // Safe check if fields is an array
      const fieldsArray = Array.isArray(fields) ? fields : [];
      console.log(`[KYB Service] Found ${fieldsArray.length} fields for step ${stepIndex}`);
      return fieldsArray;
    } catch (error) {
      console.error(`[KYB Service] Error fetching KYB fields for step ${stepIndex}:`, error);
      throw error; // Rethrow to allow the calling function to handle it
    }
  }
  
  /**
   * Groups KYB fields by their group property
   * @param fields Array of KYB fields to group
   * @returns Object with group names as keys and arrays of fields as values
   */
  groupFieldsBySection(fields: KybField[]): Record<string, KybField[]> {
    const groups: Record<string, KybField[]> = {};
    
    for (const field of fields) {
      if (!groups[field.group]) {
        groups[field.group] = [];
      }
      
      groups[field.group].push(field);
    }
    
    // Sort fields within each group by their order property
    for (const group in groups) {
      groups[group] = groups[group].sort((a, b) => a.order - b.order);
    }
    
    return groups;
  }
  
  /**
   * Convert KybField from database to FormField format for the form
   * @param field KYB field from the API
   * @returns FormField object ready for the universal form
   */
  convertToFormField(field: KybField): FormField {
    return {
      key: field.field_key,
      label: field.display_name,
      type: field.field_type,
      section: field.group,
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
    console.log(`[KYB Service] Loading form data:`, 
      data ? `${Object.keys(data).length} fields` : 'null or undefined data'
    );
    
    // Ensure we never set formData to null or undefined
    if (!data) {
      console.warn('[KYB Service] Received null or undefined form data, using empty object instead');
      this.formData = {};
      return;
    }
    
    // Store the form data
    this.formData = { ...data };
    
    console.log('[KYB Service] Form data loaded successfully');
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
      throw new Error('Task ID is required to save progress');
    }
    
    try {
      const progress = this.calculateProgress();
      await this.saveKybProgress(taskId, progress, this.formData);
    } catch (error) {
      console.error('Error saving KYB progress:', error);
      throw error;
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
      console.log(`[KYB Service] Saving progress for task ${taskId}, progress: ${progress}%`);
      
      // Use direct fetch with credentials
      const response = await fetch(`/api/kyb/progress/${taskId}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Request-ID': `kyb-progress-${taskId}-${Date.now()}`
        },
        body: JSON.stringify({
          progress,
          formData
        })
      });
      
      console.log(`[KYB Service] Save progress API response status: ${response.status} for task ${taskId}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[KYB Service] Error saving KYB progress for task ${taskId}: HTTP ${response.status}`, errorText);
        throw new Error(`Failed to save KYB progress: ${response.status} ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('[KYB Service] Error saving KYB progress:', error);
      throw error;
    }
  }
  
  /**
   * Gets saved progress for a KYB form
   * @param taskId ID of the task
   * @returns Promise with saved form data and progress
   */
  async getKybProgress(taskId: number): Promise<KybProgressResponse> {
    try {
      console.log(`[KYB Service] Getting progress for task ${taskId}`);
      
      // Use direct fetch with credentials
      const response = await fetch(`/api/kyb/progress/${taskId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Request-ID': `kyb-get-progress-${taskId}-${Date.now()}`
        }
      });
      
      console.log(`[KYB Service] Get progress API response status: ${response.status} for task ${taskId}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[KYB Service] Error getting KYB progress for task ${taskId}: HTTP ${response.status}`, errorText);
        throw new Error(`Failed to get KYB progress: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      
      // Type assertion for the response data
      const typedData = data as KybProgressResponse;
      
      console.log(`[KYB Service] Progress data received:`, typedData);
      
      // Ensure the required fields are present
      return {
        formData: typedData.formData || {},
        progress: typedData.progress || 0,
        status: typedData.status
      };
    } catch (error) {
      console.error('[KYB Service] Error getting KYB progress:', error);
      throw error;
    }
  }
  
  /**
   * Load saved progress for a task
   * @param taskId ID of the task
   * @returns Promise that resolves with loaded form data
   */
  async loadProgress(taskId: number): Promise<FormData> {
    try {
      console.log(`[KYB Service] Loading saved progress for task ${taskId}`);
      const { formData } = await this.getKybProgress(taskId);
      
      if (!formData) {
        console.log(`[KYB Service] No form data found for task ${taskId}, using empty object`);
        this.loadFormData({});
        return {};
      }
      
      console.log(`[KYB Service] Form data loaded successfully for task ${taskId}:`, 
        Object.keys(formData).length > 0 
          ? `${Object.keys(formData).length} fields found` 
          : 'Empty form data'
      );
      
      this.loadFormData(formData);
      return formData;
    } catch (error) {
      console.error(`[KYB Service] Error loading KYB progress for task ${taskId}:`, error);
      // Fall back to empty object on error, but still throw the error
      this.loadFormData({});
      throw error;
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
    } catch (error) {
      console.error('Error submitting KYB form:', error);
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
      console.log(`[KYB Service] Submitting form for task ${taskId}`);
      
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
      
      console.log(`[KYB Service] Submit form API response status: ${response.status} for task ${taskId}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[KYB Service] Error submitting KYB form for task ${taskId}: HTTP ${response.status}`, errorText);
        throw new Error(`Failed to submit KYB form: ${response.status} ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('[KYB Service] Error submitting KYB form:', error);
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