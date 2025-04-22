import getLogger from '@/utils/logger';
import { toast } from '@/hooks/use-toast';

// Logger instance for this service
const logger = getLogger('FormClearingService');

// Track ongoing clear operations to prevent duplicates
const ongoingClearOperations = new Set<number>();

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
    // Prevent multiple simultaneous clear operations for the same task
    if (ongoingClearOperations.has(taskId)) {
      logger.warn(`[FormClearingService] Clear operation already in progress for task ${taskId}, preventing duplicate`);
      toast({
        title: "Operation in progress",
        description: "A clearing operation is already running, please wait...",
        variant: "default"
      });
      return;
    }
    
    // Track this operation to prevent duplicates
    ongoingClearOperations.add(taskId);
    
    try {
      logger.info(`[FormClearingService] Clearing fields for task ${taskId} (${taskType})`);
      
      // Create empty data object - use empty strings for all fields
      const emptyData: Record<string, string> = {};
      fields.forEach(field => {
        // Skip problematic fields like 'agreement_confirmation' and 'taskId'
        if (field && field.key && field.key !== 'agreement_confirmation' && field.key !== 'taskId') {
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
          if (taskType === 'open_banking_survey' || taskType === 'open_banking') {
            // Open Banking endpoint - uses our optimized fast clear mechanism
            // This endpoint bypasses all the normal form submission steps and directly clears the database
            endpoint = `/api/tasks/${taskId}/open-banking-responses/clear-all`;
            body = { 
              clearAction: 'FAST_DELETE_ALL',
              skipReconciliation: true,
              timestamp: new Date().toISOString(),
              forceLock: true,  // Extra flag to ensure server uses maximum lock duration
              preventRecalc: true  // Tell server to disable recalculation
            };
            
            logger.info(`[FormClearingService] Using FAST_DELETE operation for Open Banking (${taskType})`);
          } 
          else if (taskType === 'sp_ky3p_assessment') {
            // KY3P endpoint
            endpoint = `/api/tasks/${taskId}/ky3p-responses/bulk`;
            body = { responses: emptyData, clearAll: true };
            
            logger.info(`[FormClearingService] Using bulk update with clearAll for KY3P`);
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
            
            logger.info(`[FormClearingService] Using standard form update for KYB`);
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
            const { queryClient, apiRequest } = await import('@/lib/queryClient');
            
            // First, make sure to clear the task's savedFormData to prevent version issues
            try {
              // Instead of trying to fetch task data which can be problematic,
              // Get metadata from the React Query cache to preserve company info
              try {
                const { queryClient } = await import('@/lib/queryClient');
                
                // Get company name from current company API response in the cache
                const companyData = queryClient.getQueryData<any>(['/api/companies/current']);
                
                // Get task data from the task cache if available
                const taskData = queryClient.getQueryData<any>([`/api/tasks.json/${taskId}`]) || 
                                queryClient.getQueryData<any>([`/api/tasks/${taskId}`]);
                
                // Build preserved metadata from cached data
                const preservedMetadata: Record<string, any> = {};
                
                // Add company name and ID from company cache
                if (companyData?.name) {
                  preservedMetadata.company_name = companyData.name;
                  preservedMetadata.companyName = companyData.name;
                }
                
                if (companyData?.id) {
                  preservedMetadata.company_id = companyData.id;
                  preservedMetadata.companyId = companyData.id;
                }
                
                // Add any additional metadata from task cache if available
                if (taskData?.metadata) {
                  if (taskData.metadata.company_name || taskData.metadata.companyName) {
                    preservedMetadata.company_name = taskData.metadata.company_name || taskData.metadata.companyName;
                    preservedMetadata.companyName = taskData.metadata.companyName || taskData.metadata.company_name;
                  }
                  
                  if (taskData.metadata.company_id || taskData.metadata.companyId) {
                    preservedMetadata.company_id = taskData.metadata.company_id || taskData.metadata.companyId;
                    preservedMetadata.companyId = taskData.metadata.companyId || taskData.metadata.company_id;
                  }
                }
                
                // Directly update the task to clear its saved form data
                await apiRequest('PATCH', `/api/tasks/${taskId}`, {
                  savedFormData: null,
                  status: 'not_started', // Explicitly set status to not_started
                  progress: 0, // Explicitly set progress to 0
                  metadata: {
                    ...preservedMetadata,
                    lastCleared: new Date().toISOString(),
                    clearedVersion: Math.floor(Math.random() * 1000000), // Add random version to ensure cache busting
                    previousProgress: 0,
                    forceClear: true,
                    forceTaskStatus: 'not_started' // Signal to server that status should remain not_started
                  }
                });
                
                logger.info('[FormClearingService] Preserved company metadata during clear operation', preservedMetadata);
              } catch (cacheError) {
                logger.error('[FormClearingService] Failed to preserve metadata from cache:', cacheError);
                
                // Still try the basic clear operation
                await apiRequest('PATCH', `/api/tasks/${taskId}`, {
                  savedFormData: null,
                  status: 'not_started', // Explicitly set status to not_started
                  progress: 0, // Explicitly set progress to 0
                  metadata: {
                    lastCleared: new Date().toISOString(),
                    clearedVersion: Math.floor(Math.random() * 1000000),
                    previousProgress: 0,
                    forceClear: true,
                    forceTaskStatus: 'not_started' // Signal to server that status should remain not_started
                  }
                });
              }
              logger.info('[FormClearingService] Successfully cleared task savedFormData');
            } catch (saveError) {
              logger.error('[FormClearingService] Error clearing task savedFormData:', saveError);
            }
            
            // Invalidate all possible query keys that might contain form data
            queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
            queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
            queryClient.invalidateQueries({ queryKey: ['/api/kyb/progress'] });
            queryClient.invalidateQueries({ queryKey: [`/api/kyb/progress/${taskId}`] });
            queryClient.invalidateQueries({ queryKey: ['/api/ky3p/progress'] });
            queryClient.invalidateQueries({ queryKey: [`/api/ky3p/progress/${taskId}`] });
            queryClient.invalidateQueries({ queryKey: ['/api/tasks/open-banking'] });
            queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/open-banking-responses`] });
            queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/form-data`] });
            
            logger.info('[FormClearingService] Invalidated all query caches for task and form data');
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
    } finally {
      // Always clean up the operation tracking to prevent locks
      // This executes even if there are errors
      if (taskId) {
        setTimeout(() => {
          ongoingClearOperations.delete(taskId);
          logger.info(`[FormClearingService] Released clear operation lock for task ${taskId}`);
        }, 2000); // Small delay to prevent immediate re-triggering
      }
    }
  }
};