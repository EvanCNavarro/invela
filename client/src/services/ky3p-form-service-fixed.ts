/**
 * Fixed KY3P Form Service
 * 
 * This is an enhanced version of the KY3P Form Service that uses
 * standardized string-based field keys for bulk updates, ensuring
 * compatibility with the standardized approach used across
 * all form types (KYB, KY3P, and Open Banking).
 */

import type { FormField, FormSection, FormServiceInterface, FormData, FormSubmitOptions } from "./formService";
import getLogger from "@/utils/logger";
import { standardizedBulkUpdate } from "@/components/forms/standardized-ky3p-update";

const logger = getLogger('KY3P-Form-Service-Fixed');

// Type for KY3P fields from API
interface KY3PFieldDefinition {
  id: number; 
  field_key: string;
  display_name: string;
  field_type: string;
  group: string;
  required: boolean;
  is_required?: boolean;
  step_index?: number;
  validation?: any;
  options?: any;
  [key: string]: any;
}

/**
 * Standardized KY3P Form Service that ensures proper update handling
 */
export class KY3PFormServiceFixed implements FormServiceInterface {
  private taskId: number | null = null;
  private templateId: number | null = null;
  private isReady: boolean = false;
  private saveInProgress: boolean = false;
  private fieldData: FormData = {};
  private fields: FormField[] = [];
  private sections: FormSection[] = [];

  constructor(taskId?: number) {
    if (taskId) {
      this.setTaskId(taskId);
    }
    logger.info('Initialized fixed KY3P form service with standardized update handlers');
  }

  public setTaskId(taskId: number): void {
    this.taskId = taskId;
    logger.info(`Task ID set to ${taskId}`);
  }

  public async initialize(templateId: number): Promise<void> {
    this.templateId = templateId;
    
    try {
      // Fetch the fields
      const ky3pFields = await this.fetchFields();
      
      // Transform KY3P fields to FormField format
      this.fields = this.mapToFormFields(ky3pFields);
      
      // Generate sections
      this.sections = this.generateSections(this.fields);
      
      // Load responses if we have a task ID
      if (this.taskId) {
        await this.loadProgress(this.taskId);
      }
      
      this.isReady = true;
      logger.info('KY3P form service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize KY3P form service:', error);
      throw new Error('Failed to initialize KY3P form service');
    }
  }
  
  private async fetchFields(): Promise<KY3PFieldDefinition[]> {
    try {
      if (!this.taskId) {
        throw new Error('No task ID set');
      }

      const response = await fetch(`/api/ky3p/fields`);
      
      if (!response.ok) {
        throw new Error(`Failed to get KY3P fields: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      logger.error('Error getting KY3P fields:', error);
      return [];
    }
  }

  // Helper method to convert KY3P fields to FormField format
  private mapToFormFields(ky3pFields: KY3PFieldDefinition[]): FormField[] {
    return ky3pFields.map((field, index) => ({
      key: field.field_key || `field_${field.id}`,
      label: field.display_name || `Field ${field.id}`,
      type: field.field_type || 'text',
      section: field.group || 'General',
      sectionId: field.group || 'General',
      helpText: field.help_text || '',
      options: field.options ? 
        (Array.isArray(field.options) ? 
          field.options.map(opt => ({ label: opt.label || opt, value: opt.value || opt })) : 
          []
        ) : [],
      validation: {
        required: field.required || false,
        ...field.validation
      },
      order: field.step_index || index,
      metadata: {
        originalId: field.id,
        apiKey: field.field_key || `field_${field.id}`
      }
    }));
  }
  
  // Helper method to generate sections from fields
  private generateSections(fields: FormField[]): FormSection[] {
    const groupedFields: Record<string, FormSection> = {};
    
    fields.forEach(field => {
      const sectionId = field.section || 'General';
      
      if (!groupedFields[sectionId]) {
        groupedFields[sectionId] = {
          id: sectionId,
          title: sectionId,
          fields: [],
          order: 0,
          collapsed: false
        };
      }
      
      groupedFields[sectionId].fields.push(field);
    });
    
    // Sort sections by their first field's order
    return Object.values(groupedFields)
      .map(section => ({
        ...section,
        order: Math.min(...section.fields.map(f => f.order || 0))
      }))
      .sort((a, b) => a.order - b.order);
  }
  
  // Implement required methods for FormServiceInterface
  public getFields(): FormField[] {
    return this.fields;
  }
  
  public getSections(): FormSection[] {
    return this.sections;
  }

  public async getResponses(): Promise<Record<string, any>> {
    try {
      if (!this.taskId) {
        throw new Error('No task ID set');
      }
      
      const response = await fetch(`/api/ky3p/responses/${this.taskId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get KY3P responses: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      this.fieldData = data || {};
      
      return data || {};
    } catch (error) {
      logger.error('Error getting KY3P responses:', error);
      return {};
    }
  }

  public async getProgress(): Promise<{ status: string; progress: number; }> {
    try {
      if (!this.taskId) {
        throw new Error('No task ID set');
      }
      
      const response = await fetch(`/api/ky3p/progress/${this.taskId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get KY3P progress: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return {
        status: data.status || 'not_started',
        progress: data.progress || 0
      };
    } catch (error) {
      logger.error('Error getting KY3P progress:', error);
      return {
        status: 'not_started',
        progress: 0
      };
    }
  }

  public async getDemoData(taskId?: number): Promise<Record<string, any>> {
    try {
      const effectiveTaskId = taskId || this.taskId;
      
      if (!effectiveTaskId) {
        throw new Error('No task ID set');
      }
      
      const response = await fetch(`/api/ky3p/demo-autofill/${effectiveTaskId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get KY3P demo data: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data || {};
    } catch (error) {
      logger.error('Error getting KY3P demo data:', error);
      return {};
    }
  }

  public async saveField(fieldId: string, value: any): Promise<boolean> {
    try {
      if (!this.taskId) {
        throw new Error('No task ID set');
      }
      
      // Update the local field data
      this.fieldData[fieldId] = value;
      
      const response = await fetch(`/api/ky3p/responses/${this.taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fieldIdRaw: fieldId,
          responseValue: value,
          responseValueType: typeof value
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save KY3P field: ${response.status} ${response.statusText}`);
      }
      
      return true;
    } catch (error) {
      logger.error(`Error saving KY3P field ${fieldId}:`, error);
      return false;
    }
  }

  public async saveAllFields(formData: Record<string, any>): Promise<boolean> {
    logger.info(`Saving all fields for task ${this.taskId} using standardized bulk update`);
    
    if (!this.taskId) {
      logger.error('No task ID set');
      return false;
    }
    
    // To avoid duplicate saves
    if (this.saveInProgress) {
      logger.warn('Save already in progress, skipping');
      return false;
    }
    
    try {
      this.saveInProgress = true;
      
      // First attempt our fixed standardized bulk update
      const success = await standardizedBulkUpdate(this.taskId, formData);
      
      if (success) {
        logger.info('Successfully saved all fields using standardized bulk update');
        return true;
      }
      
      // If that fails, try the legacy approach with manual field-by-field updates
      logger.warn('Standardized bulk update failed, falling back to field-by-field updates');
      
      let allSaved = true;
      
      for (const [key, value] of Object.entries(formData)) {
        if (key.startsWith('_') || key === 'taskId') {
          continue; // Skip metadata fields
        }
        
        const saved = await this.saveField(key, value);
        
        if (!saved) {
          allSaved = false;
        }
      }
      
      return allSaved;
    } catch (error) {
      logger.error('Error saving all KY3P fields:', error);
      return false;
    } finally {
      this.saveInProgress = false;
    }
  }

  public async submitForm(): Promise<boolean> {
    try {
      if (!this.taskId) {
        throw new Error('No task ID set');
      }
      
      const response = await fetch(`/api/ky3p/submit/${this.taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to submit KY3P form: ${response.status} ${response.statusText}`);
      }
      
      return true;
    } catch (error) {
      logger.error('Error submitting KY3P form:', error);
      return false;
    }
  }

  // Implement required methods for FormServiceInterface
  public loadFormData(data: FormData): void {
    this.fieldData = { ...data };
    logger.info('Form data loaded:', Object.keys(data).length);
  }
  
  public updateFormData(fieldKey: string, value: any, taskId?: number): void {
    this.fieldData[fieldKey] = value;
    
    if (taskId || this.taskId) {
      // Trigger save if a task ID is available
      this.saveField(fieldKey, value).catch(error => {
        logger.error(`Error auto-saving field ${fieldKey}:`, error);
      });
    }
  }
  
  public getFormData(): FormData {
    return { ...this.fieldData };
  }
  
  public calculateProgress(): number {
    if (!this.fields.length) {
      return 0;
    }
    
    const requiredFields = this.fields.filter(field => 
      field.validation?.required || (field.validation as any)?.isRequired
    );
    
    if (!requiredFields.length) {
      // If no required fields, calculate based on all fields
      const filledCount = Object.keys(this.fieldData).length;
      return Math.min(100, Math.round((filledCount / this.fields.length) * 100));
    }
    
    // Count filled required fields
    const filledRequiredCount = requiredFields.filter(field => 
      this.fieldData[field.key] !== undefined && 
      this.fieldData[field.key] !== null && 
      this.fieldData[field.key] !== ''
    ).length;
    
    return Math.min(100, Math.round((filledRequiredCount / requiredFields.length) * 100));
  }
  
  public async saveProgress(taskId?: number): Promise<void> {
    const effectiveTaskId = taskId || this.taskId;
    
    if (!effectiveTaskId) {
      throw new Error('No task ID set for saving progress');
    }
    
    await this.saveAllFields(this.fieldData);
  }
  
  public async loadProgress(taskId: number): Promise<FormData> {
    this.taskId = taskId;
    
    try {
      const responses = await this.getResponses();
      this.fieldData = responses;
      return responses;
    } catch (error) {
      logger.error('Error loading progress:', error);
      return {};
    }
  }
  
  public async save(options: FormSubmitOptions): Promise<boolean> {
    const taskId = options.taskId || this.taskId;
    
    if (!taskId) {
      throw new Error('No task ID set for saving');
    }
    
    return this.saveAllFields(this.fieldData);
  }
  
  public async submit(options: FormSubmitOptions): Promise<any> {
    const taskId = options.taskId || this.taskId;
    
    if (!taskId) {
      throw new Error('No task ID set for submission');
    }
    
    // First save all fields
    const saveResult = await this.saveAllFields(this.fieldData);
    
    if (!saveResult) {
      throw new Error('Failed to save fields before submission');
    }
    
    // Then submit the form
    return this.submitForm();
  }
  
  public validate(data: FormData): boolean | Record<string, string> {
    const errors: Record<string, string> = {};
    
    for (const field of this.fields) {
      const value = data[field.key];
      const validation = field.validation;
      
      if (!validation) continue;
      
      // Check required fields
      if ((validation.required || (validation as any).isRequired) && 
          (value === undefined || value === null || value === '')) {
        errors[field.key] = validation.message || 'This field is required';
        continue;
      }
      
      // Check string length
      if (typeof value === 'string') {
        if (validation.minLength && value.length < validation.minLength) {
          errors[field.key] = validation.message || `Minimum length is ${validation.minLength} characters`;
        }
        
        if (validation.maxLength && value.length > validation.maxLength) {
          errors[field.key] = validation.message || `Maximum length is ${validation.maxLength} characters`;
        }
        
        if (validation.pattern) {
          const pattern = new RegExp(validation.pattern);
          if (!pattern.test(value)) {
            errors[field.key] = validation.message || 'Value does not match the required pattern';
          }
        }
      }
      
      // Check numeric values
      if (typeof value === 'number') {
        if (validation.min !== undefined && value < validation.min) {
          errors[field.key] = validation.message || `Minimum value is ${validation.min}`;
        }
        
        if (validation.max !== undefined && value > validation.max) {
          errors[field.key] = validation.message || `Maximum value is ${validation.max}`;
        }
      }
    }
    
    return Object.keys(errors).length > 0 ? errors : true;
  }
  
  // Implementation for FormServiceInterface
  public loadSection(sectionId: string): FormField[] {
    // KY3P form doesn't use progressive loading
    // Return all fields that belong to the given section
    return this.fields.filter(field => field.section === sectionId || field.sectionId === sectionId);
  }
  
  // Optional method to implement clearing the cache
  public clearCache(): void {
    this.fieldData = {};
    this.isReady = false;
    logger.info('Form service cache cleared');
  }

  // Added for compatibility with FormServiceInterface
  public getIsProgressiveLoading(): boolean {
    return false; // KY3P form doesn't use progressive loading
  }

  // Bulk update method - now uses standardized approach
  public async bulkUpdate(formData: Record<string, any>): Promise<boolean> {
    logger.info(`Bulk updating KY3P form for task ${this.taskId}`);
    
    if (!this.taskId) {
      logger.error('No task ID set for bulk update');
      return false;
    }
    
    // Use our fixed standardized bulk update function
    try {
      const success = await standardizedBulkUpdate(this.taskId, formData);
      
      if (success) {
        logger.info('Successfully bulk updated KY3P form using standardized approach');
      } else {
        logger.error('Failed to bulk update KY3P form using standardized approach');
      }
      
      return success;
    } catch (error) {
      logger.error('Error in bulk update:', error);
      return false;
    }
  }
}