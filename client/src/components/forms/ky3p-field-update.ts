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
 * Update KY3P fields with the correct endpoint format
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