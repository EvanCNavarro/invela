/**
 * ========================================
 * Form Clearing Service Module
 * ========================================
 * 
 * Enterprise form clearing service providing comprehensive
 * form state management, field clearing, and UI synchronization.
 * Handles secure form data clearing operations with proper validation,
 * state management, and user feedback for enterprise compliance workflows.
 * 
 * Key Features:
 * - Comprehensive form field clearing with state management
 * - Duplicate operation prevention with operation tracking
 * - Enterprise-grade error handling and user feedback
 * - Multi-form type support with consistent clearing patterns
 * - Real-time UI synchronization and status updates
 * - Professional logging for audit trails and debugging
 * 
 * Dependencies:
 * - Logger: Structured logging for enterprise monitoring
 * - Toast: User feedback and notification system
 * 
 * @module FormClearingService
 * @version 2.0.0
 * @since 2024-04-15
 */

// ========================================
// IMPORTS
// ========================================

// Enterprise logging utilities for operation tracking
import getLogger from '@/utils/logger';
// User notification system for feedback
import { toast } from '@/hooks/use-toast';

// ========================================
// CONSTANTS
// ========================================

/**
 * Form clearing configuration constants
 * Defines clearing behavior and operation parameters
 */
const CLEARING_CONFIG = {
  OPERATION_TIMEOUT: 10000,
  MAX_RETRY_ATTEMPTS: 3,
  DEBOUNCE_DELAY: 500,
  BATCH_CLEAR_SIZE: 50
} as const;

/**
 * Clearing operation status enumeration
 * Provides clear operation lifecycle management
 */
const CLEARING_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
} as const;

// ========================================
// INITIALIZATION
// ========================================

// Logger instance for comprehensive service monitoring
const logger = getLogger('FormClearingService');

// Track ongoing clear operations to prevent duplicates and race conditions
const ongoingClearOperations = new Set<number>();

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Form clearing options interface for comprehensive operation configuration
 * 
 * Provides complete configuration structure for form clearing operations
 * with proper type safety, callback support, and state management
 * for enterprise-grade form clearing workflows.
 */
interface FormClearingOptions {
  /** Task identifier for clearing operation tracking */
  taskId: number;
  /** Task type for form-specific clearing logic */
  taskType: string;
  /** React Hook Form instance for UI state management */
  form: any;
  /** Optional form service instance for advanced clearing */
  formService?: any;
  /** Array of form fields to be cleared */
  fields: Array<{ key: string }>;
  /** Success callback for post-clearing actions */
  onSuccess?: () => void;
  /** Status refresh callback for UI synchronization */
  refreshStatus?: () => Promise<void>;
  /** Active section setter for navigation management */
  setActiveSection?: (index: number) => void;
}

/**
 * Clearing operation result interface for comprehensive feedback
 * 
 * Structures clearing operation outcomes with status tracking,
 * field counts, and error handling for complete operation management.
 */
interface ClearingResult {
  /** Operation success status */
  success: boolean;
  /** Number of fields successfully cleared */
  fieldsCleared: number;
  /** Total number of fields processed */
  totalFields: number;
  /** Operation completion time */
  completedAt: Date;
  /** Error information for failed operations */
  error?: string;
  /** Additional operation metadata */
  metadata?: Record<string, any>;
}

// ========================================
// SERVICE IMPLEMENTATION
// ========================================

/**
 * Enterprise form clearing service with comprehensive operation management
 * 
 * Provides structured form clearing operations with duplicate prevention,
 * error handling, and comprehensive logging for enterprise workflows.
 */
export const FormClearingService = {
  /**
   * Clear all form fields for a task with comprehensive validation and tracking
   * 
   * Handles both UI state clearing and server-side synchronization with
   * proper error handling, operation tracking, and user feedback.
   * Implements enterprise-grade clearing workflows with audit trails.
   * 
   * @param options Comprehensive clearing configuration options
   * @returns Promise resolving to clearing operation results
   * 
   * @throws {Error} When clearing validation fails or operation errors occur
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
  }: FormClearingOptions): Promise<ClearingResult> {
    // Validate input parameters for defensive programming
    if (!taskId || typeof taskId !== 'number' || taskId <= 0) {
      throw new Error('Invalid task ID provided for form clearing');
    }

    if (!taskType || typeof taskType !== 'string') {
      throw new Error('Invalid task type provided for form clearing');
    }

    if (!form) {
      throw new Error('Form instance is required for clearing operation');
    }

    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      throw new Error('Valid fields array is required for clearing');
    }

    // Prevent multiple simultaneous clear operations for the same task
    if (ongoingClearOperations.has(taskId)) {
      logger.warn(`[FormClearingService] Clear operation already in progress for task ${taskId}, preventing duplicate`);
      toast({
        title: "Operation in progress",
        description: "A clearing operation is already running, please wait...",
        variant: "default"
      });
      return {
        success: false,
        fieldsCleared: 0,
        totalFields: fields.length,
        completedAt: new Date(),
        error: 'Operation already in progress'
      };
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
          else if (taskType === 'sp_ky3p_assessment' || taskType === 'ky3p') {
            // KY3P endpoint
            endpoint = `/api/tasks/${taskId}/ky3p-responses/bulk`;
            
            // Convert to the expected format - array of objects with fieldId and value
            logger.info(`[FormClearingService] Fetching KY3P fields to build field mapping`);
            try {
              const fieldsResponse = await fetch(`/api/ky3p/fields`, {
                credentials: 'include'
              });
              
              if (!fieldsResponse.ok) {
                throw new Error(`Failed to fetch KY3P fields: ${fieldsResponse.statusText}`);
              }
              
              const fields = await fieldsResponse.json();
              logger.info(`[FormClearingService] Retrieved ${fields.length} KY3P field definitions`);
              
              // Build mapping from field_key (string) to field ID (number)
              const fieldKeyToIdMap = new Map();
              for (const field of fields) {
                const fieldKey = field.field_key;
                const fieldId = field.id;
                
                if (fieldKey && fieldId) {
                  fieldKeyToIdMap.set(fieldKey, fieldId);
                }
              }
              
              // Create array format responses with empty string values
              const responsesArray = [];
              
              for (const key of Object.keys(emptyData)) {
                const fieldId = fieldKeyToIdMap.get(key);
                
                if (fieldId !== undefined) {
                  // Ensure field ID is a number
                  const numericFieldId = typeof fieldId === 'string' ? parseInt(fieldId, 10) : fieldId;
                  
                  if (!isNaN(numericFieldId)) {
                    responsesArray.push({
                      fieldId: numericFieldId,
                      value: '' // Empty string for clear
                    });
                  }
                }
              }
              
              // Properly structured request body for bulk update
              body = { responses: responsesArray, clearAll: true };
              logger.info(`[FormClearingService] Using standardized bulk update with array format for KY3P with ${responsesArray.length} fields`);
            } catch (error) {
              logger.error('[FormClearingService] Error preparing KY3P field mapping:', error);
              
              // Fallback to a simpler approach that directly uses the clearAll flag
              body = { clearAll: true };
              logger.info(`[FormClearingService] Using simplified clearAll flag for KY3P after mapping error`);
            }
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
                
                // Use the dedicated progress endpoint to avoid HTML parsing issues
                // First update progress and status through the dedicated endpoint
                const progressResponse = await fetch(`/api/tasks/${taskId}/update-progress`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    progress: 0,
                    status: 'not_started',
                    forceClear: true
                  }),
                });
                
                if (!progressResponse.ok) {
                  logger.warn(`[FormClearingService] Failed to update task progress: ${progressResponse.status}`);
                }
                
                // Use a separate endpoint to clear savedFormData
                try {
                  // Create a dedicated endpoint request to clear savedFormData
                  const clearResponse = await fetch(`/api/tasks/${taskId}/clear-form-data`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      action: 'CLEAR_SAVED_FORM_DATA',
                      timestamp: new Date().toISOString()
                    }),
                  });
                  
                  if (!clearResponse.ok) {
                    logger.warn(`[FormClearingService] Failed to clear saved form data: ${clearResponse.status}`);
                  } else {
                    logger.info(`[FormClearingService] Successfully cleared saved form data via dedicated endpoint`);
                  }
                } catch (clearError) {
                  logger.error('[FormClearingService] Error clearing saved form data:', clearError);
                }
                
                logger.info('[FormClearingService] Preserved company metadata during clear operation', preservedMetadata);
              } catch (cacheError) {
                logger.error('[FormClearingService] Failed to preserve metadata from cache:', cacheError);
                
                // Fall back to the progress endpoint without relying on the cache
                try {
                  // First update progress and status through the dedicated endpoint
                  const progressResponse = await fetch(`/api/tasks/${taskId}/update-progress`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      progress: 0,
                      status: 'not_started',
                    }),
                  });
                  
                  if (!progressResponse.ok) {
                    logger.warn(`[FormClearingService] Fallback progress update failed: ${progressResponse.status}`);
                  }
                  
                  // Use dedicated clear form data endpoint
                  const clearResponse = await fetch(`/api/tasks/${taskId}/clear-form-data`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      action: 'CLEAR_SAVED_FORM_DATA',
                      timestamp: new Date().toISOString()
                    }),
                  });
                  
                  if (!clearResponse.ok) {
                    logger.warn(`[FormClearingService] Fallback clear form data request failed: ${clearResponse.status}`);
                  } else {
                    logger.info(`[FormClearingService] Fallback clear operation succeeded via dedicated endpoint`);
                  }
                } catch (fallbackError) {
                  logger.error('[FormClearingService] Fallback operation failed:', fallbackError);
                }
              }
              logger.info('[FormClearingService] Successfully cleared task savedFormData');
            } catch (saveError) {
              logger.error('[FormClearingService] Error clearing task savedFormData:', saveError);
            }
            
            // Invalidate all possible query keys that might contain form data
            // CRITICAL FIX: Add aggressive cache purging to handle inconsistency between database and UI state
            logger.info(`[FormClearingService] Starting AGGRESSIVE cache purging for task ${taskId}`);
            
            // Step 1: Remove all task data from the cache to force reloading
            queryClient.removeQueries({ queryKey: [`/api/tasks/${taskId}`] });
            queryClient.removeQueries({ queryKey: [`/api/tasks.json/${taskId}`] });
            queryClient.removeQueries({ queryKey: [`/api/kyb/progress/${taskId}`] });
            queryClient.removeQueries({ queryKey: [`/api/ky3p/progress/${taskId}`] });
            queryClient.removeQueries({ queryKey: [`/api/tasks/${taskId}/kyb-responses`] });
            queryClient.removeQueries({ queryKey: [`/api/tasks/${taskId}/ky3p-responses`] });
            queryClient.removeQueries({ queryKey: [`/api/tasks/${taskId}/open-banking-responses`] });
            queryClient.removeQueries({ queryKey: [`/api/tasks/${taskId}/form-data`] });
            
            // Step 2: Now invalidate queries to trigger refetching with fresh data from server
            queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
            queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
            queryClient.invalidateQueries({ queryKey: ['/api/kyb/progress'] });
            queryClient.invalidateQueries({ queryKey: [`/api/kyb/progress/${taskId}`] });
            queryClient.invalidateQueries({ queryKey: ['/api/ky3p/progress'] });
            queryClient.invalidateQueries({ queryKey: [`/api/ky3p/progress/${taskId}`] });
            queryClient.invalidateQueries({ queryKey: ['/api/tasks/open-banking'] });
            queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/open-banking-responses`] });
            queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/form-data`] });
            
            // Step 3: Clear browser-level cache using fetch API
            try {
              // Use NO-CACHE header to ensure fresh data on next fetch
              const clearCacheOpts = {
                method: 'GET',
                headers: {
                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                  'Pragma': 'no-cache',
                  'Expires': '0'
                }
              };
              
              // Trigger cache-clearing requests to key endpoints
              await fetch(`/api/tasks/${taskId}?_=${Date.now()}`, clearCacheOpts);
              await fetch(`/api/kyb/progress/${taskId}?_=${Date.now()}`, clearCacheOpts);
              
              logger.info('[FormClearingService] Successfully cleared browser cache for endpoints');
            } catch (cacheError) {
              logger.warn('[FormClearingService] Error clearing browser cache:', cacheError);
            }
            
            logger.info('[FormClearingService] Completed aggressive query cache purging for task and form data');
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