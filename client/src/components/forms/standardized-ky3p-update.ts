/**
 * Standardized KY3P Bulk Update
 * 
 * This module provides an optimized implementation for KY3P forms
 * that standardizes the bulk update process across different KY3P implementations.
 */

import getLogger from '@/utils/logger';
import axios from 'axios';

const logger = getLogger('StandardizedKY3PUpdate');

/**
 * Options for the standardized bulk update
 */
export interface StandardizedBulkUpdateOptions {
  /** Whether to preserve the current progress calculation */
  preserveProgress?: boolean;
  
  /** Source of the update (auto-save, bulk-save, etc.) */
  source?: string;
}

/**
 * Perform a standardized bulk update for KY3P forms
 * 
 * This function provides a direct approach to saving KY3P form data
 * that addresses issues in various KY3P implementations.
 * 
 * @param taskId The ID of the task
 * @param formData The form data to save
 * @param options Optional settings for the save operation
 * @returns Promise that resolves to true if successful, false otherwise
 */
export async function standardizedBulkUpdate(
  taskId: number,
  formData: Record<string, any>,
  options?: StandardizedBulkUpdateOptions
): Promise<boolean> {
  try {
    const source = options?.source || 'manual';
    const preserveProgress = options?.preserveProgress === true;
    
    logger.info(`Using standardized KY3P bulk update for task ${taskId} (source: ${source})`);
    
    // KY3P forms use the batch-update endpoint
    const endpoint = `/api/ky3p-forms/${taskId}/batch-update`;
    
    // Log the endpoint and number of fields
    const fieldCount = Object.keys(formData).length;
    logger.info(`Saving ${fieldCount} KY3P fields to ${endpoint} (preserveProgress: ${preserveProgress})`);
    
    // Send the request with additional options
    const response = await axios.post(endpoint, { 
      formData,
      preserveProgress,
      source
    });
    
    if (response.status === 200) {
      logger.info(`Successfully saved KY3P form data for task ${taskId}`);
      return true;
    } else {
      logger.warn(`Unexpected response status: ${response.status}`);
      return false;
    }
  } catch (error) {
    logger.error(`Error saving KY3P form data:`, error);
    return false;
  }
}