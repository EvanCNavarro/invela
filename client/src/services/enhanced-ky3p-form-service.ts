/**
 * Enhanced KY3P Form Service
 * 
 * This service wraps the original KY3P form service and enhances it with
 * standardized field key handling and improved batch update functionality.
 * 
 * Instead of using inheritance, this service uses delegation to access
 * the underlying KY3P form service methods, ensuring compatibility with
 * the existing system while adding modern features.
 */

import { KY3PFormService } from '@/services/ky3p-form-service';
import { FormServiceInterface, FormSection, FormField } from '@/services/form-service-interface';

/**
 * Enhanced wrapper for KY3P form service that includes standardized
 * batch update and field clearing with proper string-based field keys.
 */
export class EnhancedKY3PFormService implements FormServiceInterface {
  private originalService: KY3PFormService;
  private taskId: number | null = null;
  private isInitialized = false;
  
  constructor() {
    // Create a new instance of the original service
    this.originalService = new KY3PFormService();
  }
  
  /**
   * Initialize the form service with a task ID
   * 
   * @param taskId The task ID to initialize with
   */
  initialize(taskId: number): void {
    console.log(`[EnhancedKY3PFormService] Initializing with task ID: ${taskId}`);
    this.taskId = taskId;
    this.originalService.initialize(taskId);
    this.isInitialized = true;
  }
  
  /**
   * Load form data from the server
   */
  async loadFormData(): Promise<void> {
    console.log('[EnhancedKY3PFormService] Loading form data');
    if (!this.isInitialized) {
      console.error('[EnhancedKY3PFormService] Service not initialized. Call initialize() first.');
      throw new Error('Service not initialized');
    }
    
    try {
      await this.originalService.loadFormData();
      console.log('[EnhancedKY3PFormService] Form data loaded successfully');
    } catch (error) {
      console.error('[EnhancedKY3PFormService] Error loading form data:', error);
      throw error;
    }
  }
  
  /**
   * Get the list of fields
   */
  getFields(): FormField[] {
    return this.originalService.getFields();
  }
  
  /**
   * Get a specific field by ID
   * 
   * @param id The field ID to retrieve
   */
  getFieldById(id: string | number): FormField | undefined {
    return this.originalService.getFieldById(id);
  }
  
  /**
   * Get all form sections
   */
  getSections(): FormSection[] {
    return this.originalService.getSections();
  }
  
  /**
   * Get a specific section by ID
   * 
   * @param id The section ID to retrieve
   */
  getSectionById(id: string): FormSection | undefined {
    return this.originalService.getSectionById(id);
  }
  
  /**
   * Get the first section of the form
   */
  getFirstSection(): FormSection | undefined {
    return this.originalService.getFirstSection();
  }
  
  /**
   * Check if the form is complete
   */
  isFormComplete(): boolean {
    return this.originalService.isFormComplete();
  }
  
  /**
   * Get the form completion progress as a percentage
   */
  getFormProgress(): number {
    return this.originalService.getFormProgress();
  }
  
  /**
   * Perform a bulk update of multiple fields at once
   * 
   * This method converts the string-based field keys to the appropriate
   * format expected by the KY3P batch update endpoint.
   * 
   * @param taskId The task ID to update
   * @param formData The form data to update with
   */
  async bulkUpdate(taskId: number, formData: Record<string, any>): Promise<boolean> {
    console.log(`[EnhancedKY3PFormService] Performing bulk update for task ID: ${taskId}`, { fieldCount: Object.keys(formData).length });
    
    if (Object.keys(formData).length === 0) {
      console.warn('[EnhancedKY3PFormService] No fields to update');
      return true;
    }
    
    try {
      // Prepare the batch update request using string-based field keys
      const response = await fetch(`/api/ky3p/batch-update/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[EnhancedKY3PFormService] Batch update failed with status ${response.status}:`, errorText);
        return false;
      }
      
      const result = await response.json();
      console.log('[EnhancedKY3PFormService] Batch update successful:', result);
      
      // Reload the form data to reflect changes
      await this.loadFormData();
      
      return true;
    } catch (error) {
      console.error('[EnhancedKY3PFormService] Error during bulk update:', error);
      return false;
    }
  }
  
  /**
   * Save form progress to the server
   * 
   * @param taskId The task ID to save progress for
   */
  async saveProgress(taskId: number): Promise<boolean> {
    console.log(`[EnhancedKY3PFormService] Saving progress for task ID: ${taskId}`);
    
    try {
      const response = await fetch(`/api/ky3p/save-progress/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[EnhancedKY3PFormService] Save progress failed with status ${response.status}:`, errorText);
        return false;
      }
      
      const result = await response.json();
      console.log('[EnhancedKY3PFormService] Progress saved successfully:', result);
      return true;
    } catch (error) {
      console.error('[EnhancedKY3PFormService] Error saving progress:', error);
      return false;
    }
  }
  
  /**
   * Clear all field values
   * 
   * @param taskId The task ID to clear fields for
   */
  async clearFields(taskId: number): Promise<boolean> {
    console.log(`[EnhancedKY3PFormService] Clearing fields for task ID: ${taskId}`);
    
    try {
      const response = await fetch(`/api/ky3p/clear-fields/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[EnhancedKY3PFormService] Clear fields failed with status ${response.status}:`, errorText);
        return false;
      }
      
      const result = await response.json();
      console.log('[EnhancedKY3PFormService] Fields cleared successfully:', result);
      
      // Reload the form data to reflect changes
      await this.loadFormData();
      
      return true;
    } catch (error) {
      console.error('[EnhancedKY3PFormService] Error clearing fields:', error);
      return false;
    }
  }
  
  /**
   * Synchronize form data with the server
   * 
   * @param taskId Optional task ID to sync data for
   */
  async syncFormData(taskId?: number): Promise<void> {
    const targetTaskId = taskId || this.taskId;
    if (!targetTaskId) {
      console.error('[EnhancedKY3PFormService] No task ID available for sync');
      return;
    }
    
    console.log(`[EnhancedKY3PFormService] Synchronizing form data for task ID: ${targetTaskId}`);
    try {
      await this.loadFormData();
      console.log('[EnhancedKY3PFormService] Form data synchronized successfully');
    } catch (error) {
      console.error('[EnhancedKY3PFormService] Error synchronizing form data:', error);
      throw error;
    }
  }

  /**
   * Implementation of required FormServiceInterface methods
   * that delegate to the original service
   */
  updateFormData(field: FormField, value: any): void {
    // Not implemented in this service, use bulkUpdate instead
    console.warn('[EnhancedKY3PFormService] updateFormData not implemented, use bulkUpdate instead');
  }

  getFormData(): Record<string, any> {
    // Create a dictionary of field values keyed by field_key
    const formData: Record<string, any> = {};
    const fields = this.getFields();
    
    fields.forEach(field => {
      if (field.field_key && field.response !== undefined) {
        formData[field.field_key] = field.response;
      }
    });
    
    return formData;
  }

  calculateProgress(): number {
    return this.getFormProgress();
  }

  loadProgress(): void {
    // Not directly implemented, use syncFormData instead
    console.warn('[EnhancedKY3PFormService] loadProgress not implemented, use syncFormData instead');
  }

  async submitForm(): Promise<boolean> {
    // Submit the form by saving progress
    if (!this.taskId) {
      console.error('[EnhancedKY3PFormService] No task ID available for submission');
      return false;
    }
    
    return this.saveProgress(this.taskId);
  }

  validateField(field: FormField, value: any): boolean {
    // Basic validation - can be enhanced later
    if (field.required && (value === undefined || value === null || value === '')) {
      return false;
    }
    return true;
  }

  validateSection(section: FormSection): boolean {
    // Consider a section valid if all required fields have values
    const fields = this.getFields().filter(field => field.section === section.id);
    return fields.every(field => !field.required || field.response);
  }
}
