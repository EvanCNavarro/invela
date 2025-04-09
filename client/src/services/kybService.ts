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
    if (this.initialized) return;
    
    this.templateId = templateId;
    
    // Fetch KYB fields from the API
    const kybFields = await this.getKybFields();
    
    // Group fields by section (group)
    const fieldGroups = this.groupFieldsBySection(kybFields);
    
    // Create sections from groups
    this.sections = Object.entries(fieldGroups).map(([groupName, groupFields], index) => {
      return {
        id: groupName,
        title: groupName,
        order: index,
        collapsed: false,
        fields: groupFields.map(field => this.convertToFormField(field))
      };
    });
    
    // Flatten all fields
    this.fields = this.sections.flatMap(section => section.fields);
    
    this.initialized = true;
  }
  
  /**
   * Fetches all KYB fields from the server, ordered by group and order
   * @returns Promise with an array of KYB fields
   */
  async getKybFields(): Promise<KybField[]> {
    try {
      // apiRequest already returns parsed JSON in our application
      const fields = await apiRequest('GET', '/api/kyb/fields');
      
      // Log to help debug
      const fieldsCount = Array.isArray(fields) ? fields.length : 0;
      console.log('[KYB Service] Successfully fetched KYB fields:', { count: fieldsCount });
      
      return Array.isArray(fields) ? fields : [];
    } catch (error) {
      console.error('Error fetching KYB fields:', error);
      return [];
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
      
      // Use our new API endpoint for fetching fields by step index
      // apiRequest already returns parsed JSON in our application
      const fields = await apiRequest('GET', `/api/form-fields/company_kyb/${stepIndex}`);
      
      // Safe check if fields is an array
      const fieldsArray = Array.isArray(fields) ? fields : [];
      console.log(`[KYB Service] Found ${fieldsArray.length} fields for step ${stepIndex}`);
      return fieldsArray;
    } catch (error) {
      console.error(`[KYB Service] Error fetching KYB fields for step ${stepIndex}:`, error);
      return [];
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
    this.formData = { ...data };
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
      // apiRequest already returns parsed JSON in our application
      return await apiRequest('POST', `/api/kyb/progress/${taskId}`, {
        progress,
        formData
      });
    } catch (error) {
      console.error('Error saving KYB progress:', error);
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
      // apiRequest already returns parsed JSON in our application
      const data = await apiRequest('GET', `/api/kyb/progress/${taskId}`);
      
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
      console.error('Error getting KYB progress:', error);
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
      const { formData } = await this.getKybProgress(taskId);
      this.loadFormData(formData);
      return formData;
    } catch (error) {
      console.error('Error loading KYB progress:', error);
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
      // apiRequest already returns parsed JSON in our application
      return await apiRequest('POST', `/api/kyb/submit/${taskId}`, {
        formData,
        fileName
      });
    } catch (error) {
      console.error('Error submitting KYB form:', error);
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