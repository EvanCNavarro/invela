import getLogger from '@/utils/logger';
import { toast } from '@/hooks/use-toast';

// Logger instance for this service
const logger = getLogger('FormClearingService');

interface FormClearingOptions {
  taskId: number;
  taskType: string;
  form: any; // react-hook-form instance
  formService?: any; // FormService instance
  fields: Array<{ key: string }>;
  onSuccess?: () => void;
  refreshStatus?: () => Promise<void>;
  setActiveSection?: (index: number) => void;
}

/**
 * A dedicated service for handling form clearing operations
 * This helps ensure consistency across different form types
 */
export const FormClearingService = {
  /**
   * Clear all form fields for a task
   * This function handles both UI state and server-side clearing
   */
  async clearFormFields({
    taskId,
    taskType,
    form,
    formService,
    fields,
    onSuccess,
    refreshStatus,
    setActiveSection
  }: FormClearingOptions): Promise<void> {
    logger.info(`[FormClearingService] Clearing fields for task ${taskId} (${taskType})`);
    
    // Create empty data object - use empty strings for all fields
    const emptyData: Record<string, string> = {};
    fields.forEach(field => {
      if (field && field.key) {
        emptyData[field.key] = '';
      }
    });
    
    // STEP 1: Clear UI state first for immediate user feedback
    try {
      logger.info('[FormClearingService] Clearing form UI state');
      
      // Reset form with empty data
      form.reset(emptyData);
      form.clearErrors();
      
      // Reset to first section if section navigation is available
      if (setActiveSection) {
        setActiveSection(0);
      }
    } catch (uiError) {
      logger.error('[FormClearingService] Error clearing UI state:', uiError);
      // Continue anyway to try server-side clearing
    }
    
    // STEP 2: Clear server-side data
    if (taskId) {
      try {
        let endpoint = '';
        let body = {};
        
        // Select the right endpoint based on task type
        if (taskType === 'open_banking_survey') {
          // Open Banking endpoint - uses our improved clear mechanism with fast DELETE
          // This uses a dedicated "fast clear" endpoint specifically for clearing all fields at once
          endpoint = `/api/tasks/${taskId}/open-banking-responses/clear-all`;
          body = { clearAction: 'FAST_DELETE_ALL' };
        } 
        else if (taskType === 'sp_ky3p_assessment') {
          // KY3P endpoint
          endpoint = `/api/tasks/${taskId}/ky3p-responses/bulk`;
          body = { responses: emptyData, clearAll: true };
        }
        else {
          // Default KYB endpoint
          endpoint = '/api/kyb/progress';
          body = { 
            taskId, 
            formData: emptyData,
            progress: 0,
            status: 'not_started'
          };
        }
        
        logger.info(`[FormClearingService] Clearing server data via ${endpoint}`);
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        
        if (!response.ok) {
          const responseText = await response.text();
          logger.warn(`[FormClearingService] Server returned ${response.status} when clearing: ${responseText}`);
          // Don't throw - we still want the UI to look cleared even if server sync fails
        } else {
          logger.info('[FormClearingService] Successfully cleared fields on server');
        }
        
        // Update form service state if available
        if (formService) {
          try {
            logger.info('[FormClearingService] Updating form service state');
            if (typeof formService.resetFormData === 'function') {
              formService.resetFormData(taskId);
            } else {
              // Fallback if resetFormData doesn't exist
              Object.keys(emptyData).forEach(key => {
                formService.updateFormData(key, '', taskId);
              });
            }
          } catch (serviceError) {
            logger.error('[FormClearingService] Error updating form service:', serviceError);
          }
        }
        
        // Force refresh query cache to ensure data is in sync
        try {
          const { queryClient } = await import('@/lib/queryClient');
          queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
          logger.info('[FormClearingService] Invalidated task query cache');
        } catch (cacheError) {
          logger.error('[FormClearingService] Error invalidating cache:', cacheError);
        }
        
        // Refresh form status if available
        if (refreshStatus) {
          try {
            await refreshStatus();
            logger.info('[FormClearingService] Refreshed form status');
          } catch (refreshError) {
            logger.error('[FormClearingService] Error refreshing status:', refreshError);
          }
        }
      } catch (serverError) {
        logger.error('[FormClearingService] Error clearing server data:', serverError);
        // Don't rethrow - UI is already cleared
      }
    }
    
    // Call success callback if provided
    if (onSuccess) {
      onSuccess();
    }
    
    logger.info('[FormClearingService] Form clearing completed successfully');
  }
};