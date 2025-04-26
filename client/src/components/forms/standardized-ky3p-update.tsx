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
      let errorMessage = `Batch update failed: ${response.status}`;
      try {
        // Use optional chaining to safely access response.text if it's a function
        if (typeof response.text === 'function') {
          errorMessage += ` - ${await response.text()}`;
        }
      } catch (textError) {
        console.warn('Could not extract error text from response:', textError);
      }
      throw new Error(errorMessage);
    }
    
    let result;
    try {
      // Use optional chaining to safely access response.json if it's a function
      if (typeof response.json === 'function') {
        result = await response.json();
        console.log(`Batch update success: ${result.processedCount || 0} fields updated`);
      } else {
        // If response is already parsed JSON (which happens with some fetch implementations)
        result = response;
        console.log(`Batch update success, response already parsed`);
      }
    } catch (jsonError) {
      console.warn('Could not parse JSON response:', jsonError);
      // Continue despite JSON parsing error
      result = { success: true };
    }
    
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
 * by calling the dedicated clear-fields endpoint.
 * 
 * @param taskId The task ID to clear
 * @returns Promise<boolean> Success or failure
 */
export async function standardizedFormClear(
  taskId: number
): Promise<boolean> {
  try {
    console.log(`Standardized KY3P Form Clear for task ${taskId}`);
    
    // Call the dedicated clear-fields endpoint
    const response = await apiRequest('POST', `/api/ky3p/clear-fields/${taskId}`, {});
    
    // Check if the request was successful
    if (!response.ok) {
      let errorMessage = `Form clear failed: ${response.status}`;
      try {
        // Use optional chaining to safely access response.text if it's a function
        if (typeof response.text === 'function') {
          errorMessage += ` - ${await response.text()}`;
        }
      } catch (textError) {
        console.warn('Could not extract error text from response:', textError);
      }
      throw new Error(errorMessage);
    }
    
    let result;
    try {
      // Use optional chaining to safely access response.json if it's a function
      if (typeof response.json === 'function') {
        result = await response.json();
        console.log(`Form clear success: All fields cleared`);
      } else {
        // If response is already parsed JSON (which happens with some fetch implementations)
        result = response;
        console.log(`Form clear success, response already parsed`);
      }
    } catch (jsonError) {
      console.warn('Could not parse JSON response from clear-fields endpoint:', jsonError);
      // Continue despite JSON parsing error
      result = { success: true };
    }
    
    return true;
  } catch (error) {
    console.error('Error in standardizedFormClear:', error);
    throw error;
  }
}