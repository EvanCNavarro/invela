/**
 * Standardized KY3P Update Functions
 * 
 * This module provides utilities for performing bulk updates on KY3P forms
 * using the standardized approach with string-based field keys.
 */

import getLogger from "@/utils/logger";

const logger = getLogger('StandardizedKY3PUpdate');

/**
 * Track the endpoints that have worked in the past
 * This helps optimize subsequent requests by trying successful endpoints first
 */
let successfulEndpoint: string | null = null;

/**
 * Standardized bulk update for KY3P forms
 * 
 * This function tries multiple endpoints and formats for bulk updating KY3P form data,
 * handling the "Invalid field ID format" error by properly formatting requests.
 * 
 * @param taskId The task ID
 * @param formData The form data to update (field_key => value)
 * @returns Promise<boolean> Success or failure status
 */
export async function standardizedBulkUpdate(
  taskId: number,
  formData: Record<string, any>
): Promise<boolean> {
  try {
    logger.info(`Performing standardized bulk update for task ${taskId} with ${Object.keys(formData).length} fields`);
    
    // Define all the endpoints we'll try in sequence
    // If we have a successful endpoint from a previous attempt, try it first
    let endpoints = [
      `/api/ky3p/batch-update/${taskId}`,        // Standardized key-based batch update endpoint
      `/api/tasks/${taskId}/ky3p-batch-update`,  // Original task batch update endpoint
      `/api/ky3p/responses/bulk/${taskId}`,      // Old bulk update endpoint
      `/api/batch-update/${taskId}`              // Universal batch update endpoint
    ];
    
    // If we have a successful endpoint from a previous call, prioritize it
    if (successfulEndpoint) {
      endpoints = [
        successfulEndpoint,
        ...endpoints.filter(endpoint => endpoint !== successfulEndpoint)
      ];
    }
    
    let lastError: string | null = null;
    
    // Try each endpoint in sequence
    for (const endpoint of endpoints) {
      try {
        logger.info(`Trying batch update endpoint: ${endpoint}`);
        
        // For standardized endpoints, we can just pass the field key -> value mapping directly
        const body = {
          responses: formData
        };
        
        const response = await fetch(endpoint, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          lastError = `${response.status} - ${errorText}`;
          logger.warn(`Endpoint ${endpoint} failed: ${lastError}`);
          continue;
        }
        
        // If we get here, the update was successful
        logger.info(`Successfully updated using endpoint: ${endpoint}`);
        
        // Remember this endpoint for future calls
        successfulEndpoint = endpoint;
        
        return true;
      } catch (endpointError) {
        lastError = endpointError instanceof Error ? endpointError.message : String(endpointError);
        logger.error(`Error with endpoint ${endpoint}:`, endpointError);
      }
    }
    
    // If we get here, all endpoints failed
    throw new Error(`Failed to perform bulk update after trying multiple endpoints: ${lastError}`);
  } catch (error) {
    logger.error(`Error in standardizedBulkUpdate:`, error);
    return false;
  }
}

/**
 * Update a single field in a KY3P form
 * 
 * @param taskId The task ID
 * @param fieldKey The field key (string-based identifier)
 * @param value The new value for the field
 * @returns Promise<boolean> Success or failure status
 */
export async function standardizedFieldUpdate(
  taskId: number,
  fieldKey: string,
  value: any
): Promise<boolean> {
  // For single field updates, we can just use the bulk update with a single field
  return standardizedBulkUpdate(taskId, { [fieldKey]: value });
}