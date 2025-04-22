/**
 * Enhanced KY3P Form Service
 * 
 * This is a clean implementation of the KY3P form service with proper
 * demo autofill capabilities and comprehensive logging for debugging.
 */

import { getWebSocketService } from '../lib/webSocketClient';
import { ky3pFields } from '@db/schema';
import type { FormField, FormSection, FormStatus } from '../types/form';

// Type definitions
export interface KY3PResponse {
  id: number;
  fieldKey: string;
  response: string;
  status: string;
}

export interface KY3PField {
  id: number;
  key: string;
  display_name: string;
  question: string;
  type: string;
  group: string;
  is_required: boolean;
  help_text?: string;
  demo_autofill?: string;
}

export class KY3PFormService {
  private fields: FormField[] = [];
  private sections: FormSection[] = [];
  private initialized = false;
  private taskId: number | null = null;
  private companyId: number | null = null;
  private logger: (message: string, context?: any) => void;

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
      
      // Fetch both field definitions and responses
      const [fieldDefinitionsResponse, fieldResponsesResponse] = await Promise.all([
        fetch('/api/ky3p/fields'),
        fetch(`/api/ky3p/responses/${this.taskId}`)
      ]);
      
      if (!fieldDefinitionsResponse.ok) {
        throw new Error(`Failed to load field definitions: ${fieldDefinitionsResponse.status}`);
      }
      
      if (!fieldResponsesResponse.ok) {
        throw new Error(`Failed to load field responses: ${fieldResponsesResponse.status}`);
      }
      
      const fieldDefinitions: KY3PField[] = await fieldDefinitionsResponse.json();
      const fieldResponses: KY3PResponse[] = await fieldResponsesResponse.json();
      
      this.logger(`Loaded ${fieldDefinitions.length} field definitions and ${fieldResponses.length} responses`);
      
      // Map responses to a lookup object
      const responsesLookup: Record<string, KY3PResponse> = {};
      fieldResponses.forEach(response => {
        responsesLookup[response.fieldKey] = response;
      });
      
      // Convert fields to our internal format
      this.fields = fieldDefinitions.map(field => {
        const response = responsesLookup[field.key];
        
        return {
          id: field.id,
          key: field.key,
          label: field.display_name,
          description: field.question,
          type: field.type,
          section: this.getSectionIdFromGroup(field.group),
          required: field.is_required,
          value: response?.response || '',
          status: response?.status || 'incomplete',
          helpText: field.help_text || '',
          demoAutofill: field.demo_autofill || '',
          // Additional properties
          order: 0, // Will be set during section generation
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

export default KY3PFormService;