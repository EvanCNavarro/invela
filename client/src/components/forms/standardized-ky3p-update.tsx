import { apiRequest } from '@/lib/queryClient';

/**
 * Standardized approach for bulk updating KY3P forms
 * 
 * This function provides a consistent way to update multiple KY3P form fields
 * in a single API call, using the standardized string key-based approach.
 * 
 * @param taskId The task ID to update
 * @param formData An object with field keys mapped to their values
 * @returns Promise<boolean> Success or failure
 */
export async function standardizedBulkUpdate(
  taskId: number,
  formData: Record<string, any>
): Promise<boolean> {
  try {
    console.log(`Standardized KY3P Bulk Update for task ${taskId} with ${Object.keys(formData).length} fields`);
    
    // Call the batch update endpoint
    const response = await apiRequest('POST', `/api/ky3p/batch-update/${taskId}`, { 
      responses: formData 
    });
    
    // Check if the request was successful
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Batch update failed: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log(`Batch update success: ${result.updatedCount} fields updated`);
    
    return true;
  } catch (error) {
    console.error('Error in standardizedBulkUpdate:', error);
    throw error;
  }
}

/**
 * Standardized approach for clearing KY3P form fields
 * 
 * This function provides a consistent way to clear all fields in a KY3P form
 * by sending empty values for each field.
 * 
 * @param taskId The task ID to clear
 * @param fieldKeys Array of field keys to clear
 * @returns Promise<boolean> Success or failure
 */
export async function standardizedFormClear(
  taskId: number,
  fieldKeys: string[]
): Promise<boolean> {
  try {
    console.log(`Standardized KY3P Form Clear for task ${taskId} with ${fieldKeys.length} fields`);
    
    // Create a form data object with empty values for each field
    const emptyFormData: Record<string, any> = {};
    fieldKeys.forEach(key => {
      emptyFormData[key] = '';
    });
    
    // Use the batch update endpoint to clear all fields
    return await standardizedBulkUpdate(taskId, emptyFormData);
  } catch (error) {
    console.error('Error in standardizedFormClear:', error);
    throw error;
  }
}