/**
 * KYB Field Update Implementation
 * 
 * This module provides a specialized approach for KYB field updates
 * that uses the correct endpoint and data format expected by the API.
 */

import getLogger from '@/utils/logger';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

const logger = getLogger('KYBFieldUpdate');

/**
 * Update a single KYB field with the correct endpoint format
 * 
 * This function handles the update of KYB fields using the specific endpoint
 * format required by the KYB API: `/api/kyb-fields/${taskId}/update`
 * 
 * @param taskId The task ID
 * @param fieldKey The field key to update
 * @param value The value to set
 * @returns Promise<boolean> Success or failure status
 */
export async function updateKYBField(
  taskId: number,
  fieldKey: string,
  value: any
): Promise<{
  success: boolean;
  progress?: number;
  status?: string;
}> {
  if (!taskId) {
    logger.error('No task ID provided for KYB field update');
    return { success: false };
  }

  try {
    logger.info(`Updating KYB field ${fieldKey} for task ${taskId} using direct endpoint`);

    // Format the data as expected by the API
    const requestData = {
      fieldKey,
      value
    };

    // Call the endpoint that works with KYB fields
    const response = await apiRequest('POST', `/api/kyb-fields/${taskId}/update`, requestData);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error(`Failed to update KYB field: ${response.status}`, errorData);
      return { success: false };
    }

    // Parse the response to get progress and status updates
    const result = await response.json();
    
    logger.info(`Successfully updated KYB field ${fieldKey} for task ${taskId}`, {
      progress: result.progress,
      status: result.status
    });
    
    return {
      success: true,
      progress: result.progress,
      status: result.status
    };
  } catch (error) {
    logger.error('Error updating KYB field:', error);
    
    // Show error toast notification
    toast({
      title: 'Error updating KYB field',
      description: error instanceof Error ? error.message : 'Unknown error',
      variant: 'destructive',
    });
    
    return { success: false };
  }
}

/**
 * Update multiple KYB fields with the correct endpoint format
 * 
 * This function updates multiple KYB fields by making individual API calls for each field.
 * 
 * @param taskId The task ID
 * @param formData The form data containing multiple fields to update
 * @returns Promise<boolean> Success or failure status
 */
export async function updateKYBFields(
  taskId: number,
  formData: Record<string, any>
): Promise<boolean> {
  if (!taskId) {
    logger.error('No task ID provided for KYB fields update');
    return false;
  }

  try {
    logger.info(`Updating ${Object.keys(formData).length} KYB fields for task ${taskId}`);

    // Update each field individually
    const updatePromises = Object.entries(formData).map(async ([fieldKey, value]) => {
      return updateKYBField(taskId, fieldKey, value);
    });

    // Wait for all updates to complete
    const results = await Promise.all(updatePromises);
    
    // Check if all updates were successful
    const allSuccessful = results.every(result => result.success);
    
    if (allSuccessful) {
      logger.info(`Successfully updated all ${results.length} KYB fields for task ${taskId}`);
    } else {
      const failedCount = results.filter(result => !result.success).length;
      logger.warn(`Failed to update ${failedCount} out of ${results.length} KYB fields for task ${taskId}`);
    }
    
    return allSuccessful;
  } catch (error) {
    logger.error('Error updating multiple KYB fields:', error);
    
    // Show error toast notification
    toast({
      title: 'Error updating KYB fields',
      description: error instanceof Error ? error.message : 'Unknown error',
      variant: 'destructive',
    });
    
    return false;
  }
}