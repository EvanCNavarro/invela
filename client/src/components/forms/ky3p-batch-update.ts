/**
 * KY3P Batch Update Helper
 * 
 * This helper provides functionality to standardize form data between KYB and KY3P
 * form services, enabling the demo auto-fill to work seamlessly with both formats.
 * 
 * Problem: KY3P form service expects an array of response objects with fieldId and value,
 * but KYB form service uses a key-value object for responses.
 * 
 * Solution: This helper converts from the KYB format to the KY3P format and handles
 * the API communication with proper error handling.
 */

import { toast } from "@/hooks/use-toast";
import getLogger from "@/utils/logger";
import { apiRequest } from "@/lib/queryClient";

// Type for the Response object returned by fetch
interface ApiResponse extends Response {
  ok: boolean;
  status: number;
  text(): Promise<string>;
  json<T>(): Promise<T>;
}

const logger = getLogger('KY3P.BatchUpdate');

/**
 * Convert an object of key-value pairs to an array of KY3P response objects
 * 
 * @param responses - The object containing field keys and values
 * @returns An array of KY3P response objects with fieldId and value
 */
export function convertToKy3pResponseFormat(responses: Record<string, any>): Array<{fieldId: string, value: any}> {
  // Filter out metadata fields (starting with underscore)
  const filteredResponses = Object.entries(responses).filter(([key]) => !key.startsWith('_'));
  
  // Convert to the array format expected by KY3P API
  return filteredResponses.map(([key, value]) => ({
    fieldId: key,
    value: value,
  }));
}

/**
 * Update KY3P responses for a task using the KYB response format
 * 
 * @param taskId - The ID of the KY3P task to update
 * @param responses - The responses in KYB format (key-value object)
 * @returns Promise resolving to a boolean indicating success
 */
export async function batchUpdateKy3pResponses(
  taskId: number,
  responses: Record<string, any>
): Promise<boolean> {
  try {
    logger.info('Converting responses to KY3P format', { 
      taskId, 
      responseCount: Object.keys(responses).length 
    });
    
    // Convert to the format expected by the KY3P API
    const convertedResponses = convertToKy3pResponseFormat(responses);
    
    logger.info('Sending batch update request', { 
      taskId, 
      convertedResponseCount: convertedResponses.length 
    });
    
    // Send the update request
    const response = await apiRequest('POST', `/api/ky3p/${taskId}/responses`, {
      responses: convertedResponses,
    }) as ApiResponse;
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update KY3P responses: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json() as { updatedCount?: number, progress?: number };
    
    logger.info('Batch update successful', { 
      taskId, 
      updatedCount: result.updatedCount || 0,
      progress: result.progress || 0
    });
    
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error updating KY3P responses', { taskId, error: errorMessage });
    
    toast({
      title: 'Failed to update responses',
      description: errorMessage,
      variant: 'destructive',
    });
    
    return false;
  }
}

/**
 * Utility function to load responses from the KY3P server
 * 
 * @param taskId - The ID of the KY3P task
 * @returns Promise resolving to the responses or null if failed
 */
export async function loadKy3pResponses(taskId: number): Promise<Record<string, any> | null> {
  try {
    const response = await apiRequest('GET', `/api/ky3p/progress/${taskId}`) as ApiResponse;
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to load KY3P responses: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json() as { formData?: Record<string, any> };
    
    return result.formData || {};
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error loading KY3P responses', { taskId, error: errorMessage });
    
    toast({
      title: 'Failed to load responses',
      description: errorMessage,
      variant: 'destructive',
    });
    
    return null;
  }
}