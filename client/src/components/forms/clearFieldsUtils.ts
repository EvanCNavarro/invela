/**
 * Enhanced utilities for clearing form fields
 * 
 * This module provides improved utilities for clearing form fields with better
 * error handling and logging to address potential JSON parsing issues.
 */

import { toast } from "@/hooks/use-toast";

/**
 * Handle clearing form fields with improved error handling
 * 
 * @param taskId The task ID
 * @param taskType The task type (e.g., 'kyb', 'ky3p', 'open_banking')
 * @param resetForm Function to reset the form
 * @param refreshStatus Function to refresh the form status
 * @param setForceRerender Function to force a re-render of the form
 */
export async function handleClearFields({
  taskId,
  taskType,
  resetForm,
  refreshStatus,
  setForceRerender
}: {
  taskId: number;
  taskType: string;
  resetForm: () => void;
  refreshStatus: () => Promise<void>;
  setForceRerender: (value: boolean) => void;
}): Promise<void> {
  try {
    console.log(`[ClearFields] Clearing fields for task ${taskId} (${taskType})`);
    
    // Show loading toast
    toast({
      title: "Clearing form fields",
      description: "Please wait while we clear all form fields...",
      duration: 2000,
    });

    // Call the universal clear fields endpoint
    const response = await fetch(`/api/universal-clear-fields/${taskId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ taskType }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to clear fields';
      
      try {
        // Try to parse the error as JSON
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch (parseError) {
        // If parsing fails, just use the raw text
        errorMessage = errorText || errorMessage;
      }
      
      console.error(`[ClearFields] Error clearing fields: ${errorMessage}`);
      
      toast({
        title: "Error clearing fields",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
      
      return;
    }

    const data = await response.json();
    console.log(`[ClearFields] Successfully cleared ${data.clearedCount} fields`);
    
    // Reset the form and refresh the status
    resetForm();
    await refreshStatus();
    
    // Force a re-render to ensure UI reflects the cleared state
    setForceRerender(prev => !prev);
    
    toast({
      title: "Fields cleared successfully",
      description: `All ${data.clearedCount} fields have been cleared.`,
      duration: 3000,
    });
  } catch (error) {
    console.error('[ClearFields] Error in handleClearFields:', error);
    
    toast({
      title: "Error clearing fields",
      description: error instanceof Error ? error.message : "An unexpected error occurred",
      variant: "destructive",
      duration: 5000,
    });
  }
}