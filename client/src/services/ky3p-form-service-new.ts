/**
 * Enhanced KY3P Form Service
 * 
 * This is a clean implementation of the KY3P form service with proper
 * demo autofill capabilities and comprehensive logging for debugging.
 */

// Import WebSocket service from the correct path
import { getWebSocketService } from '@/lib/webSocketClient';
import { ky3pFields } from '@db/schema';
import type { FormField, FormSection, FormStatus } from '@/types/form';
import type { FormServiceInterface, FormData } from '@/services/formService';

// Type definitions
export interface KY3PResponse {
  id: number;
  fieldKey: string;
  response: string;
  status: string;
}

export interface KY3PField {
  id: number;
  key?: string;
  field_key?: string; // Database uses field_key, frontend code uses key
  display_name: string;
  question: string;
  type?: string;
  field_type?: string; // Database uses field_type
  group: string;
  is_required: boolean;
  help_text?: string;
  demo_autofill?: string;
  order?: number;
  step_index?: number;
}

export class KY3PFormService implements FormServiceInterface {
  private fields: FormField[] = [];
  private sections: FormSection[] = [];
  private initialized = false;
  private taskId: number | null = null;
  private companyId: number | null = null;
  private logger: (message: string, context?: any) => void;
  private autoSaveEnabled: boolean = true;

  constructor(taskId: number, companyId: number) {
    this.taskId = taskId;
    this.companyId = companyId;
    this.logger = (message, context) => {
      if (context) {
        console.log(`%c[KY3P Service] ${message}`, 'color: #9c27b0', context);
      } else {
        console.log(`%c[KY3P Service] ${message}`, 'color: #9c27b0');
      }
    };
    
    this.logger(`Initializing KY3P Form Service for task ${taskId}, company ${companyId}`);
  }

  /**
   * Initialize form data by loading fields and sections
   */
  async initialize(): Promise<boolean> {
    try {
      this.logger('Starting initialization...');
      
      if (this.initialized) {
        this.logger('Already initialized, skipping');
        return true;
      }
      
      if (!this.taskId || this.taskId <= 0) {
        this.logger('Warning: Invalid task ID, will use actual ID from URL');
        // Extract the actual task ID from URL
        const urlMatch = window.location.pathname.match(/\/task-center\/task\/(\d+)/);
        if (urlMatch && urlMatch[1]) {
          const actualTaskId = parseInt(urlMatch[1], 10);
          this.logger(`Found actual task ID from URL: ${actualTaskId}`);
          this.taskId = actualTaskId;
        } else {
          this.logger('Could not determine task ID from URL, falling back to checking task center');
          const taskCenterMatch = window.location.pathname.match(/\/task-center\/task\/(\d+)/);
          if (taskCenterMatch && taskCenterMatch[1]) {
            const taskCenterId = parseInt(taskCenterMatch[1], 10);
            this.logger(`Found task ID from task center URL: ${taskCenterId}`);
            this.taskId = taskCenterId;
          }
        }
      }

      // Load fields from API
      await this.loadFields();
      
      // Generate sections from fields
      this.generateSections();
      
      this.initialized = true;
      this.logger('Initialization completed successfully');
      return true;
    } catch (error) {
      this.logger('Initialization failed with error', error);
      return false;
    }
  }

  /**
   * Load fields from the API
   */
  private async loadFields(): Promise<void> {
    try {
      this.logger(`Loading fields for task ${this.taskId}...`);
      
      // First load field definitions
      const fieldDefinitionsResponse = await fetch('/api/ky3p/fields');
      
      if (!fieldDefinitionsResponse.ok) {
        throw new Error(`Failed to load field definitions: ${fieldDefinitionsResponse.status}`);
      }
      
      // Safely parse field definitions with error handling
      let fieldDefinitions: KY3PField[] = [];
      
      try {
        const fieldDefsText = await fieldDefinitionsResponse.text();
        // Check if content is HTML instead of JSON
        if (fieldDefsText.includes('<!DOCTYPE html>')) {
          this.logger('Warning: Received HTML instead of JSON for field definitions');
          throw new Error('Received HTML instead of JSON for field definitions');
        } 
        
        fieldDefinitions = JSON.parse(fieldDefsText);
        this.logger(`Successfully loaded ${fieldDefinitions.length} field definitions`);
      } catch (parseError) {
        this.logger('Error parsing field definitions:', parseError);
        fieldDefinitions = [];
      }
      
      // Now load field responses - handle HTML responses gracefully
      let fieldResponses: KY3PResponse[] = [];
      
      try {
        const fieldResponsesResponse = await fetch(`/api/ky3p/responses/${this.taskId}`);
        
        if (fieldResponsesResponse.ok) {
          const contentType = fieldResponsesResponse.headers.get('content-type');
          const fieldRespText = await fieldResponsesResponse.text();
          
          // If the response contains HTML, it's probably an error page, not a JSON response
          if (fieldRespText.includes('<!DOCTYPE html>')) {
            this.logger('Field responses raw response:', fieldRespText.substring(0, 200) + '...');
            this.logger('Error parsing field responses: Received HTML instead of JSON');
            fieldResponses = [];
          } else if (contentType && contentType.includes('application/json')) {
            // It's a valid JSON response
            fieldResponses = JSON.parse(fieldRespText);
            this.logger(`Successfully loaded ${fieldResponses.length} field responses`);
          } else {
            // Try to parse it anyway
            try {
              fieldResponses = JSON.parse(fieldRespText);
              this.logger(`Parsed ${fieldResponses.length} responses from non-JSON response`);
            } catch (jsonError) {
              this.logger('Error parsing field responses:', jsonError);
              fieldResponses = [];
            }
          }
        } else {
          this.logger(`Failed to load field responses: ${fieldResponsesResponse.status}. Continuing with empty responses.`);
          fieldResponses = [];
        }
      } catch (error) {
        this.logger('Error fetching field responses:', error);
        fieldResponses = [];
      }
      
      this.logger(`Loaded ${fieldDefinitions.length} field definitions and ${fieldResponses.length} responses`);
      
      // Map responses to a lookup object - handle different field naming conventions
      const responsesLookup: Record<string, KY3PResponse> = {};
      fieldResponses.forEach(response => {
        // Handle different field naming between frontend and backend
        const fieldKey = response.fieldKey || response.field_key;
        if (fieldKey) {
          responsesLookup[fieldKey] = response;
        }
      });
      
      // Convert fields to our internal format
      this.fields = fieldDefinitions.map(field => {
        // Handle field key differences between DB (field_key) and frontend (key)
        const fieldKey = field.key || field.field_key;
        
        if (!fieldKey) {
          this.logger(`Warning: Field ${field.id} has no key property, skipping`, field);
          return null;
        }
        
        // Get response using the field key
        const response = responsesLookup[fieldKey];
        
        // Determine field type - database uses field_type, frontend uses type
        const fieldType = field.type || field.field_type || 'TEXT';
        
        return {
          id: field.id,
          key: fieldKey,
          label: field.display_name,
          description: field.question,
          type: fieldType.toLowerCase(),
          section: this.getSectionIdFromGroup(field.group),
          required: field.is_required,
          value: response?.response || response?.response_value || '',
          status: response?.status || 'incomplete',
          helpText: field.help_text || '',
          demoAutofill: field.demo_autofill || '',
          // Additional properties
          order: field.order || 0, // Use order from DB if available, otherwise it will be set during section generation
          stepIndex: field.step_index || 0,
          validation: {
            type: 'string',
            rules: field.is_required ? { required: true } : {}
          }
        };
      });
      
      this.logger('Field loading completed');
    } catch (error) {
      this.logger('Error loading fields', error);
      throw error;
    }
  }

  /**
   * Convert a group name to a section ID
   */
  private getSectionIdFromGroup(group: string): string {
    // Remove special characters, replace spaces with hyphens, and lowercase
    const sectionId = group
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase();
    
    return `section-${sectionId}`;
  }

  /**
   * Generate sections from field data
   */
  private generateSections(): void {
    try {
      this.logger('Generating sections from field data...');
      
      // Filter out any null fields (from failed mapping)
      this.fields = this.fields.filter(field => field !== null);
      
      if (this.fields.length === 0) {
        this.logger('No valid fields to generate sections from');
        this.sections = [];
        return;
      }
      
      // Group fields by section
      const sectionMap = new Map<string, FormField[]>();
      
      for (const field of this.fields) {
        if (!field.section) {
          this.logger(`Field ${field.key} has no section defined, skipping`);
          continue;
        }
        
        if (!sectionMap.has(field.section)) {
          sectionMap.set(field.section, []);
        }
        
        sectionMap.get(field.section)?.push(field);
      }
      
      // Sort fields within each section and assign order
      for (const [sectionId, fields] of sectionMap.entries()) {
        fields.sort((a, b) => a.id - b.id);
        
        // Assign order within section
        fields.forEach((field, index) => {
          field.order = index + 1;
        });
      }
      
      // Create sections array
      this.sections = Array.from(sectionMap.entries()).map(([sectionId, fields], index) => {
        // Extract section name from the first field's group
        const sectionField = fields[0];
        const sectionNameMatch = sectionId.match(/section-(.*)/);
        const sectionName = sectionNameMatch ? sectionNameMatch[1].replace(/-/g, ' ') : `Section ${index + 1}`;
        
        return {
          id: sectionId,
          title: sectionName.charAt(0).toUpperCase() + sectionName.slice(1),
          description: '',
          fields: fields.map(f => f.key),
          order: index + 1,
          status: this.calculateSectionStatus(fields)
        };
      });
      
      // Sort sections by order
      this.sections.sort((a, b) => a.order - b.order);
      
      this.logger(`Generated ${this.sections.length} sections`);
      this.sections.forEach(section => {
        this.logger(`Section "${section.title}" (${section.id}) with ${section.fields.length} fields`);
      });
    } catch (error) {
      this.logger('Error generating sections', error);
      throw error;
    }
  }

  /**
   * Calculate the status of a section based on its fields
   */
  private calculateSectionStatus(fields: FormField[]): FormStatus {
    const requiredFields = fields.filter(f => f.required);
    const completedRequiredFields = requiredFields.filter(f => f.status === 'complete');
    
    if (completedRequiredFields.length === requiredFields.length) {
      return 'complete';
    } else if (completedRequiredFields.length > 0) {
      return 'in-progress';
    } else {
      return 'incomplete';
    }
  }

  /**
   * Get fields for the form
   */
  getFields(): FormField[] {
    return this.fields;
  }

  /**
   * Get sections for the form
   */
  getSections(): FormSection[] {
    return this.sections;
  }

  /**
   * Get demo data for autofill
   */
  async getDemoData(): Promise<Record<string, any>> {
    try {
      this.logger('Fetching demo data for KY3P form');
      
      // Ensure fields are loaded
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Create a demo data object
      const demoData: Record<string, any> = {};
      
      // Loop through each field and populate with its demo value
      this.fields.forEach(field => {
        if (field.key && field.demoAutofill) {
          demoData[field.key] = field.demoAutofill;
          this.logger(`Demo data for field ${field.key}: ${field.demoAutofill}`);
        }
      });
      
      // Log the complete demo data being returned
      this.logger('Demo data prepared', demoData);
      
      return demoData;
    } catch (error) {
      this.logger('Error fetching demo data', error);
      throw error;
    }
  }

  /**
   * Update field value
   */
  async updateField(key: string, value: any): Promise<boolean> {
    try {
      this.logger(`Updating field ${key} with value: ${value}`);
      
      if (!this.taskId) {
        this.logger('Cannot update field - no taskId available');
        return false;
      }
      
      // Find the field
      const field = this.fields.find(f => f.key === key);
      
      if (!field) {
        this.logger(`Field ${key} not found`);
        return false;
      }
      
      // Update field locally
      field.value = value;
      field.status = 'complete';
      
      // Update sections status
      this.updateSectionStatuses();
      
      // Notify WebSocket about field update
      this.notifyFieldUpdate(key, value);
      
      return true;
    } catch (error) {
      this.logger(`Error updating field ${key}`, error);
      return false;
    }
  }

  /**
   * Perform bulk update of fields
   */
  async bulkUpdateFields(data: Record<string, any>): Promise<boolean> {
    try {
      this.logger('Performing bulk update with data', data);
      
      if (!this.taskId) {
        this.logger('Cannot update fields - no taskId available');
        return false;
      }
      
      // Prepare the payload in the format the server expects
      const payload = {
        taskId: this.taskId,
        formData: data
      };
      
      // Make the bulk update API call
      const response = await fetch(`/api/ky3p/bulk-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      // Check if the request was successful
      if (!response.ok) {
        const errorText = await response.text();
        this.logger(`Bulk update failed: ${response.status} - ${errorText}`);
        return false;
      }
      
      const result = await response.json();
      this.logger('Bulk update successful', result);
      
      // Update local field values for UI
      for (const [key, value] of Object.entries(data)) {
        this.updateLocalField(key, value);
      }
      
      // Update section statuses
      this.updateSectionStatuses();
      
      return true;
    } catch (error) {
      this.logger('Error in bulk update', error);
      return false;
    }
  }

  /**
   * Update local field state
   */
  private updateLocalField(key: string, value: any): void {
    const field = this.fields.find(f => f.key === key);
    if (field) {
      field.value = value;
      field.status = 'complete';
    }
  }

  /**
   * Update section statuses based on field completion
   */
  private updateSectionStatuses(): void {
    for (const section of this.sections) {
      const sectionFields = this.fields.filter(f => f.section === section.id);
      section.status = this.calculateSectionStatus(sectionFields);
    }
  }

  /**
   * Notify WebSocket about field update
   */
  private notifyFieldUpdate(key: string, value: any): void {
    const wsService = getWebSocketService();
    
    if (wsService) {
      wsService.send('field_update', {
        taskId: this.taskId,
        fieldId: key,
        value: value,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Load form data from the server - FormServiceInterface implementation
   */
  async loadFormData(): Promise<FormData> {
    this.logger('loadFormData called');
    if (!this.initialized) {
      await this.initialize();
    }
    return {
      fields: this.fields,
      sections: this.sections
    };
  }

  /**
   * Update form data - FormServiceInterface implementation
   */
  async updateFormData(key: string, value: any): Promise<boolean> {
    this.logger(`updateFormData called for ${key}`);
    return this.updateField(key, value);
  }

  /**
   * Get form data - FormServiceInterface implementation
   */
  getFormData(): FormData {
    this.logger('getFormData called');
    return {
      fields: this.fields,
      sections: this.sections
    };
  }
  
  /**
   * Calculate progress - FormServiceInterface implementation
   */
  calculateProgress(): number {
    this.logger('calculateProgress called');
    return this.getProgress();
  }

  /**
   * Set form template - FormServiceInterface implementation
   */
  setTemplate(templateId: number): void {
    this.logger(`setTemplate called with templateId: ${templateId}`);
    // KY3P doesn't use templates in the same way, so this is a no-op
  }

  /**
   * Save current form data - FormServiceInterface implementation
   */
  async saveFormData(): Promise<boolean> {
    this.logger('saveFormData called');
    // KY3P saves data in real-time per field, so this is a no-op
    return true;
  }

  /**
   * Check if form has unsaved changes - FormServiceInterface implementation
   */
  hasUnsavedChanges(): boolean {
    this.logger('hasUnsavedChanges called');
    // KY3P saves data in real-time per field, so this always returns false
    return false;
  }

  /**
   * Reset form data - FormServiceInterface implementation
   */
  async resetFormData(): Promise<boolean> {
    this.logger('resetFormData called');
    // Not implemented for KY3P forms
    return false;
  }
  
  /**
   * Save progress - FormServiceInterface implementation
   */
  async saveProgress(): Promise<boolean> {
    this.logger('saveProgress called');
    // KY3P forms save progress automatically on field update
    return true;
  }
  
  /**
   * Load progress - FormServiceInterface implementation
   */
  async loadProgress(): Promise<boolean> {
    this.logger('loadProgress called');
    // Progress is automatically loaded during initialize()
    if (!this.initialized) {
      await this.initialize();
    }
    return true;
  }
  
  /**
   * Save form - FormServiceInterface implementation
   */
  async save(): Promise<boolean> {
    this.logger('save called');
    // KY3P forms are saved in real-time per field
    return true;
  }
  
  /**
   * Submit form - FormServiceInterface implementation
   */
  async submit(): Promise<boolean> {
    this.logger('submit called');
    try {
      if (!this.taskId) {
        this.logger('Cannot submit form - no taskId available');
        return false;
      }
      
      // Call the submission endpoint
      const response = await fetch(`/api/ky3p/tasks/${this.taskId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        this.logger(`Form submission failed: ${response.status} - ${errorText}`);
        return false;
      }
      
      const result = await response.json();
      this.logger('Form submission successful', result);
      return true;
    } catch (error) {
      this.logger('Error submitting form', error);
      return false;
    }
  }
  
  /**
   * Validate form - FormServiceInterface implementation
   */
  validate(): { valid: boolean; errors: Record<string, string> } {
    this.logger('validate called');
    
    const errors: Record<string, string> = {};
    let valid = true;
    
    // Check required fields
    for (const field of this.fields) {
      if (field.required && (!field.value || field.value.trim() === '')) {
        errors[field.key] = 'This field is required';
        valid = false;
      }
    }
    
    return { valid, errors };
  }

  /**
   * Get the current progress of the form
   */
  getProgress(): number {
    if (this.fields.length === 0) {
      return 0;
    }
    
    const requiredFields = this.fields.filter(f => f.required);
    
    if (requiredFields.length === 0) {
      return 0;
    }
    
    const completedRequiredFields = requiredFields.filter(f => f.status === 'complete');
    return Math.round((completedRequiredFields.length / requiredFields.length) * 100);
  }
}

/**
 * Factory class for creating KY3P form service instances
 */
export class KY3PFormServiceFactory {
  private static instance: KY3PFormServiceFactory;
  private serviceInstances: Map<string, KY3PFormService> = new Map();
  
  private constructor() {}
  
  public static getInstance(): KY3PFormServiceFactory {
    if (!KY3PFormServiceFactory.instance) {
      KY3PFormServiceFactory.instance = new KY3PFormServiceFactory();
    }
    return KY3PFormServiceFactory.instance;
  }
  
  /**
   * Create a new form service instance
   */
  public createService(taskId: number, companyId: number): KY3PFormService {
    return new KY3PFormService(taskId, companyId);
  }

  /**
   * Get an existing service instance or create a new one
   * This is the method that componentFactory.getIsolatedFormService expects
   */
  public getServiceInstance(companyId: number | string, taskId: number | string): KY3PFormService {
    // Create a unique key for this combination
    const instanceKey = `${companyId}_${taskId}`;
    
    // If we have an existing instance, return it
    if (this.serviceInstances.has(instanceKey)) {
      return this.serviceInstances.get(instanceKey)!;
    }
    
    // Otherwise, create a new one and store it
    const numericCompanyId = typeof companyId === 'string' ? parseInt(companyId, 10) : companyId;
    const numericTaskId = typeof taskId === 'string' ? parseInt(taskId, 10) : taskId;
    
    const service = this.createService(numericTaskId, numericCompanyId);
    this.serviceInstances.set(instanceKey, service);
    
    return service;
  }
}

// Create singleton instance for service registration
const ky3pFormServiceFactory = KY3PFormServiceFactory.getInstance();

export { ky3pFormServiceFactory };
export default KY3PFormService;