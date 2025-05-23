/**
 * KY3P Security Assessment Form Service
 * 
 * Enterprise-grade service for managing S&P KY3P Security Assessment forms.
 * Extends the Enhanced KYB Form Service to provide specialized functionality
 * with proper TypeScript typing and error handling.
 * 
 * @dependencies Enhanced KYB Service, Form Service, Logger Utility
 * @purpose Centralized KY3P form management with timestamp tracking
 * @follows Enterprise coding standards for service architecture
 */

import { EnhancedKybFormService } from './enhanced-kyb-service';
import { FormField, FormSection } from './formService';
import getLogger from '@/utils/logger';

const logger = getLogger('KY3PFormService');

/**
 * KY3P Form Service Class
 * 
 * Provides specialized functionality for S&P KY3P Security Assessment forms
 * with enterprise-grade error handling and logging capabilities.
 */
export class KY3PFormService extends EnhancedKybFormService {
  // Override the form type to match the task type in the database
  protected readonly formType = 'sp_ky3p_assessment';
  
  // Cache for KY3P fields by template ID
  private static ky3pFieldsCache: Record<number, any[]> = {};
  
  /**
   * Constructor for KY3P Form Service
   * 
   * Initializes the service with proper logging and error handling
   * following enterprise patterns.
   */
  constructor() {
    super();
    logger.info('[KY3P Form Service] Initializing KY3P Form Service');
  }

  /**
   * Loads KY3P fields for the specified template
   * 
   * @param templateId - The template ID to load fields for
   * @returns Promise resolving to array of form fields
   */
  public async loadKY3PFields(templateId: number): Promise<FormField[]> {
    try {
      // Check cache first
      if (KY3PFormService.ky3pFieldsCache[templateId]) {
        logger.info(`[KY3P Form Service] Returning cached fields for template ${templateId}`);
        return KY3PFormService.ky3pFieldsCache[templateId];
      }

      // Load fields from database
      const fields = await this.loadFieldsForTemplate(templateId);
      
      // Cache the results
      KY3PFormService.ky3pFieldsCache[templateId] = fields;
      
      logger.info(`[KY3P Form Service] Loaded ${fields.length} fields for template ${templateId}`);
      return fields;
    } catch (error) {
      logger.error('[KY3P Form Service] Error loading KY3P fields', { 
        error,
        templateId 
      });
      throw error;
    }
  }

  /**
   * Clears the KY3P fields cache
   * 
   * Useful for forcing fresh data retrieval from the database
   */
  public static clearCache(): void {
    KY3PFormService.ky3pFieldsCache = {};
    logger.info('[KY3P Form Service] Cache cleared');
  }
}

/**
 * Factory function for creating KY3P Form Service instances
 * 
 * @param companyId - Optional company ID for scoped operations
 * @param taskId - Optional task ID for specific task operations
 * @returns New KY3P Form Service instance
 */
export function ky3pFormServiceFactory(companyId?: number, taskId?: number): KY3PFormService {
  return new KY3PFormService(companyId, taskId);
}

/**
 * Default export for convenient importing
 */
export const ky3pFormService = new KY3PFormService();