/**
 * Universal Form Bulk Save Fix
 * 
 * This module provides a unified approach to saving form data across all form types
 * using a single, consistent format that works with the unified progress calculator.
 * 
 * KISS PRINCIPLE IMPLEMENTATION: This file has been simplified to use a single,
 * consistent approach to bulk updates to improve reliability and maintainability.
 */

import getLogger from '@/utils/logger';
import { standardizedBulkUpdate } from './standardized-ky3p-update';

const logger = getLogger('UnifiedFormSave');

/**
 * Unified save progress function that works with all form types
 * 
 * This uses standardized endpoint formats with the responses array pattern
 * and ensures progress is properly preserved across all form types.
 * 
 * @param taskId Task ID
 * @param taskType Form type (kyb, ky3p, open_banking)
 * @param formData Form data to save
 * @param options Additional save options
 * @returns Promise<boolean> indicating success or failure
 */
export async function fixedUniversalSaveProgress(
  taskId: number,
  taskType: string,
  formData: Record<string, any>,
  options: {
    preserveProgress?: boolean;
    isFormEditing?: boolean;
    source?: string;
  } = {}
): Promise<boolean> {
  const lowerTaskType = taskType.toLowerCase();
  const source = options.source || 'universal-save';
  
  logger.info(`Saving progress for ${lowerTaskType} task ${taskId} via unified save`, {
    fieldCount: Object.keys(formData).length,
    preserveProgress: options.preserveProgress !== false,
    source
  });
  
  try {
    // For KY3P forms, use the standardized bulk update function
    if (lowerTaskType === 'ky3p') {
      return await standardizedBulkUpdate(taskId, formData, {
        preserveProgress: options.preserveProgress,
        isFormEditing: options.isFormEditing,
        source
      });
    }
    
    // Determine the appropriate endpoint based on task type
    let endpoint = '';
    let bodyFormat: any = {};
    
    // Create a standardized responses object - all endpoints should accept this format
    const responseObj: Record<string, any> = {};
    Object.entries(formData).forEach(([key, value]) => {
      responseObj[key] = value;
    });
    
    switch (lowerTaskType) {
      case 'kyb':
        endpoint = `/api/kyb/bulk-update/${taskId}`;
        bodyFormat = { responses: responseObj };
        break;
        
      case 'open_banking':
      case 'open_banking_survey':
        endpoint = `/api/open-banking/bulk-update/${taskId}`;
        bodyFormat = { responses: responseObj };
        break;
        
      default:
        endpoint = `/api/${lowerTaskType}/bulk-update/${taskId}`;
        bodyFormat = { responses: responseObj };
        logger.warn(`Using generic endpoint for form type: ${lowerTaskType}`);
    }
    
    // For clearing, empty formData should use the clear-fields endpoint with preserveProgress=true
    if (Object.keys(formData).length === 0) {
      logger.info(`Empty form data detected, using clear-fields endpoint with preserveProgress for ${lowerTaskType}`);
      endpoint = `/api/${lowerTaskType}/clear-fields/${taskId}?preserveProgress=true`;
      bodyFormat = {};
    }
    
    logger.info(`Saving to endpoint: ${endpoint}`);
    
    // Make the API request using consistent format
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        ...bodyFormat,
        preserveProgress: options.preserveProgress !== false
      }),
    });
    
    if (!response.ok) {
      try {
        const errorText = await response.text();
        logger.error(`API error (${response.status}): ${errorText}`);
      } catch (e) {
        logger.error(`API error (${response.status}): Could not read error response`);
      }
      return false;
    }
    
    logger.info(`Successfully saved form data for ${lowerTaskType} task ${taskId}`);
    return true;
  } catch (error) {
    logger.error(`Error in unified form save:`, error);
    return false;
  }
}