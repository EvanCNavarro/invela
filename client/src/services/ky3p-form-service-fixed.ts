/**
 * Fixed KY3P Form Service
 * 
 * This is an enhanced version of the KY3P Form Service that uses
 * standardized string-based field keys for bulk updates, ensuring
 * compatibility with the standardized approach used across
 * all form types (KYB, KY3P, and Open Banking).
 */

import type { FieldDefinition, FormSection, FormServiceInterface } from "./formService";
import getLogger from "@/utils/logger";
import { fixedKy3pBulkUpdate } from "@/components/forms/standardized-ky3p-update";

const logger = getLogger('KY3P-Form-Service-Fixed');

/**
 * Standardized KY3P Form Service that ensures proper update handling
 */
export class KY3PFormServiceFixed implements FormServiceInterface {
  private taskId: number | null = null;
  private isReady: boolean = false;
  private saveInProgress: boolean = false;
  private fieldData: Record<string, any> = {};

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

  public async getFields(): Promise<FieldDefinition[]> {
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

  public async getSections(): Promise<FormSection[]> {
    try {
      const fields = await this.getFields();
      const groupedFields: Record<string, FormSection> = {};
      
      fields.forEach(field => {
        const group = field.group || 'General';
        
        if (!groupedFields[group]) {
          groupedFields[group] = {
            id: group,
            title: group,
            fields: []
          };
        }
        
        groupedFields[group].fields.push(field);
      });
      
      return Object.values(groupedFields);
    } catch (error) {
      logger.error('Error getting KY3P sections:', error);
      return [];
    }
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
      const success = await fixedKy3pBulkUpdate(this.taskId, formData);
      
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

  // Added for compatibility with FormServiceInterface
  public async loadSection(sectionId: string): Promise<FieldDefinition[]> {
    // KY3P form doesn't use sectional loading
    // Return all fields that belong to the given section
    try {
      const fields = await this.getFields();
      return fields.filter(field => field.group === sectionId);
    } catch (error) {
      logger.error(`Error loading section ${sectionId}:`, error);
      return [];
    }
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
      const success = await fixedKy3pBulkUpdate(this.taskId, formData);
      
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