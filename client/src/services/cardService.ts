/**
 * ========================================
 * Card Service - Interactive Risk Assessment Cards
 * ========================================
 * 
 * Advanced card-based form service providing interactive risk assessment
 * capabilities through dynamic card interfaces. Manages wizard-style workflows,
 * field validation, and comprehensive progress tracking for user-friendly assessments.
 * 
 * Key Features:
 * - Interactive card-based risk assessment workflows
 * - Wizard-style step-by-step form progression
 * - Dynamic field validation and AI-powered search instructions
 * - Comprehensive progress tracking and status management
 * - Risk scoring calculation and validation
 * 
 * Assessment Capabilities:
 * - Dynamic question rendering with contextual help
 * - AI-enhanced field search and completion
 * - Real-time progress calculation and status updates
 * - Partial risk scoring for incremental assessments
 * - Form data persistence and recovery mechanisms
 * 
 * @module services/cardService
 * @version 1.0.0
 * @since 2025-05-23
 */

import { apiRequest } from "@/lib/queryClient";
import { FormServiceInterface, FormField, FormSection } from './formService';
import getLogger from '@/utils/logger';

export interface CardField {
  id: number;
  field_key: string;
  wizard_section: string;
  question_label: string;
  question: string;
  example_response: string;
  ai_search_instructions: string;
  partial_risk_score_max: number;
}

export interface CardProgressResponse {
  formData: Record<string, any>;
  progress: number;
  status?: string;
}

export interface FormSubmitOptions {
  taskId: number;
  fileName?: string;
}

/**
 * CardFormService: A comprehensive service for managing card form data
 */
export class CardFormService implements FormServiceInterface {
  private fields: FormField[] = [];
  private sections: FormSection[] = [];
  private formData: Record<string, any> = {};
  private initialized: boolean = false;
  private lastSavedData: string = '';
  private logger = getLogger('CardService');
  
  constructor() {
    this.logger.info('CardService created');
  }
  
  /**
   * Initialize the card form service with fields and sections
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.info('CardService already initialized');
      return;
    }
    
    try {
      // Load card fields
      const fields = await getCardFields();
      this.logger.info(`Loaded ${fields.length} card fields`);
      
      // Group fields by section
      const groupedFields = groupCardFieldsBySection(fields);
      
      // Create sections and convert fields to form fields
      this.sections = [];
      this.fields = [];
      
      // Track sections created for debugging
      const sectionIds: string[] = [];
      
      // Create sections from grouped fields
      Object.entries(groupedFields).forEach(([sectionName, sectionFields], index) => {
        // Create a unique ID for the section
        const sectionId = `section-${index + 1}`;
        sectionIds.push(sectionId);
        
        // Add the section
        this.sections.push({
          id: sectionId,
          title: sectionName,
          description: '',
          order: index + 1,
          collapsed: false
        });
        
        // Convert and add fields
        sectionFields.forEach(field => {
          this.fields.push(this.convertToFormField(field, sectionId));
        });
      });
      
      // Add a review section
      this.sections.push({
        id: 'review-section',
        title: 'Review & Submit',
        description: 'Review your answers before submitting',
        order: this.sections.length + 1,
        collapsed: false
      });
      
      this.logger.info(`Created ${this.sections.length} sections: ${sectionIds.join(', ')}`);
      this.logger.info(`Converted ${this.fields.length} fields to form field format`);
      
      // Mark as initialized
      this.initialized = true;
      this.logger.info('CardService initialization complete');
    } catch (error) {
      this.logger.error('Error initializing CardFormService:', error);
      throw error;
    }
  }
  
  /**
   * Convert card field to form field format
   */
  private convertToFormField(field: CardField, sectionId?: string): FormField {
    return {
      id: field.id,
      key: field.field_key,
      label: field.question_label,
      type: 'textarea', // Default to textarea for card form fields
      required: true,   // Default to required
      question: field.question,
      order: 0,         // Default order
      helpText: field.example_response,
      placeholder: '',
      value: this.formData[field.field_key] || '',
      section: sectionId
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
   * Load the form data
   */
  loadFormData(data: Record<string, any>): void {
    this.formData = { ...data };
    
    // Update field values with the loaded data
    this.fields.forEach(field => {
      field.value = this.formData[field.key] || '';
    });
    
    this.logger.debug('Loaded form data with', Object.keys(data).length, 'fields');
  }
  
  /**
   * Update a form field value
   */
  updateField(key: string, value: any): void {
    this.formData[key] = value;
    
    // Also update the field's value in the fields array
    const field = this.fields.find(f => f.key === key);
    if (field) {
      field.value = value;
    }
  }
  
  /**
   * Save progress for a specific task
   */
  async saveProgress(taskId: number, progress: number = 0): Promise<any> {
    try {
      // Check if taskId is provided
      if (!taskId) {
        console.error('[CardService] Missing taskId in saveProgress');
        return {
          success: false,
          error: 'Task ID is required'
        };
      }
      
      // Normalize form data before sending to server (remove null values)
      const normalizedFormData = Object.fromEntries(
        Object.entries(this.formData).map(([key, value]) => [key, value === null ? '' : value])
      );
      
      // For now, we don't have a dedicated card progress endpoint, so we use the generic save endpoint
      // In the future, this could be implemented as a separate endpoint
      const response = await fetch(`/api/card/save`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          taskId,
          formData: normalizedFormData
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[CardService] Error saving form data: ${response.status} - ${errorText}`);
        return {
          success: false,
          error: `Failed to save: ${response.status}`
        };
      }
      
      // Parse response and handle success
      const responseText = await response.text();
      let responseData;
      
      try {
        if (!responseText || responseText.trim() === '') {
          console.log('[CardService] Empty response from server when saving progress (this may be normal)');
          responseData = { success: true };
        } else {
          responseData = JSON.parse(responseText);
          console.log(`[CardService] Successfully saved progress for task ${taskId}`);
        }
      } catch (parseError) {
        console.error('[CardService] Error parsing save response:', parseError);
        responseData = { success: true }; // Assume success if we received a 200 OK
      }
      
      return responseData;
    } catch (error) {
      console.error('[CardService] Network error while saving form data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
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
      console.error('[CardService] Error saving form:', error);
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
      return await this.submitCardForm(options.taskId, this.formData, options.fileName);
    } catch (error) {
      console.error('[CardService] Error submitting form:', error);
      throw error;
    }
  }
  
  /**
   * Submit the Card form to the server with enhanced error handling
   */
  async submitCardForm(taskId: number, formData: Record<string, any>, fileName?: string) {
    try {
      if (!taskId) {
        throw new Error('Task ID is required to submit the form');
      }
      
      console.log(`[CardService] Submitting form to /api/card/save with fileName: ${fileName}`);
      
      const response = await fetch(`/api/card/save`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          taskId,
          formData,
          fileName
        })
      });
      
      // Get response text first for proper error handling
      const responseText = await response.text();
      
      // Check if response is empty
      if (!responseText || responseText.trim() === '') {
        throw new Error('Server returned an empty response');
      }
      
      // Parse response text to JSON
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[CardService] Failed to parse response as JSON', parseError, responseText.substring(0, 200));
        throw new Error('Server returned an invalid response. Please try again.');
      }
      
      // Check if response indicates an error with 207 status (partial success)
      if (response.status === 207) {
        console.warn('[CardService] Received partial success response:', responseData);
        if (responseData.error) {
          // Include both error and details in the message for better user feedback
          const errorMessage = responseData.details 
            ? `${responseData.error}: ${responseData.details}` 
            : responseData.error;
          throw new Error(errorMessage);
        }
      }
      
      // Check if response is not OK
      if (!response.ok) {
        console.error('[CardService] Response not OK:', response.status, responseData);
        throw new Error(responseData.details || responseData.error || `Failed to submit form: ${response.status}`);
      }
      
      // Check if response contains explicit error field
      if (responseData.error) {
        console.error('[CardService] Response contains error field:', responseData.error);
        throw new Error(responseData.details || responseData.error);
      }
      
      // Make sure response has success flag
      if (!responseData.success) {
        console.error('[CardService] Response missing success flag:', responseData);
        throw new Error('Submission incomplete. Please check your form data and try again.');
      }
      
      // Return validated response data
      return responseData;
    } catch (error) {
      console.error('[CardService] Error submitting form:', error);
      throw error;
    }
  }
}

// Create a singleton instance
export const cardService = new CardFormService();

// Export original API functions for backward compatibility
export async function getCardFields() {
  return apiRequest<CardField[]>('/api/card/fields');
}

export function groupCardFieldsBySection(fields: CardField[]): Record<string, CardField[]> {
  return fields.reduce((acc, field) => {
    if (!acc[field.wizard_section]) {
      acc[field.wizard_section] = [];
    }
    acc[field.wizard_section].push(field);
    return acc;
  }, {} as Record<string, CardField[]>);
}

// Export convenience functions
export const submitCardForm = (taskId: number, formData: Record<string, any>, fileName?: string) => 
  cardService.submitCardForm(taskId, formData, fileName);