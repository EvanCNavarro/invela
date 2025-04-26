/**
 * Direct KY3P Clear Function
 * 
 * This is a specialized function to clear KY3P forms by directly calling
 * the KY3P clear endpoint we created, bypassing the form service's bulk update
 * which is causing the "Invalid field ID format" error.
 */

import { toast } from "@/hooks/use-toast";

/**
 * Clear all KY3P responses for a task and reset task status to "not_started"
 * 
 * @param taskId The KY3P task ID to clear
 * @returns A promise that resolves to the API response
 */
export async function directClearKy3pTask(taskId: number): Promise<{ success: boolean, message: string }> {
  console.log(`[DirectKY3PClear] Clearing KY3P task ${taskId}`);
  
  try {
    // Call our fixed /api/ky3p/clear/:taskId endpoint directly
    const response = await fetch(`/api/ky3p/clear/${taskId}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[DirectKY3PClear] API error: ${response.status}`, errorText);
      throw new Error(`Failed to clear KY3P task: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('[DirectKY3PClear] Successfully cleared KY3P task:', result);
    
    // Return the API response
    return result;
  } catch (error) {
    console.error('[DirectKY3PClear] Error clearing KY3P task:', error);
    
    // Show error toast
    toast({
      title: "Error clearing KY3P task",
      description: error.message || "An unexpected error occurred while clearing the KY3P task",
      variant: "destructive"
    });
    
    // Rethrow the error to be handled by the caller
    throw error;
  }
}