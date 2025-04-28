/**
 * Fix for Universal Form Bulk Save Issue
 * 
 * This module provides a fixed implementation for the bulk save functionality
 * that was failing with the "Invalid field ID format" error.
 */

import { apiRequest } from "@/lib/queryClient";
import { standardizedBulkUpdate } from "./standardized-ky3p-update";
import getLogger from "@/utils/logger";

const logger = getLogger('FixUniversalBulkSave');

/**
 * Fixed implementation for saving form progress
 * This function identifies the form type and uses the appropriate method to save
 * 
 * @param taskId Task ID
 * @param taskType Type of task (e.g., 'ky3p', 'kyb', 'open_banking')
 * @param formData Form data to save
 * @returns Promise that resolves to success status
 */
export async function fixedUniversalSaveProgress(
  taskId: number,
  taskType: string,
  formData: Record<string, any>
): Promise<boolean> {
  try {
    logger.info(`Saving progress for ${taskType} task ${taskId} (${Object.keys(formData).length} fields)`);
    
    // Handle specific form types
    const normalizedType = taskType.toLowerCase();
    
    if (normalizedType === 'ky3p') {
      // Use the standardized KY3P bulk update
      return await standardizedBulkUpdate(taskId, formData);
    } 
    else if (normalizedType === 'kyb') {
      // KYB uses a different endpoint format
      try {
        const response = await apiRequest('POST', `/api/tasks/${taskId}/kyb-responses/batch`, {
          responses: formData
        });
        return response.ok;
      } catch (error) {
        logger.error(`Error saving KYB progress:`, error);
        return false;
      }
    }
    else if (normalizedType === 'open_banking') {
      // Open Banking uses a similar endpoint format to KYB
      try {
        const response = await apiRequest('POST', `/api/tasks/${taskId}/open-banking-responses/batch`, {
          responses: formData
        });
        return response.ok;
      } catch (error) {
        logger.error(`Error saving Open Banking progress:`, error);
        return false;
      }
    }
    else {
      // Generic fallback approach for unknown form types
      try {
        const response = await apiRequest('POST', `/api/tasks/${taskId}/update-progress`, {
          formData
        });
        return response.ok;
      } catch (error) {
        logger.error(`Error saving generic progress:`, error);
        return false;
      }
    }
  } catch (error) {
    logger.error(`Error in universal save progress:`, error);
    return false;
  }
}