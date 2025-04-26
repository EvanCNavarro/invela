/**
 * Standardized KY3P Form Service
 * 
 * This service implements the FormServiceInterface for KY3P forms using
 * the standardized approach with string-based field keys.
 * 
 * It resolves the "Invalid field ID format" error by ensuring proper 
 * compatibility between KY3P form structure and the universal form interface.
 */

import type { FormData, FormField, FormSection, FormServiceInterface, FormSubmitOptions } from "./formService";
import getLogger from "@/utils/logger";
import { standardizedBulkUpdate } from "@/components/forms/standardized-ky3p-update";

const logger = getLogger('StandardizedKY3PFormService');

interface KY3PField {
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

export class StandardizedKY3PFormService implements FormServiceInterface {
  private taskId: number | null = null;
  private templateId: number | null = null;
  private formData: FormData = {};
  private fields: FormField[] = [];
  private sections: FormSection[] = [];
  private saveInProgress: boolean = false;
  private isInitialized: boolean = false;

  constructor(taskId?: number) {
    if (taskId) {
      this.taskId = taskId;
    }
    logger.info('Initialized standardized KY3P form service');
  }

  public async initialize(templateId: number): Promise<void> {
    this.templateId = templateId;
    
    try {
      // Load fields and transform them to match FormField interface
      const fields = await this.fetchFields();
      this.fields = this.transformFields(fields);
      
      // Generate sections from fields
      this.sections = this.generateSections(this.fields);
      
      // If we have a task ID, load saved data
      if (this.taskId) {
        this.formData = await this.loadProgress(this.taskId);
      }
      
      this.isInitialized = true;
      logger.info('KY3P form service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize KY3P form service:', error);
      throw new Error('Failed to initialize KY3P form service');
    }
  }

  private async fetchFields(): Promise<KY3PField[]> {
    const response = await fetch('/api/ky3p/fields');
    if (!response.ok) {
      throw new Error(`Failed to fetch KY3P fields: ${response.status}`);
    }
    return await response.json();
  }

  private transformFields(ky3pFields: KY3PField[]): FormField[] {
    return ky3pFields.map(field => ({
      key: field.field_key,
      label: field.display_name,
      type: field.field_type || 'TEXT',
      section: field.group || 'General',
      sectionId: field.group || 'General',
      helpText: field.description || '',
      question: field.question || field.display_name,
      questionNumber: field.step_index || 0,
      default: field.default_value || '',
      options: field.options || [],
      validation: {
        required: field.required || field.is_required || false,
        ...field.validation || {}
      },
      order: field.step_index || 0,
      metadata: {
        id: field.id,
        field_key: field.field_key,
        originalField: field
      }
    }));
  }

  private generateSections(fields: FormField[]): FormSection[] {
    const sectionMap: Record<string, FormSection> = {};
    
    fields.forEach(field => {
      const sectionId = field.section || 'General';
      
      if (!sectionMap[sectionId]) {
        sectionMap[sectionId] = {
          id: sectionId,
          title: sectionId,
          description: '',
          order: 0, // Will be adjusted later
          collapsed: false,
          fields: []
        };
      }
      
      sectionMap[sectionId].fields.push(field);
    });
    
    // Sort fields within each section by order
    Object.values(sectionMap).forEach(section => {
      section.fields.sort((a, b) => a.order - b.order);
      
      // Set section order based on first field in section
      if (section.fields.length > 0) {
        section.order = section.fields[0].order;
      }
    });
    
    // Convert to array and sort sections by order
    return Object.values(sectionMap).sort((a, b) => a.order - b.order);
  }

  // FormServiceInterface implementation
  public getFields(): FormField[] {
    return this.fields;
  }

  public getSections(): FormSection[] {
    return this.sections;
  }

  public loadFormData(data: FormData): void {
    this.formData = { ...data };
    logger.info(`Loaded form data with ${Object.keys(data).length} fields`);
  }

  public updateFormData(fieldKey: string, value: any, taskId?: number): void {
    this.formData[fieldKey] = value;
    
    // If taskId is provided, save immediately
    if (taskId && !this.saveInProgress) {
      this.saveField(fieldKey, value, taskId).catch(error => {
        logger.error(`Failed to save field ${fieldKey}:`, error);
      });
    }
  }

  private async saveField(fieldKey: string, value: any, taskId: number): Promise<boolean> {
    try {
      this.saveInProgress = true;
      
      const response = await fetch(`/api/ky3p/responses/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fieldIdRaw: fieldKey,
          responseValue: value,
          responseValueType: typeof value
        }),
      });
      
      if (!response.ok) {
        logger.error(`Failed to save field ${fieldKey}: ${await response.text()}`);
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error(`Error saving field ${fieldKey}:`, error);
      return false;
    } finally {
      this.saveInProgress = false;
    }
  }

  public getFormData(): FormData {
    return { ...this.formData };
  }

  public calculateProgress(): number {
    if (this.fields.length === 0) return 0;
    
    const requiredFields = this.fields.filter(field => 
      field.validation?.required || false
    );
    
    if (requiredFields.length === 0) return 1; // 100% if no required fields
    
    const completedRequiredFields = requiredFields.filter(field => {
      const value = this.formData[field.key];
      return value !== undefined && value !== null && value !== '';
    });
    
    return completedRequiredFields.length / requiredFields.length;
  }

  public async saveProgress(taskId?: number): Promise<void> {
    const effectiveTaskId = taskId || this.taskId;
    
    if (!effectiveTaskId) {
      throw new Error('No task ID provided for saving progress');
    }
    
    if (this.saveInProgress) {
      logger.warn('Save already in progress, skipping');
      return;
    }
    
    try {
      this.saveInProgress = true;
      
      // Use our standardized bulk update approach
      const success = await standardizedBulkUpdate(effectiveTaskId, this.formData);
      
      if (!success) {
        throw new Error('Failed to save progress');
      }
      
      logger.info(`Successfully saved progress for task ${effectiveTaskId}`);
    } catch (error) {
      logger.error('Error saving progress:', error);
      throw error;
    } finally {
      this.saveInProgress = false;
    }
  }

  public async loadProgress(taskId: number): Promise<FormData> {
    try {
      const response = await fetch(`/api/ky3p/responses/${taskId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load progress: ${response.status}`);
      }
      
      const data = await response.json();
      this.formData = data || {};
      
      logger.info(`Loaded progress for task ${taskId} with ${Object.keys(this.formData).length} fields`);
      return { ...this.formData };
    } catch (error) {
      logger.error('Error loading progress:', error);
      return {};
    }
  }

  public async save(options: FormSubmitOptions): Promise<boolean> {
    const { taskId = this.taskId } = options;
    
    if (!taskId) {
      throw new Error('No task ID provided for saving form');
    }
    
    try {
      await this.saveProgress(taskId);
      return true;
    } catch (error) {
      logger.error('Error saving form:', error);
      return false;
    }
  }

  public async submit(options: FormSubmitOptions): Promise<any> {
    const { taskId = this.taskId } = options;
    
    if (!taskId) {
      throw new Error('No task ID provided for submitting form');
    }
    
    try {
      // First save all progress
      await this.saveProgress(taskId);
      
      // Then submit the form
      const response = await fetch(`/api/ky3p/submit/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to submit form: ${response.status}`);
      }
      
      const result = await response.json();
      logger.info(`Successfully submitted form for task ${taskId}`);
      
      return result;
    } catch (error) {
      logger.error('Error submitting form:', error);
      throw error;
    }
  }

  public validate(data: FormData): boolean | Record<string, string> {
    const errors: Record<string, string> = {};
    
    this.fields.forEach(field => {
      const value = data[field.key];
      const { validation } = field;
      
      if (validation?.required && (value === undefined || value === null || value === '')) {
        errors[field.key] = `${field.label} is required`;
      }
      
      // Additional validation based on field type
      if (value !== undefined && value !== null && value !== '') {
        if (validation?.minLength && typeof value === 'string' && value.length < validation.minLength) {
          errors[field.key] = `${field.label} must be at least ${validation.minLength} characters`;
        }
        
        if (validation?.maxLength && typeof value === 'string' && value.length > validation.maxLength) {
          errors[field.key] = `${field.label} must be at most ${validation.maxLength} characters`;
        }
        
        if (validation?.pattern && typeof value === 'string') {
          const pattern = new RegExp(validation.pattern);
          if (!pattern.test(value)) {
            errors[field.key] = validation.message || `${field.label} is invalid`;
          }
        }
      }
    });
    
    return Object.keys(errors).length === 0 ? true : errors;
  }

  // Additional methods specific to KY3P forms
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
      logger.info(`Retrieved demo data with ${Object.keys(data).length} fields`);
      return data || {};
    } catch (error) {
      logger.error('Error getting KY3P demo data:', error);
      return {};
    }
  }

  // Helper method for clearing form data
  public clearCache(): void {
    this.formData = {};
    logger.info('Form data cache cleared');
  }

  public getIsProgressiveLoading(): boolean {
    return false; // KY3P doesn't use progressive loading
  }

  public async loadSection(sectionId: string): Promise<FormField[]> {
    // For compatibility with FormServiceInterface
    return this.fields.filter(field => field.section === sectionId);
  }
}