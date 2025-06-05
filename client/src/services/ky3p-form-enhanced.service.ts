/**
 * Enhanced S&P KY3P Security Assessment Form Service
 * 
 * This service fixes the ReferenceError issues in the original KY3P form service
 * by properly handling variable scoping and enhancing error handling.
 */

import { KY3PFormService } from './ky3p-form-service';
import getLogger from '@/utils/logger';

const logger = getLogger('FixedKY3PFormService');

/**
 * A fixed implementation of the getProgress method from KY3PFormService
 * that properly handles errors and variable scoping
 */
export function fixedLoadProgress(service: KY3PFormService, taskId?: number): Promise<Record<string, any>> {
  return async function() {
    // Use provided taskId or fall back to the service's taskId
    const effectiveTaskId = taskId || (service as any).taskId;
    
    if (!effectiveTaskId) {
      logger.warn('[Fixed KY3P Service] No task ID provided for loading progress, returning empty data');
      return {};
    }
    
    // Temporarily store the taskId on this instance if not already set
    const originalTaskId = (service as any).taskId;
    if (!(service as any).taskId && effectiveTaskId) {
      logger.info(`[Fixed KY3P Service] Temporarily setting taskId to ${effectiveTaskId} for loading progress`);
      (service as any).taskId = effectiveTaskId;
    }
    
    try {
      logger.info(`[Fixed KY3P Service] Loading progress for task ${effectiveTaskId}`);
      
      // Show loading state in the UI while we fetch the data
      service.loadFormData({ _loading: true });
      
      // For normal operation, use the progress API with enhanced error handling
      let progress;
      try {
        // Safely get progress with enhanced error handling
        progress = await getProgressSafely(service, effectiveTaskId);
        
        // Log the data we received for debugging
        logger.info(`[Fixed KY3P Service] Form data keys received:`, {
          keys: Object.keys(progress.formData || {}),
          count: Object.keys(progress.formData || {}).length,
          hasData: !!progress.formData && Object.keys(progress.formData).length > 0,
          status: progress.status
        });
      } catch (progressError) {
        // Handle error without letting it propagate
        logger.error(`[Fixed KY3P Service] Error in getProgress call, using empty data:`, progressError);
        progress = {
          formData: {},
          progress: 0,
          status: 'not_started'
        };
      }
      
      // Store the form data in the service for future reference
      if (progress.formData && Object.keys(progress.formData).length > 0) {
        // Store the data, removing any _loading flag
        const formData = { ...progress.formData };
        delete formData._loading;
        
        service.loadFormData(formData);
        
        // Return the form data for the form manager to use
        return formData;
      }
      
      // If the task is submitted but has no form data, at least include the submission date
      if (progress.status === 'submitted') {
        logger.warn(`[Fixed KY3P Service] Task ${effectiveTaskId} is submitted but no form data found`);
        return { _submissionDate: progress.formData?._submissionDate || new Date().toISOString() };
      }
      
      // Fallback to empty object if no data found
      logger.warn(`[Fixed KY3P Service] No form data found for task ${effectiveTaskId}`);
      return {};
    } catch (error) {
      logger.error('[Fixed KY3P Service] Error loading progress:', error);
      
      // Just return an empty object to prevent errors from bubbling up to the UI
      return {};
    } finally {
      // Restore the original taskId if we set it temporarily
      if (!originalTaskId && (service as any).taskId === effectiveTaskId) {
        logger.info(`[Fixed KY3P Service] Restoring original taskId (was temporarily set to ${effectiveTaskId})`);
        (service as any).taskId = originalTaskId;
      }
    }
  }();
}

/**
 * A safer implementation of getProgress that properly handles errors and variable scoping
 */
async function getProgressSafely(service: KY3PFormService, taskId: number): Promise<{
  formData: Record<string, any>;
  progress: number;
  status: string;
}> {
  try {
    logger.info(`[Fixed KY3P Service] Getting progress for task ${taskId}`);
    
    // Create a store for our data
    let formData: Record<string, any> = {};
    let isSubmitted = false;
    let submissionDate = null;
    let progressData = {
      formData: {},
      progress: 0,
      status: 'not_started'
    };
    
    // First try to get the task info
    try {
      const taskResponse = await fetch(`/api/tasks/${taskId}`, {
        credentials: 'include'
      });
      
      if (taskResponse.ok) {
        const taskInfo = await taskResponse.json();
        isSubmitted = taskInfo?.status === 'submitted';
        submissionDate = taskInfo?.completion_date || taskInfo?.metadata?.submissionDate;
        
        logger.info(`[Fixed KY3P Service] Retrieved task info for ${taskId}:`, {
          status: taskInfo.status,
          isSubmitted,
          submissionDate,
          metadata: Object.keys(taskInfo.metadata || {})
        });
      }
    } catch (taskError) {
      logger.error(`[Fixed KY3P Service] Error fetching task info:`, taskError);
      // Continue despite the error - we can still try to get responses
    }
    
    // Try to get responses from the responses endpoint
    try {
      const responsesUrl = `/api/tasks/${taskId}/ky3p-responses`;
      logger.info(`[Fixed KY3P Service] Attempting to get KY3P responses from task ${taskId}`);
      logger.info(`[Fixed KY3P Service] Fetching from: ${responsesUrl}`);
      
      const responsesResponse = await fetch(responsesUrl, {
        credentials: 'include'
      });
      
      logger.info(`[Fixed KY3P Service] Responses API call status: ${responsesResponse.status}`);
      
      if (responsesResponse.ok) {
        try {
          const responseData = await responsesResponse.json();
          
          // Handle the newer format where responses are inside a 'responses' property
          const rawResponses = responseData.responses || responseData;
          
          logger.info(`[Fixed KY3P Service] Retrieved ${rawResponses ? rawResponses.length : 0} raw responses`);
          
          // If no responses or empty array, log and continue to the next approach
          if (!rawResponses || !Array.isArray(rawResponses) || rawResponses.length === 0) {
            logger.info('[Fixed KY3P Service] Empty responses array, returning empty data');
          } else {
            // Process the responses if we have them
            const formattedData: Record<string, any> = {};
            
            // Process responses - safely within the try block
            for (const response of rawResponses) {
              if (response && response.field && response.field.field_key) {
                formattedData[response.field.field_key] = response.response_value;
              }
            }
            
            if (Object.keys(formattedData).length > 0) {
              logger.info(`[Fixed KY3P Service] Successfully formatted ${Object.keys(formattedData).length} responses`);
              return {
                formData: formattedData,
                progress: isSubmitted ? 100 : 50, // If we have responses but not submitted, it's in progress
                status: isSubmitted ? 'submitted' : 'in_progress'
              };
            }
          }
        } catch (parseError) {
          // Safely handle parsing errors without reference errors
          logger.error('[Fixed KY3P Service] Error parsing responses:', parseError);
        }
      }
    } catch (responseError) {
      // Safely catch errors from the responses endpoint
      logger.error('[Fixed KY3P Service] Error fetching from responses endpoint:', responseError);
    }
    
    // Try the progress endpoint as a fallback
    try {
      const progressUrl = `/api/ky3p/progress/${taskId}`;
      logger.info(`[Fixed KY3P Service] Trying progress endpoint: ${progressUrl}`);
      
      const response = await fetch(progressUrl, {
        credentials: 'include'
      });
      
      logger.info(`[Fixed KY3P Service] Progress API call status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Log raw data for debugging
        logger.info(`[Fixed KY3P Service] Raw API response data:`, data);
        
        logger.info(`[Fixed KY3P Service] Progress endpoint returned:`, {
          taskId,
          progress: data.progress,
          status: data.status,
          formDataKeys: Object.keys(data.formData || {}).length
        });
        
        formData = data.formData || {};
        
        // If the endpoint returned data, use it
        if (Object.keys(formData).length > 0) {
          // If task is submitted, add submission date if not already present
          if (isSubmitted && submissionDate && !formData._submissionDate) {
            formData._submissionDate = submissionDate;
          }
          
          return {
            formData,
            progress: data.progress || (isSubmitted ? 100 : 0),
            status: data.status || (isSubmitted ? 'submitted' : 'not_started')
          };
        }
      }
    } catch (progressError) {
      logger.error(`[Fixed KY3P Service] Progress endpoint error:`, progressError);
    }
    
    // If we got this far, we couldn't get data from any source
    // If the task is submitted, at least return that information
    if (isSubmitted) {
      logger.info(`[Fixed KY3P Service] Task ${taskId} is submitted, returning minimal data with submission date`);
      return {
        formData: { _submissionDate: submissionDate || new Date().toISOString() },
        progress: 100,
        status: 'submitted'
      };
    }
    
    // Final fallback - empty form data with not_started status
    logger.info(`[Fixed KY3P Service] No data found for task ${taskId}, returning empty data`);
    return {
      formData: {},
      progress: 0,
      status: 'not_started'
    };
  } catch (error) {
    logger.error('[Fixed KY3P Service] Unhandled error in getProgressSafely:', error);
    
    // Return a minimal response instead of throwing
    return {
      formData: {},
      progress: 0,
      status: 'not_started'
    };
  }
}

/**
 * Apply the fixed loadProgress method to a KY3P form service instance
 */
export function applyFixedLoadProgress(service: KY3PFormService): void {
  logger.info('[Fixed KY3P Service] Applying fixed loadProgress method to KY3P form service');
  (service as any).originalLoadProgress = service.loadProgress;
  (service as any).loadProgress = function(taskId?: number) {
    return fixedLoadProgress(service, taskId);
  };
}

/**
 * Create a fixed KY3P form service by patching the original service
 */
export function createFixedKY3PFormService(companyId?: number, taskId?: number): KY3PFormService {
  logger.info('[Fixed KY3P Service] Creating fixed KY3P form service');
  const service = new KY3PFormService(companyId, taskId);
  applyFixedLoadProgress(service);
  return service;
}
