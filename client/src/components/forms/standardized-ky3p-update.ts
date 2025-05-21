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
    operationId?: string;
  } = {}
): Promise<boolean> {
  const operationId = options.operationId || `bulk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const startTime = Date.now();
  
  // Verify taskId is provided
  if (!taskId) {
    logger.error(`[StandardizedKY3PUpdate][${operationId}] Bulk update called without a taskId`, {
      operationId,
      timestamp: new Date().toISOString(),
      fieldCount: Object.keys(formData || {}).length,
      options
    });
    return false;
  }
  
  try {
    // Default to preserving progress unless explicitly set to false
    const preserveProgress = options.preserveProgress !== false;
    const source = options.source || (options.isFormEditing ? 'form-editing' : 'standardized-update');
    
    logger.info(`[StandardizedKY3PUpdate][${operationId}] Starting bulk update for task ${taskId} with ${Object.keys(formData).length} fields`, {
      operationId,
      taskId,
      preserveProgress,
      isFormEditing: options.isFormEditing,
      source,
      timestamp: new Date().toISOString(),
      fieldCount: Object.keys(formData).length,
      fieldKeysSample: Object.keys(formData).slice(0, 5)
    });
    
    // Prepare data in the responses format expected by the server
    // Server expects { responses: { key1: value1, key2: value2 } } format
    // NOT the fieldKey/value array format used by some other endpoints
    const responses: Record<string, any> = {};
    
    // Convert form data to key-value pairs
    Object.entries(formData).forEach(([fieldKey, value]) => {
      responses[fieldKey] = value;
    });
    
    // Package in the expected format
    const responsesData = { responses };
    
    logger.debug(`[StandardizedKY3PUpdate][${operationId}] Prepared response data object with ${Object.keys(responses).length} fields`, {
      operationId,
      taskId,
      responseKeysCount: Object.keys(responses).length,
      dataFormat: 'responses_object'
    });
    
    // Construct URL with appropriate query parameters
    let batchUpdateUrl = `/api/ky3p/batch-update/${taskId}`;
    const queryParams = [];
    
    if (!preserveProgress) {
      queryParams.push('preserveProgress=false');
    }
    
    if (source) {
      queryParams.push(`source=${encodeURIComponent(source)}`);
    }
    
    // Add operation ID to help trace requests
    queryParams.push(`opId=${encodeURIComponent(operationId)}`);
    
    if (queryParams.length > 0) {
      batchUpdateUrl += `?${queryParams.join('&')}`;
    }
    
    logger.info(`[StandardizedKY3PUpdate][${operationId}] Constructed batch update URL: ${batchUpdateUrl}`, {
      operationId,
      taskId,
      url: batchUpdateUrl,
      preserveProgressInQuery: batchUpdateUrl.includes('preserveProgress=false') ? false : true,
      source
    });
    
    // Make the request with the responses array format
    logger.info(`[StandardizedKY3PUpdate][${operationId}] Sending batch update request with ${Object.keys(responses).length} fields`, {
      operationId,
      taskId,
      fieldCount: Object.keys(responses).length,
      preserveProgress,
      requestStartTime: new Date().toISOString()
    });
    
    const requestStartTime = Date.now();
    const response = await fetch(batchUpdateUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Operation-ID': operationId
      },
      credentials: 'include',
      body: JSON.stringify({
        ...responsesData,
        preserveProgress, // Include preserveProgress in request body for clarity
        operationId // Include operation ID for tracing in logs
      })
    });
    const requestDuration = Date.now() - requestStartTime;
    
    // Process the response
    if (response.ok) {
      try {
        const data = await response.json();
        logger.info(`[StandardizedKY3PUpdate][${operationId}] Bulk update successful in ${requestDuration}ms`, {
          operationId,
          taskId,
          requestDurationMs: requestDuration,
          responseData: data,
          status: response.status,
          preserveProgress
        });
        
        // Check for processedCount to verify fields were processed
        if (data && data.processedCount > 0) {
          logger.info(`[StandardizedKY3PUpdate][${operationId}] Verified ${data.processedCount} fields were processed`, {
            operationId,
            taskId,
            processedCount: data.processedCount,
            fieldCount: Object.keys(responses).length,
            allFieldsProcessed: data.processedCount === Object.keys(responses).length
          });
          
          // If the response included progress info, log it
          if (data.progress !== undefined) {
            logger.info(`[StandardizedKY3PUpdate][${operationId}] Server calculated progress: ${data.progress}%`, {
              operationId,
              taskId,
              progress: data.progress,
              preserveProgress
            });
          }
          
          return true;
        }
      } catch (parseError) {
        // Even if we can't parse the JSON, the 200 OK means success
        logger.warn(`[StandardizedKY3PUpdate][${operationId}] Could not parse JSON response, but update was successful`, {
          operationId,
          taskId,
          error: String(parseError),
          statusCode: response.status
        });
      }
      
      return true;
    } else {
      // Handle error response
      let errorDetails;
      try {
        errorDetails = await response.text();
        logger.error(`[StandardizedKY3PUpdate][${operationId}] Batch update failed with status ${response.status}`, {
          operationId,
          taskId,
          statusCode: response.status,
          statusText: response.statusText,
          durationMs: requestDuration,
          errorDetails,
          preserveProgress
        });
      } catch (e) {
        logger.error(`[StandardizedKY3PUpdate][${operationId}] Batch update failed with status ${response.status}`, {
          operationId,
          taskId,
          statusCode: response.status,
          statusText: response.statusText,
          durationMs: requestDuration,
          errorGettingDetails: true,
          preserveProgress
        });
      }
      
      return false;
    }
  } catch (error) {
    logger.error(`[StandardizedKY3PUpdate][${operationId}] Error in standardized bulk update:`, error, {
      operationId,
      taskId,
      totalDurationMs: Date.now() - startTime,
      errorName: error?.name,
      errorMessage: error?.message,
      preserveProgress: options.preserveProgress
    });
    return false;
  }
}