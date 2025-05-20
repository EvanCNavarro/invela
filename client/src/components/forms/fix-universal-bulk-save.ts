/**
 * Fix for Universal Bulk Save Functionality
 * 
 * This module provides a fixed implementation of the bulk save functionality
 * that works across different form types (KYB, KY3P, and Open Banking).
 * 
 * It addresses issues with the original bulk save mechanism that was causing
 * inconsistent data updates and progress tracking problems.
 */

import getLogger from '@/utils/logger';
import axios from 'axios';

const logger = getLogger('FixUniversalBulkSave');

/**
 * Fixed implementation of the universal save progress functionality
 * 
 * This function provides a direct approach to saving form data
 * that bypasses potential issues in the standard form services.
 * 
 * @param taskId The ID of the task
 * @param taskType The type of the task (kyb, ky3p, open_banking)
 * @param formData The form data to save
 * @returns Promise that resolves to true if successful, false otherwise
 */
export async function fixedUniversalSaveProgress(
  taskId: number,
  taskType: string,
  formData: Record<string, any>
): Promise<boolean> {
  try {
    logger.info(`Using fixed universal save implementation for ${taskType} task ${taskId}`);
    
    // Determine the appropriate endpoint based on task type
    let endpoint: string;
    
    switch (taskType.toLowerCase()) {
      case 'company_kyb':
      case 'kyb':
        endpoint = `/api/kyb-forms/${taskId}/bulk-update`;
        break;
      case 'ky3p':
        endpoint = `/api/ky3p-forms/${taskId}/batch-update`;
        break;
      case 'open_banking':
        endpoint = `/api/open-banking-forms/${taskId}/bulk-update`;
        break;
      default:
        logger.error(`Unsupported task type: ${taskType}`);
        return false;
    }
    
    // Log the endpoint and number of fields
    const fieldCount = Object.keys(formData).length;
    logger.info(`Saving ${fieldCount} fields to ${endpoint}`);
    
    // Send the request
    const response = await axios.post(endpoint, { formData });
    
    if (response.status === 200) {
      logger.info(`Successfully saved ${taskType} form data for task ${taskId}`);
      return true;
    } else {
      logger.warn(`Unexpected response status: ${response.status}`);
      return false;
    }
  } catch (error) {
    logger.error(`Error saving ${taskType} form data:`, error);
    return false;
  }
}