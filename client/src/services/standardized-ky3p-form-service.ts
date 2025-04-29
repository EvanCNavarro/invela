/**
 * Standardized KY3P Form Service 
 * 
 * This service extends the EnhancedKybFormService to provide a consistent API
 * for KY3P forms while handling the special requirements of KY3P forms, including
 * the conversion between field keys and field IDs.
 */

import { QueryClient } from '@tanstack/react-query';
import { EnhancedKybFormService, FormServiceLogger } from './enhanced-kyb-service';
import { FormField, FormSection } from './formService';

interface Ky3PField extends FormField {
  id: number;
  created_at?: Date | null;
  updated_at?: Date | null;
  field_key: string;
  display_name: string;
  field_type: string;
  group?: string;
  step_index?: number;
  is_required?: boolean;
  help_text?: string;
  order?: number;
  options?: string[];
  default_value?: string | null;
  metadata?: Record<string, any> | null;
  soc2_overlap?: string | null;
}

interface Ky3PFieldMappingCache {
  byId: Map<number, string>;
  byKey: Map<string, number>;
  fields: Ky3PField[];
  lastUpdated: number;
}

interface Ky3PUpdateOptions {
  useFieldKeys?: boolean;
  debugMode?: boolean;
}

/**
 * Enhanced KY3P Form Service with support for both field keys and field IDs
 * 
 * This service includes special handling to convert between field keys and IDs
 * for compatibility with the KYB and Open Banking form systems.
 */
export class StandardizedKY3PFormService extends EnhancedKybFormService {
  private fieldMappingCache: Ky3PFieldMappingCache | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly fieldEndpoint = '/api/ky3p/fields';
  private readonly batchUpdateEndpoint = '/api/ky3p/batch-update';
  private readonly demoAutofillEndpoint = '/api/ky3p/demo-autofill';
  private readonly clearEndpoint = '/api/ky3p/clear';
  private readonly updateFieldEndpoint = '/api/ky3p/update-field';
  private readonly responseEndpoint = '/api/tasks/:taskId/ky3p-responses';
  
  constructor(queryClient: QueryClient) {
    super(queryClient);
    this.serviceName = 'StandardizedKy3pFormService';
  }
  
  /**
   * Get all field definitions for KY3P forms
   * @override
   */
  async getFields(): Promise<FormField[]> {
    try {
      const response = await fetch(this.fieldEndpoint);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch KY3P fields: ${response.status} ${response.statusText}`);
      }
      
      const fields = await response.json() as Ky3PField[];
      this.log(`Fetched ${fields.length} KY3P field definitions`);
      
      // Initialize the field mapping cache
      this.initFieldCache(fields);
      
      return fields;
    } catch (error) {
      this.error('Error fetching KY3P fields:', error);
      return [];
    }
  }
  
  /**
   * Initialize or update the field mapping cache
   */
  private initFieldCache(fields: Ky3PField[]): void {
    const byId = new Map<number, string>();
    const byKey = new Map<string, number>();
    
    fields.forEach(field => {
      if (field.id && field.field_key) {
        byId.set(field.id, field.field_key);
        byKey.set(field.field_key, field.id);
      }
    });
    
    this.fieldMappingCache = {
      byId,
      byKey,
      fields,
      lastUpdated: Date.now()
    };
    
    this.log(`Field mapping cache initialized with ${byId.size} entries`);
  }
  
  /**
   * Convert a field key to a field ID
   */
  async fieldKeyToId(fieldKey: string): Promise<number | null> {
    if (!this.fieldMappingCache || Date.now() - this.fieldMappingCache.lastUpdated > this.CACHE_TTL) {
      await this.getFields();
    }
    
    if (!this.fieldMappingCache) {
      this.error('Field mapping cache is not initialized');
      return null;
    }
    
    const fieldId = this.fieldMappingCache.byKey.get(fieldKey);
    
    if (!fieldId) {
      this.warn(`Field key not found in mapping: ${fieldKey}`);
      return null;
    }
    
    return fieldId;
  }
  
  /**
   * Convert a field ID to a field key
   */
  async fieldIdToKey(fieldId: number): Promise<string | null> {
    if (!this.fieldMappingCache || Date.now() - this.fieldMappingCache.lastUpdated > this.CACHE_TTL) {
      await this.getFields();
    }
    
    if (!this.fieldMappingCache) {
      this.error('Field mapping cache is not initialized');
      return null;
    }
    
    const fieldKey = this.fieldMappingCache.byId.get(fieldId);
    
    if (!fieldKey) {
      this.warn(`Field ID not found in mapping: ${fieldId}`);
      return null;
    }
    
    return fieldKey;
  }
  
  /**
   * Get form data for a specific task
   */
  async getTaskData(taskId: number): Promise<Record<string, any>> {
    try {
      const url = this.responseEndpoint.replace(':taskId', taskId.toString());
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch KY3P task data: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      this.log(`Fetched form data for task ${taskId} with ${data.length || 0} entries`);
      
      // Transform the array of responses into a key-value map
      const formData: Record<string, any> = {};
      
      if (Array.isArray(data)) {
        for (const item of data) {
          // Get field key from field ID using mapping
          const fieldKey = await this.fieldIdToKey(item.field_id);
          
          if (fieldKey) {
            formData[fieldKey] = item.response;
          } else {
            this.warn(`Couldn't find field key for ID: ${item.field_id}`);
          }
        }
      }
      
      return formData;
    } catch (error) {
      this.error('Error fetching KY3P task data:', error);
      return {};
    }
  }
  
  /**
   * Update a single field value
   */
  async updateField(taskId: number, fieldKey: string, value: any, options?: Ky3PUpdateOptions): Promise<boolean> {
    try {
      // Try with field key first (if specified)
      if (options?.useFieldKeys) {
        this.log(`Updating field ${fieldKey} for task ${taskId} using field key`);
        
        const response = await fetch(this.updateFieldEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            taskId,
            fieldKey,
            value: value?.toString() || '',
          }),
        });
        
        if (response.ok) {
          return true;
        }
        
        // If using field keys fails, fall back to field ID approach
        this.warn(`Failed to update field using field key, falling back to ID-based update`);
      }
      
      // Use field ID approach
      return this.updateFieldById(taskId, fieldKey, value);
    } catch (error) {
      this.error(`Error updating field ${fieldKey}:`, error);
      return false;
    }
  }
  
  /**
   * Update a field using its ID rather than key
   */
  private async updateFieldById(taskId: number, fieldKey: string, value: any): Promise<boolean> {
    try {
      // Convert field key to field ID
      const fieldId = await this.fieldKeyToId(fieldKey);
      
      if (!fieldId) {
        throw new Error(`Could not find field ID for key: ${fieldKey}`);
      }
      
      this.log(`Updating field ${fieldKey} (ID: ${fieldId}) for task ${taskId}`);
      
      const response = await fetch(this.updateFieldEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId,
          fieldId,
          value: value?.toString() || '',
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update field: ${response.status} ${response.statusText}`);
      }
      
      return true;
    } catch (error) {
      this.error(`Error updating field ${fieldKey} by ID:`, error);
      return false;
    }
  }
  
  /**
   * Batch update multiple fields at once
   */
  async batchUpdate(taskId: number, formData: Record<string, any>, options?: Ky3PUpdateOptions): Promise<boolean> {
    try {
      // Try with field keys first (if specified)
      if (options?.useFieldKeys) {
        this.log(`Batch updating for task ${taskId} using field keys`);
        
        const updates = Object.entries(formData).map(([key, value]) => ({
          fieldKey: key,
          value: value?.toString() || '',
        }));
        
        const response = await fetch(`${this.batchUpdateEndpoint}/${taskId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            updates,
          }),
        });
        
        if (response.ok) {
          return true;
        }
        
        // If using field keys fails, fall back to field ID approach
        this.warn(`Failed to batch update using field keys, falling back to ID-based update`);
      }
      
      // Use field ID approach
      return this.batchUpdateWithFieldIds(taskId, formData);
    } catch (error) {
      this.error('Error in batch update:', error);
      return false;
    }
  }
  
  /**
   * Batch update fields using field IDs instead of keys
   */
  private async batchUpdateWithFieldIds(taskId: number, formData: Record<string, any>): Promise<boolean> {
    try {
      const updates = [];
      
      // Convert each field key to field ID
      for (const [key, value] of Object.entries(formData)) {
        const fieldId = await this.fieldKeyToId(key);
        
        if (fieldId) {
          updates.push({
            fieldId,
            value: value?.toString() || '',
          });
        } else {
          this.warn(`Could not find field ID for key: ${key}, skipping this field`);
        }
      }
      
      this.log(`Batch updating ${updates.length} fields for task ${taskId} using field IDs`);
      
      const response = await fetch(`${this.batchUpdateEndpoint}/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          updates,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Batch update failed: ${response.status} ${response.statusText}`);
      }
      
      return true;
    } catch (error) {
      this.error('Error in batch update with field IDs:', error);
      return false;
    }
  }
  
  /**
   * Apply demo data to populate the form (for testing)
   */
  async demoAutofill(taskId: number): Promise<boolean> {
    try {
      this.log(`Applying demo auto-fill for KY3P task ${taskId}`);
      
      const response = await fetch(`${this.demoAutofillEndpoint}/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Demo auto-fill failed: ${response.status} ${response.statusText}`);
      }
      
      return true;
    } catch (error) {
      this.error('Error applying KY3P demo auto-fill:', error);
      return false;
    }
  }
  
  /**
   * Clear all field values for the task
   */
  async clearAllFields(taskId: number): Promise<boolean> {
    try {
      this.log(`Clearing all fields for KY3P task ${taskId}`);
      
      const response = await fetch(`${this.clearEndpoint}/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Clear fields failed: ${response.status} ${response.statusText}`);
      }
      
      return true;
    } catch (error) {
      this.error('Error clearing KY3P fields:', error);
      return false;
    }
  }
  
  /**
   * Get sections/groups for KY3P forms
   */
  async getSections(): Promise<FormSection[]> {
    try {
      // Get all fields first
      const fields = await this.getFields();
      
      // Group fields by their 'group' property
      const groupMap = new Map<string, FormField[]>();
      
      fields.forEach(field => {
        const group = field.group || 'Default';
        if (!groupMap.has(group)) {
          groupMap.set(group, []);
        }
        groupMap.get(group)!.push(field);
      });
      
      // Convert groups to sections
      const sections: FormSection[] = [];
      
      groupMap.forEach((groupFields, groupName) => {
        // Take first field's step_index or 0 for the section
        const stepIndex = groupFields[0]?.step_index || 0;
        
        sections.push({
          key: groupName.toLowerCase().replace(/\s+/g, '-'),
          name: groupName,
          title: groupName,
          description: `KY3P section for ${groupName}`,
          step_index: stepIndex,
          fields: groupFields,
        });
      });
      
      // Sort sections by step_index
      return sections.sort((a, b) => (a.step_index || 0) - (b.step_index || 0));
    } catch (error) {
      this.error('Error getting KY3P sections:', error);
      return [];
    }
  }
  
  /**
   * Get the task type for this form service
   */
  getTaskType(): string {
    return 'ky3p';
  }
}

// Export a default instance of the service
export const standardizedKy3pFormService = new StandardizedKY3PFormService(new QueryClient());

// Factory for isolated service instances
class StandardizedKY3PFormServiceFactory {
  private instanceMap: Map<string, StandardizedKY3PFormService> = new Map();
  private logger = new FormServiceLogger('StandardizedKy3pFormServiceFactory');
  
  /**
   * Gets or creates an isolated service instance for a specific company and task
   * @param companyId Company ID
   * @param taskId Task ID
   * @returns Isolated StandardizedKY3PFormService instance
   */
  getServiceInstance(companyId: number | string, taskId: number | string): StandardizedKY3PFormService {
    const key = `${companyId}_${taskId}`;
    
    if (!this.instanceMap.has(key)) {
      this.logger.log(`Creating new KY3P service instance for company ${companyId}, task ${taskId}`);
      const service = new StandardizedKY3PFormService(new QueryClient());
      this.instanceMap.set(key, service);
    } else {
      this.logger.log(`Reusing existing KY3P service instance for company ${companyId}, task ${taskId}`);
    }
    
    return this.instanceMap.get(key)!;
  }
  
  /**
   * Clears the instance for a specific company and task (useful for cleanup)
   * @param companyId Company ID
   * @param taskId Task ID
   */
  clearInstance(companyId: number | string, taskId: number | string): void {
    const key = `${companyId}_${taskId}`;
    if (this.instanceMap.has(key)) {
      this.logger.log(`Clearing KY3P service instance for company ${companyId}, task ${taskId}`);
      this.instanceMap.delete(key);
    }
  }
  
  /**
   * Clears all instances (useful for testing and forced resets)
   */
  clearAllInstances(): void {
    this.logger.log(`Clearing all KY3P service instances (${this.instanceMap.size} total)`);
    this.instanceMap.clear();
  }
}

// Export singleton factory
export const standardizedKy3pFormServiceFactory = new StandardizedKY3PFormServiceFactory();
