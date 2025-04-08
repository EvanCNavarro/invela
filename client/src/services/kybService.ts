import { FormField } from "@/utils/formUtils";
import { FormServiceInterface, groupFields } from "./formService";

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
  /**
   * Fetches all KYB fields from the server, ordered by group and order
   * @returns Promise with an array of KYB fields
   */
  async getFields(): Promise<KybField[]> {
    console.log('[KYB Service] Fetching KYB fields');
    const response = await fetch('/api/kyb/fields');
    if (!response.ok) {
      throw new Error(`Failed to fetch KYB fields: ${response.statusText}`);
    }
    return await response.json();
  }

  /**
   * Groups KYB fields by their group property
   * @param fields Array of KYB fields to group
   * @returns Object with group names as keys and arrays of fields as values
   */
  groupFieldsBySection(fields: KybField[]): Record<string, KybField[]> {
    return groupFields(
      fields,
      (field) => field.group,
      (field) => field.order
    );
  }

  /**
   * Convert KybField from database to FormField format for the form
   * @param field KYB field from the API
   * @returns FormField object ready for the universal form
   */
  convertToFormField(field: KybField): FormField {
    // Map field types from database to form component
    let fieldType: string | undefined = undefined;
    let options: string[] | undefined = undefined;

    if (field.field_type === 'BOOLEAN') {
      fieldType = 'BOOLEAN';
    } else if (field.field_type === 'DATE') {
      fieldType = 'DATE';
    } else if (field.field_type === 'MULTIPLE_CHOICE') {
      fieldType = 'MULTIPLE_CHOICE';
      // Try to parse options from validation_rules if available
      if (field.validation_rules && typeof field.validation_rules === 'object') {
        const rules = field.validation_rules as any;
        if (rules.options && Array.isArray(rules.options)) {
          options = rules.options;
        }
      }
      // Default options if none are specified
      if (!options || options.length === 0) {
        options = [
          'Less than $1 million',
          '$1 million - $10 million',
          '$10 million - $50 million',
          'Greater than $50 million'
        ];
      }
    }

    return {
      name: field.field_key,
      label: field.display_name,
      question: field.question,
      tooltip: field.help_text || '',
      field_type: fieldType,
      options: options
    };
  }

  /**
   * Saves progress for a KYB form
   * @param taskId ID of the task
   * @param progress Progress percentage (0-100)
   * @param formData Form data to save
   * @returns Promise with saved data
   */
  async saveProgress(taskId: number, progress: number, formData: Record<string, any>) {
    console.log('[KYB Service] Saving KYB progress', {
      taskId,
      progress,
      formDataKeys: Object.keys(formData)
    });
    
    const response = await fetch('/api/kyb/progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        taskId,
        progress,
        formData
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to save KYB progress: ${response.statusText}`);
    }
    
    return await response.json();
  }

  /**
   * Gets saved progress for a KYB form
   * @param taskId ID of the task
   * @returns Promise with saved form data and progress
   */
  async getProgress(taskId: number): Promise<KybProgressResponse> {
    console.log('[KYB Service] Getting KYB progress', { taskId });
    
    const response = await fetch(`/api/kyb/progress/${taskId}`);
    if (!response.ok) {
      throw new Error(`Failed to get KYB progress: ${response.statusText}`);
    }
    
    return await response.json();
  }

  /**
   * Submits a completed KYB form
   * @param taskId ID of the task
   * @param formData Complete form data
   * @param fileName Optional file name for the CSV export
   * @returns Promise with submission result
   */
  async submitForm(taskId: number, formData: Record<string, any>, fileName?: string) {
    console.log('[KYB Service] Submitting KYB form', {
      taskId,
      formDataKeys: Object.keys(formData),
      fileName
    });
    
    const response = await fetch(`/api/kyb/submit/${taskId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        taskId,
        formData,
        fileName: fileName || `kyb_form_${taskId}_${new Date().toISOString().replace(/[:]/g, '')}`
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to submit KYB form: ${response.statusText}`);
    }
    
    return await response.json();
  }
}

// Create a singleton instance of the KYB service
export const kybService = new KybFormService();

// For backward compatibility, export functions that use the singleton
export const getKybFields = (): Promise<KybField[]> => kybService.getFields();
export const groupKybFieldsBySection = (fields: KybField[]): Record<string, KybField[]> => kybService.groupFieldsBySection(fields);
export const saveKybProgress = (taskId: number, progress: number, formData: Record<string, any>) => kybService.saveProgress(taskId, progress, formData);
export const getKybProgress = (taskId: number): Promise<KybProgressResponse> => kybService.getProgress(taskId);
export const submitKybForm = (taskId: number, formData: Record<string, any>, fileName?: string) => kybService.submitForm(taskId, formData, fileName);