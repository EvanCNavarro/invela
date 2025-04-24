/**
 * Enhanced utilities for clearing form fields
 * 
 * This module provides improved utilities for clearing form fields with better
 * error handling and logging to address potential JSON parsing issues.
 */

import { toast } from '@/hooks/use-toast';
import { FormServiceInterface } from '../../services/formService';

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
  resetForm: (data: Record<string, any>) => void;
  refreshStatus: () => Promise<void>;
  setForceRerender: React.Dispatch<React.SetStateAction<boolean>>;
}): Promise<void> {
  try {
    // Show loading toast
    toast({
      title: 'Clear Fields',
      description: 'Clearing all form fields...',
      variant: 'default',
    });
    
    // Call the backend API to clear fields
    const response = await fetch(`/api/universal-clear-fields/${taskId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskType })
    });
    
    if (!response.ok) {
      // Try to extract a more detailed error from the response
      let errorDetail = '';
      try {
        const errorText = await response.text();
        console.log(`[Clear Fields] Error response details:`, errorText.substring(0, 200) + '...');
        
        try {
          const errorJson = JSON.parse(errorText);
          errorDetail = errorJson.message || errorJson.error || '';
        } catch (jsonError) {
          errorDetail = errorText.substring(0, 100);
        }
      } catch (textError) {
        console.error('[Clear Fields] Failed to extract error details:', textError);
      }
      
      throw new Error(`Clear fields request failed (${response.status}): ${errorDetail}`);
    }
    
    // Try to parse the response
    let data;
    try {
      const text = await response.text();
      console.log(`[Clear Fields] Raw response:`, text.substring(0, 100) + '...');
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('[Clear Fields] Error parsing response:', parseError);
      throw new Error('Failed to parse clear fields response');
    }
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to clear fields');
    }
    
    // Reset the form with empty data
    resetForm({});
    
    // Force re-render to ensure UI is updated
    setForceRerender(prev => !prev);
    
    // Refresh form status
    await refreshStatus();
    
    toast({
      title: 'Fields Cleared',
      description: 'All form fields have been cleared successfully',
      variant: 'default',
    });
  } catch (error) {
    console.error('[Clear Fields] Error:', error);
    toast({
      title: 'Clear Fields Failed',
      description: error instanceof Error ? error.message : 'An unexpected error occurred',
      variant: 'destructive',
    });
  }
}