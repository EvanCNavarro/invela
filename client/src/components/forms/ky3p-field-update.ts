/**
 * KY3P Field Update Implementation
 * 
 * This module provides a specialized approach for KY3P field updates
 * that uses the correct endpoint and data format expected by the API.
 */

import getLogger from '@/utils/logger';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

const logger = getLogger('KY3PFieldUpdate');

/**
 * Update a single KY3P field with the correct endpoint format
 * 
 * This function handles the update of a single KY3P field using the specific endpoint
 * format required by the KY3P API: `/api/ky3p-fields/${taskId}/update`
 * 
 * @param taskId The task ID
 * @param fieldKey The field key to update
 * @param value The value to set
 * @returns Promise<{success: boolean, progress?: number, status?: string}> Result with progress info
 */
export async function updateKY3PField(
  taskId: number,
  fieldKey: string,
  value: any
): Promise<{
  success: boolean;
  progress?: number;
  status?: string;
}> {
  if (!taskId) {
    logger.error('No task ID provided for KY3P field update');
    return { success: false };
  }

  try {
    logger.info(`Updating KY3P field ${fieldKey} for task ${taskId} using direct endpoint`);

    // Format the data as expected by the API
    const requestData = {
      field_key: fieldKey,
      value
    };

    // Call the endpoint that works with KY3P fields for a single field update
    const response = await apiRequest('POST', `/api/ky3p-fields/${taskId}/update-field`, requestData);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error(`Failed to update KY3P field: ${response.status}`, errorData);
      return { success: false };
    }

    // Parse the response to get progress and status updates
    const result = await response.json();
    
    logger.info(`Successfully updated KY3P field ${fieldKey} for task ${taskId}`, {
      progress: result.progress,
      status: result.status
    });
    
    return {
      success: true,
      progress: result.progress,
      status: result.status
    };
  } catch (error) {
    logger.error('Error updating KY3P field:', error);
    
    // Show error toast notification
    toast({
      title: 'Error updating KY3P field',
      description: error instanceof Error ? error.message : 'Unknown error',
      variant: 'destructive',
    });
    
    return { success: false };
  }
}

/**
 * Update multiple KY3P fields with the correct endpoint format
 * 
 * This function handles the update of KY3P fields using the specific endpoint
 * format required by the KY3P API: `/api/ky3p-fields/${taskId}/update`
 * 
 * @param taskId The task ID
 * @param formData The form data to update
 * @returns Promise<boolean> Success or failure status
 */
export async function updateKY3PFields(
  taskId: number,
  formData: Record<string, any>
): Promise<boolean> {
  if (!taskId) {
    logger.error('No task ID provided for KY3P field update');
    return false;
  }

  try {
    logger.info(`Updating KY3P fields for task ${taskId} using direct endpoint`);

    // Format the data as expected by the API
    const fieldUpdates = Object.entries(formData).map(([fieldKey, value]) => ({
      field_key: fieldKey,
      value
    }));

    // Call the endpoint that works with KY3P fields
    const response = await apiRequest('POST', `/api/ky3p-fields/${taskId}/update`, fieldUpdates);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error(`Failed to update KY3P fields: ${response.status}`, errorData);
      return false;
    }

    logger.info(`Successfully updated ${fieldUpdates.length} KY3P fields for task ${taskId}`);
    return true;
  } catch (error) {
    logger.error('Error updating KY3P fields:', error);
    
    // Show error toast notification
    toast({
      title: 'Error updating KY3P fields',
      description: error instanceof Error ? error.message : 'Unknown error',
      variant: 'destructive',
    });
    
    return false;
  }
}