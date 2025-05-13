import { FormData, FormField, FormSection, FormServiceInterface, FormSubmitOptions } from './formService';
import { sortFields, getFieldComponentType } from '../utils/formUtils';
import getLogger from '../utils/logger';

/**
 * Represents a KYB field from the database
 */
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

/**
 * Response structure for KYB progress data
 */
export interface KybProgressResponse {
  formData: Record<string, any>;
  progress: number;
  status?: string;
}

/**
 * KYB Form Service - Clean Implementation
 * Handles loading, saving and submitting KYB form data
 */
export class KybFormService implements FormServiceInterface {
  private fields: FormField[] = [];
  private sections: FormSection[] = [];
  private formData: Record<string, any> = {};
  private initialized = false;
  private templateId: number | null = null;
  private logger = getLogger('KYB Service');
  
  // Static cache for fields to prevent redundant API calls
  private static fieldsCache: Record<number, KybField[]> = {};
  
  /**
   * Initialize the KYB form service
   * @param templateId ID of the task template
   */
  async initialize(templateId: number): Promise<void> {
    if (this.initialized && this.templateId === templateId) {
      return; // Already initialized with this template
    }

    try {
      this.templateId = templateId;
      
      // Fetch KYB fields from the server or cache
      const fields = await this.getKybFields();
      
      // Convert fields to form fields and organize into sections
      this.fields = fields.map(field => this.convertToFormField(field));
      
      // Group fields by section name
      const groupedFields = this.groupFieldsBySection(fields);
      
      // Create sections from grouped fields
      this.sections = Object.entries(groupedFields).map(([sectionName, sectionFields], index) => ({
        id: index + 1,
        name: sectionName,
        description: '',
        fields: sectionFields.map(field => this.convertToFormField(field))
      }));
      
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing KYB form service:', error);
      throw error;
    }
  }

  /**
   * Fetches KYB fields from the server or cache
   */
  async getKybFields(): Promise<KybField[]> {
    // Use cache if available
    if (this.templateId && KybFormService.fieldsCache[this.templateId]) {
      return KybFormService.fieldsCache[this.templateId];
    }
    
    try {
      // Simple fetch without all the timeout complexity
      const response = await fetch('/api/kyb/fields');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch KYB fields: ${response.status}`);
      }
      
      const fields = await response.json();
      
      // Sort fields by group and then by order
      const sortedFields = sortFields(fields);
      
      // Cache the fields
      if (this.templateId) {
        KybFormService.fieldsCache[this.templateId] = sortedFields;
      }
      
      return sortedFields;
    } catch (error) {
      console.error('Error fetching KYB fields:', error);
      throw error;
    }
  }

  /**
   * Get KYB fields for a specific step/section
   */
  async getKybFieldsByStepIndex(stepIndex: number): Promise<KybField[]> {
    const fields = await this.getKybFields();
    
    // Group fields by section name
    const groupedFields = this.groupFieldsBySection(fields);
    
    // Get section names in order
    const sectionNames = Object.keys(groupedFields);
    
    // Get the section name for the requested step index
    const sectionName = sectionNames[stepIndex - 1];
    
    // Return fields for the section or empty array if section doesn't exist
    return sectionName ? groupedFields[sectionName] : [];
  }

  /**
   * Group KYB fields by their section name
   */
  groupFieldsBySection(fields: KybField[]): Record<string, KybField[]> {
    // Standard section names we want to use
    const sectionMap = {
      'companyProfile': 'Company Profile',
      'companyprofile': 'Company Profile',
      'company_profile': 'Company Profile',
      'company profile': 'Company Profile',
      
      'governanceLeadership': 'Governance & Leadership',
      'governanceleadership': 'Governance & Leadership',
      'governance_leadership': 'Governance & Leadership',
      'governance leadership': 'Governance & Leadership',
      
      'financialProfile': 'Financial Profile',
      'financialprofile': 'Financial Profile',
      'financial_profile': 'Financial Profile',
      'financial profile': 'Financial Profile',
      
      'operationsCompliance': 'Operations & Compliance',
      'operationscompliance': 'Operations & Compliance',
      'operations_compliance': 'Operations & Compliance',
      'operations compliance': 'Operations & Compliance'
    };
    
    // Group fields by their normalized section name
    const grouped: Record<string, KybField[]> = {};
    
    fields.forEach(field => {
      const rawGroup = field.group || 'Other';
      // Normalize the group name using our mapping
      const normalizedGroup = sectionMap[rawGroup.toLowerCase().replace(/[^a-z0-9]/g, '')] || rawGroup;
      
      if (!grouped[normalizedGroup]) {
        grouped[normalizedGroup] = [];
      }
      
      grouped[normalizedGroup].push(field);
    });
    
    // Return the grouped fields
    return grouped;
  }

  /**
   * Convert KYB field to form field format
   */
  convertToFormField(field: KybField): FormField {
    return {
      id: field.id,
      key: field.field_key,
      label: field.display_name,
      type: getFieldComponentType(field.field_type),
      required: field.required,
      question: field.question,
      order: field.order,
      validation: field.validation_rules,
      helpText: field.help_text,
      placeholder: '',
      value: this.formData[field.field_key] || ''
    };
  }

  /**
   * Get all form fields
   */
  getFields(): FormField[] {
    return this.fields;
  }

  /**
   * Get all form sections
   */
  getSections(): FormSection[] {
    return this.sections;
  }

  /**
   * Load form data
   */
  loadFormData(data: Record<string, any>): void {
    this.formData = { ...data };
    
    // Update field values with loaded data
    this.fields = this.fields.map(field => ({
      ...field,
      value: data[field.key] !== undefined ? data[field.key] : field.value
    }));
    
    // Update section field values
    this.sections = this.sections.map(section => ({
      ...section,
      fields: section.fields.map(field => ({
        ...field,
        value: data[field.key] !== undefined ? data[field.key] : field.value
      }))
    }));
  }

  /**
   * Update form data for a specific field
   */
  updateFormData(fieldKey: string, value: any): void {
    this.formData[fieldKey] = value;
    
    // Update the field value in fields array
    this.fields = this.fields.map(field => 
      field.key === fieldKey ? { ...field, value } : field
    );
    
    // Update the field value in sections
    this.sections = this.sections.map(section => ({
      ...section,
      fields: section.fields.map(field => 
        field.key === fieldKey ? { ...field, value } : field
      )
    }));
  }

  /**
   * Get current form data
   */
  getFormData(): Record<string, any> {
    return this.formData;
  }

  /**
   * Calculate form completion progress
   */
  calculateProgress(): number {
    const requiredFields = this.fields.filter(field => field.required);
    if (requiredFields.length === 0) return 100;
    
    const filledRequiredFields = requiredFields.filter(field => {
      const value = this.formData[field.key];
      return value !== undefined && value !== null && value !== '';
    });
    
    return Math.round((filledRequiredFields.length / requiredFields.length) * 100);
  }

  /**
   * Save form progress
   */
  async saveProgress(taskId?: number): Promise<void> {
    if (!taskId) {
      console.error("Task ID is required to save progress");
      return;
    }
    
    try {
      const progress = this.calculateProgress();
      await this.saveKybProgress(taskId, progress, this.formData);
    } catch (error) {
      console.error('Error saving progress:', error);
      // Silent failure to allow user to continue working
    }
  }

  /**
   * Save KYB progress to the server
   * Clean implementation with proper error handling
   */
  async saveKybProgress(taskId: number, progress: number, formData: Record<string, any>) {
    try {
      const response = await fetch(`/api/kyb/progress`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          taskId,
          progress,
          formData
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error saving form data: ${response.status} - ${errorText}`);
        return {
          success: false,
          error: `Failed to save: ${response.status}`
        };
      }
      
      return await response.json();
    } catch (error) {
      console.error('Network error while saving form data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Get KYB progress from the server
   * Clean implementation with proper error handling
   */
  async getKybProgress(taskId: number): Promise<KybProgressResponse> {
    try {
      const response = await fetch(`/api/kyb/progress/${taskId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error(`Error loading form data: ${response.status}`);
        return { formData: {}, progress: 0 };
      }
      
      const data = await response.json();
      return {
        formData: data.formData || {},
        progress: data.progress || 0,
        status: data.status
      };
    } catch (error) {
      console.error('Network error while loading form data:', error);
      return { formData: {}, progress: 0 };
    }
  }

  /**
   * Load saved progress for a task
   */
  async loadProgress(taskId: number): Promise<Record<string, any>> {
    try {
      // Get current form data before loading - we'll use this if the API call fails
      const currentFormData = this.formData;
      
      // Get progress data from the server
      const progressData = await this.getKybProgress(taskId);
      const { formData } = progressData;
      
      // If no data was returned but we have existing data, keep the current data
      if (!formData || Object.keys(formData).length === 0) {
        if (Object.keys(currentFormData).length > 0) {
          return currentFormData;
        }
        
        this.loadFormData({});
        return {};
      }
      
      // Load the form data
      this.loadFormData(formData);
      return formData;
    } catch (error) {
      console.error(`Error loading progress for task ${taskId}:`, error);
      
      // If we already have data, keep it
      if (Object.keys(this.formData).length > 0) {
        return this.formData;
      }
      
      // Fall back to empty object
      this.loadFormData({});
      return {};
    }
  }

  /**
   * Save the form
   */
  async save(options: FormSubmitOptions): Promise<boolean> {
    if (!options.taskId) {
      throw new Error('Task ID is required to save the form');
    }
    
    try {
      // Save progress using the simple method
      await this.saveProgress(options.taskId);
      return true;
    } catch (error) {
      console.error('Error saving form:', error);
      return false;
    }
  }

  /**
   * Submit the completed form
   */
  async submit(options: FormSubmitOptions): Promise<any> {
    if (!options.taskId) {
      throw new Error('Task ID is required to submit the form');
    }
    
    try {
      return await this.submitKybForm(options.taskId, this.formData, options.fileName);
    } catch (error) {
      console.error('Error submitting form:', error);
      throw error;
    }
  }

  /**
   * Submit the KYB form to the server
   */
  async submitKybForm(taskId: number, formData: Record<string, any>, fileName?: string) {
    try {
      const response = await fetch(`/api/kyb/submit/${taskId}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          formData,
          fileName
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to submit form: ${response.status} ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error submitting form:', error);
      throw error;
    }
  }

  /**
   * Validate form data
   */
  validate(data: FormData): boolean | Record<string, string> {
    const errors: Record<string, string> = {};
    
    for (const field of this.fields) {
      const { key, validation, label } = field;
      const value = data[key];
      
      // Skip fields without validation rules
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