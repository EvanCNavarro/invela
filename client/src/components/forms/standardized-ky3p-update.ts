/**
 * Standardized KY3P Batch Update
 * 
 * This module provides a standardized approach to updating KY3P form fields
 * using string-based field keys, ensuring compatibility with the universal
 * form components.
 * 
 * KISS PRINCIPLE IMPLEMENTATION: This file has been simplified to use a single,
 * consistent approach to batch updates to improve reliability and maintainability.
 */

import getLogger from "@/utils/logger";

const logger = getLogger('StandardizedKY3PUpdate');

/**
 * Perform a standardized bulk update for a KY3P form
 * 
 * This function uses the most reliable approach (responses array format)
 * and ensures progress is preserved by default.
 * 
 * @param taskId The task ID
 * @param formData The form data to update (field keys to values)
 * @param options Optional configuration
 * @returns Promise that resolves to true if successful, false otherwise
 */
export async function standardizedBulkUpdate(
  taskId: number | undefined,
  formData: Record<string, any>,
  options: {
    preserveProgress?: boolean;
    isFormEditing?: boolean;
    source?: string;
  } = {}
): Promise<boolean> {
  // Verify taskId is provided
  if (!taskId) {
    logger.error('standardizedBulkUpdate called without a taskId');
    return false;
  }
  
  try {
    // Default to preserving progress unless explicitly set to false
    const preserveProgress = options.preserveProgress !== false;
    const source = options.source || (options.isFormEditing ? 'form-editing' : 'standardized-update');
    
    logger.info(`Performing standardized bulk update for task ${taskId} with ${Object.keys(formData).length} fields`, {
      preserveProgress,
      isFormEditing: options.isFormEditing,
      source
    });
    
    // Prepare data in the responses array format
    const responsesData = {
      responses: Object.entries(formData).map(([fieldKey, value]) => ({
        fieldKey,
        value
      }))
    };
    
    // Construct URL with appropriate query parameters
    let batchUpdateUrl = `/api/ky3p/batch-update/${taskId}`;
    const queryParams = [];
    
    if (!preserveProgress) {
      queryParams.push('preserveProgress=false');
    }
    
    if (source) {
      queryParams.push(`source=${encodeURIComponent(source)}`);
    }
    
    if (queryParams.length > 0) {
      batchUpdateUrl += `?${queryParams.join('&')}`;
    }
    
    // Make the request with the responses array format
    const response = await fetch(batchUpdateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        ...responsesData,
        preserveProgress // Include preserveProgress in request body for clarity
      })
    });
    
    // Process the response
    if (response.ok) {
      try {
        const data = await response.json();
        logger.info(`Bulk update successful: ${JSON.stringify(data)}`);
        
        // Check for processedCount to verify fields were processed
        if (data && data.processedCount > 0) {
          logger.info(`Verified ${data.processedCount} fields were processed`);
          
          // If the response included progress info, log it
          if (data.progress !== undefined) {
            logger.info(`Server calculated progress: ${data.progress}%`);
          }
          
          return true;
        }
      } catch (parseError) {
        // Even if we can't parse the JSON, the 200 OK means success
        logger.warn('Could not parse JSON response, but update was successful');
      }
      
      return true;
    } else {
      // Handle error response
      try {
        const errorText = await response.text();
        logger.error(`Batch update failed with status ${response.status}: ${errorText}`);
      } catch (e) {
        logger.error(`Batch update failed with status ${response.status}`);
      }
      
      return false;
    }
  } catch (error) {
    logger.error('Error in standardized bulk update:', error);
    return false;
  }
}