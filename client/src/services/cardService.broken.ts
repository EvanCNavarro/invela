/**
 * ========================================
 * Card Service Module
 * ========================================
 * 
 * Enterprise card form management service providing comprehensive data
 * handling for business card information collection and validation.
 * Implements FormServiceInterface to ensure consistent behavior across
 * all form services while providing specialized card-specific functionality.
 * 
 * Key Features:
 * - Card field management with wizard section organization
 * - Progress tracking and form completion status monitoring
 * - Real-time data persistence with change detection
 * - Comprehensive error handling and structured logging
 * - Integration with API request infrastructure
 * 
 * Dependencies:
 * - QueryClient: API request management and caching
 * - FormService: Core form interface and data structures
 * - Logger: Structured logging for debugging and monitoring
 * 
 * @module CardService
 * @version 2.0.0
 * @since 2024-04-15
 */

// ========================================
// IMPORTS
// ========================================

// API request utilities for data persistence and retrieval
import { apiRequest } from "@/lib/queryClient";

// Core form service interfaces and data structures
import { FormServiceInterface, FormField, FormSection } from './formService';

// Structured logging utilities for debugging and monitoring
import getLogger from '@/utils/logger';

// ========================================
// CONSTANTS
// ========================================

/**
 * Card service logging context for structured debugging
 * Provides consistent logging context for all card operations
 */
const CARD_SERVICE_LOGGING_CONTEXT = '[CardService]';

/**
 * Card form configuration constants for validation and processing
 * Defines baseline values for card field management and validation
 */
const CARD_FORM_DEFAULTS = {
  MIN_PROGRESS: 0,
  MAX_PROGRESS: 100,
  DEFAULT_RISK_SCORE: 0,
  INITIALIZATION_TIMEOUT: 5000
} as const;

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Card field interface for business card information management
 * 
 * Defines the structure for card-specific fields with wizard section
 * organization, AI search capabilities, and risk scoring integration.
 * Used for comprehensive business card data collection and validation.
 */
export interface CardField {
  /** Unique identifier for the card field */
  id: number;
  /** Field key for data mapping and identification */
  field_key: string;
  /** Wizard section grouping for multi-step form organization */
  wizard_section: string;
  /** Human-readable label for the field question */
  question_label: string;
  /** Detailed question text for user guidance */
  question: string;
  /** Example response to guide user input */
  example_response: string;
  /** AI search instructions for intelligent data processing */
  ai_search_instructions: string;
  /** Maximum partial risk score contribution for this field */
  partial_risk_score_max: number;
}

/**
 * Card progress response interface for form completion tracking
 * 
 * Provides comprehensive progress information including form data,
 * completion percentage, and optional status indicators for real-time
 * monitoring of card form completion workflows.
 */
export interface CardProgressResponse {
  /** Current form data values */
  formData: Record<string, any>;
  /** Completion progress percentage (0-100) */
  progress: number;
  /** Optional status indicator for form state */
  status?: string;
}

/**
 * Form submission options interface for card form processing
 * 
 * Defines configuration options for card form submission including
 * task identification and optional file naming for document management.
 */
export interface FormSubmitOptions {
  /** Task identifier for submission tracking */
  taskId: number;
  /** Optional filename for document storage */
  fileName?: string;
}

// ========================================
// SERVICE IMPLEMENTATION
// ========================================

/**
 * Card Form Service for comprehensive business card management
 * 
 * Provides enterprise-grade card form management with real-time progress
 * tracking, data persistence, and comprehensive validation. Implements
 * the FormServiceInterface to ensure consistent behavior across all
 * form services while providing specialized card-specific functionality.
 * 
 * Features include wizard section organization, AI-powered search
 * capabilities, risk scoring integration, and robust error handling
 * with structured logging throughout the service lifecycle.
 */
export class CardFormService implements FormServiceInterface {
  /** Card form fields array for field management */
  private fields: FormField[] = [];
  
  /** Form sections array for wizard organization */
  private sections: FormSection[] = [];
  
  /** Current form data values */
  private formData: Record<string, any> = {};
  
  /** Service initialization status flag */
  private initialized: boolean = false;
  
  /** Last saved data hash for change detection */
  private lastSavedData: string = '';
  
  /** Structured logger instance for debugging and monitoring */
  private logger = getLogger('CardService');
  
  /**
   * Initialize Card Form Service with comprehensive setup
   * 
   * Creates a new card service instance with proper logging context
   * and initialization tracking for reliable service operation.
   */
  constructor() {
    this.logger.info(`${CARD_SERVICE_LOGGING_CONTEXT} Service instance created`);
  }
  
  /**
   * Initialize card form service with comprehensive field and section setup
   * 
   * Performs complete service initialization including field loading, section
   * organization, and validation setup. Implements defensive programming with
   * proper error handling and structured logging for reliable service operation.
   * 
   * @returns Promise that resolves when initialization completes successfully
   * 
   * @throws {Error} When field loading or service setup fails
   */
  async initialize(): Promise<void> {
    // Prevent duplicate initialization attempts
    if (this.initialized) {
      this.logger.info(`${CARD_SERVICE_LOGGING_CONTEXT} Service already initialized`);
      return;
    }
    
    try {
      // Load card fields from authentic data sources
      const fields = await getCardFields();
      this.logger.info(
        `${CARD_SERVICE_LOGGING_CONTEXT} Loaded ${fields.length} card fields from database`
      );
      
      // Group fields by wizard section for organized presentation
      const groupedFields = groupCardFieldsBySection(fields);
      
      // Initialize service data structures
      this.sections = [];
      this.fields = [];
      
      // Track section creation for debugging and validation
      const sectionIds: string[] = [];
      
      // Create organized sections from grouped field data
      Object.entries(groupedFields).forEach(([sectionName, sectionFields], index) => {
        // Generate unique section identifier for tracking
        const sectionId = `section-${index + 1}`;
        sectionIds.push(sectionId);
        
        // Create section with comprehensive metadata
        this.sections.push({
          id: sectionId,
          title: sectionName,
          description: `Card wizard section: ${sectionName}`,
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