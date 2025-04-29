/**
 * Universal Form Bulk Save Fix
 * 
 * This module provides a fixed universal bulk save function for form data
 * that works across all form types, with fallbacks for older form data formats.
 */

import getLogger from '@/utils/logger';

const logger = getLogger('FixedUniversalBulkSave');

/**
 * Fixed universal save progress function that works with all form types
 * 
 * This uses standardized endpoint formats and handles different saving patterns consistently
 * 
 * @param taskId Task ID
 * @param taskType Form type (kyb, ky3p, open_banking)
 * @param formData Form data to save
 * @returns Promise<boolean> indicating success or failure
 */
export async function fixedUniversalSaveProgress(
  taskId: number,
  taskType: string,
  formData: Record<string, any>
): Promise<boolean> {
  logger.info(`Saving progress for ${taskType} task ${taskId} via fixed universal save`);
  
  const lowerTaskType = taskType.toLowerCase();
  
  try {
    // Determine the appropriate endpoint based on task type
    let endpoint = '';
    let method = 'POST';
    let bodyData: any = {};
    
    switch (lowerTaskType) {
      case 'kyb':
        endpoint = `/api/kyb/bulk-update/${taskId}`;
        bodyData = { responses: formData };
        break;
        
      case 'ky3p':
        endpoint = `/api/ky3p/batch-update/${taskId}`;
        bodyData = { responses: formData };
        break;
        
      case 'open_banking':
      case 'open_banking_survey':
        endpoint = `/api/open-banking/bulk-update/${taskId}`;
        bodyData = { responses: formData };
        break;
        
      default:
        endpoint = `/api/${lowerTaskType}/bulk-update/${taskId}`;
        bodyData = { responses: formData };
        logger.warn(`Using generic endpoint for unknown form type: ${lowerTaskType}`);
    }
    
    // For clearing, empty formData should use the clear-fields endpoint
    if (Object.keys(formData).length === 0) {
      logger.info(`Empty form data detected, using clear-fields endpoint for ${lowerTaskType}`);
      endpoint = `/api/${lowerTaskType}/clear-fields/${taskId}`;
    }
    
    logger.info(`Saving to endpoint: ${endpoint}`);
    
    // Make the API request
    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(bodyData),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`API error (${response.status}): ${errorText}`);
      return false;
    }
    
    logger.info(`Successfully saved form data for ${lowerTaskType} task ${taskId}`);
    return true;
  } catch (error) {
    logger.error(`Error in fixedUniversalSaveProgress:`, error);
    return false;
  }
}