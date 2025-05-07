/**
 * Enhanced Demo Auto-Fill Handler
 * 
 * This module provides a standardized approach to demo auto-fill functionality
 * that works across different form types (primarily KYB and Open Banking).
 * 
 * NOTE: For KY3P forms, use the dedicated KY3PDemoAutoFill component instead of this handler.
 * This handler will block KY3P forms to prevent duplicate service calls.
 */

import type { FormServiceInterface } from '@/services/formService';
import getLogger from '@/utils/logger';
import { showDemoAutoFillToast } from '@/hooks/use-unified-toast';

const logger = getLogger('DemoAutoFill');

// Type guard to check if the form service has getDemoData method
function hasGetDemoData(service: FormServiceInterface): service is FormServiceInterface & { getDemoData: (taskId?: number) => Promise<Record<string, any>> } {
  return typeof (service as any).getDemoData === 'function';
}

interface DemoAutoFillOptions {
  taskId?: number;
  taskType: string;
  form: any;
  resetForm: (data: Record<string, any>) => void;
  updateField: (fieldKey: string, value: any) => Promise<void>;
  refreshStatus: () => Promise<void>;
  saveProgress: () => Promise<void>;
  onProgress?: (progress: number) => void;
  formService: FormServiceInterface | null;
  setForceRerender: React.Dispatch<React.SetStateAction<boolean>>;
  skipToasts?: boolean; // Skip showing toast notifications when true
}

/**
 * Universal demo auto-fill handler that works for all form types
 * 
 * This function uses the standardized approach with string-based field keys
 * that is consistent across KYB, KY3P, and Open Banking.
 * 
 * @param options Configuration options for the demo auto-fill
 */
export async function handleDemoAutoFill({
  taskId,
  taskType,
  form,
  resetForm,
  updateField,
  refreshStatus,
  saveProgress,
  onProgress,
  formService,
  setForceRerender,
  skipToasts = false // Default to false for backward compatibility
}: DemoAutoFillOptions): Promise<{ success: boolean; fieldCount?: number }> {
  if (!formService) {
    logger.error('No form service provided for demo auto-fill');
    if (!skipToasts) {
      showDemoAutoFillToast('error', 'Form service not available');
    }
    return { success: false };
  }

  if (!taskId) {
    logger.error('No task ID provided for demo auto-fill');
    if (!skipToasts) {
      showDemoAutoFillToast('error', 'Task ID not provided');
    }
    return { success: false };
  }

  logger.info(`Starting demo auto-fill for ${taskType} task ${taskId}`);
  
  // Show loading toast
  if (!skipToasts) {
    showDemoAutoFillToast('loading', 'Loading demo data...');
  }
  
  // Reset any potential stuck state by triggering a force rerender
  setForceRerender(prev => !prev);
  
  try {
    // For KY3P forms, use the dedicated KY3PDemoAutoFill component instead
    // This handler should not be used for KY3P forms to avoid duplicate service calls
    if (taskType === 'ky3p' || taskType === 'security_assessment' || taskType === 'security' || taskType === 'sp_ky3p_assessment') {
      logger.warn(`KY3P forms should use the dedicated KY3PDemoAutoFill component, not this generic handler.`);
      logger.warn(`Using the generic handler can cause duplicate service calls.`);
      
      // Show an explicit error and force redirect to the proper component
      if (!skipToasts) {
        showDemoAutoFillToast('error', 'KY3P forms require the dedicated KY3PDemoAutoFill component. This operation has been blocked to prevent duplicate service calls.');
      }
      
      // Exit early to prevent any duplicate service calls
      logger.info('Blocking generic demo auto-fill handler for KY3P form to prevent duplicate calls');
      return { success: false };
    }
    
    // Generic approach for all form types as fallback
    logger.info(`Using generic approach for ${taskType} demo auto-fill`);
    
    try {
      // Check if the form service supports demo data
      if (!hasGetDemoData(formService)) {
        logger.error('FormService does not implement getDemoData method');
        if (!skipToasts) {
          showDemoAutoFillToast('error', 'This form service does not support demo data');
        }
        return { success: false };
      }
      
      // Get the demo data from the form service
      const demoData = await formService.getDemoData(taskId);
      
      if (!demoData || Object.keys(demoData).length === 0) {
        logger.error('No demo data returned from service');
        if (!skipToasts) {
          showDemoAutoFillToast('error', 'No demo data available for this form');
        }
        return { success: false };
      }
      
      const fieldCount = Object.keys(demoData).length;
      logger.info(`Retrieved ${fieldCount} demo fields for ${taskType}`);
      
      // Show progress toast
      if (!skipToasts) {
        showDemoAutoFillToast('progress', `Populating ${fieldCount} fields...`);
      }
      
      // Reset form with demo data
      resetForm(demoData);
      
      // Call save progress to persist to server
      await saveProgress();
      
      // For better reliability, do individual field updates for non-KY3P forms
      // This is a more robust approach even though it's slower
      if (taskType !== 'ky3p' && taskType !== 'security_assessment') {
        const totalFields = Object.keys(demoData).length;
        let processedFields = 0;
        
        // Process fields in batches to avoid overwhelming the server
        const fieldEntries = Object.entries(demoData);
        const batchSize = 5; // Smaller batch size for more reliable processing
        
        for (let i = 0; i < fieldEntries.length; i += batchSize) {
          const batch = fieldEntries.slice(i, i + batchSize);
          
          // Process batch in sequence for more reliable ordering
          for (const [key, value] of batch) {
            try {
              if (key.startsWith('_') || key === 'taskId' || key === 'timestamp') {
                continue; // Skip metadata fields
              }
              
              await updateField(key, value);
              processedFields++;
              
              // Report progress
              const progressPercent = Math.round((processedFields / totalFields) * 100);
              if (onProgress) {
                onProgress(progressPercent);
              }
              
              // Small delay between updates to avoid race conditions
              await new Promise(resolve => setTimeout(resolve, 20));
            } catch (fieldError) {
              logger.error(`Error updating field ${key}:`, fieldError);
            }
          }
          
          // Small delay between batches
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Force a re-render to show the updated form
      setForceRerender(prev => !prev);
      
      // Refresh the status to update progress
      await refreshStatus();
      
      // Show success toast
      if (!skipToasts) {
        showDemoAutoFillToast('success', `Successfully filled ${fieldCount} fields with demo data`);
      }
      
      // Return success and field count for consumers like UnifiedDemoAutoFill component
      return { success: true, fieldCount };
      
    } catch (error) {
      logger.error(`Error in demo auto-fill for ${taskType}:`, error);
      if (!skipToasts) {
        showDemoAutoFillToast('error', error instanceof Error ? error.message : 'Failed to apply demo data');
      }
      return { success: false };
    }
  } catch (error) {
    logger.error('Unexpected error in handleDemoAutoFill:', error);
    if (!skipToasts) {
      showDemoAutoFillToast('error', 'An unexpected error occurred');
    };
    return { success: false };
  }
  
  // Add a default return for TypeScript completeness
  return { success: false };
}