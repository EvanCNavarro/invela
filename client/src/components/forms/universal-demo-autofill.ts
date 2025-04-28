/**
 * Universal Demo Auto-Fill Handler
 * 
 * This module provides a standardized approach to demo auto-fill functionality
 * that works across different form types (KYB, KY3P, and Open Banking).
 * 
 * The core principle is to use a consistent method for auto-filling forms
 * regardless of the underlying form implementation details.
 */

import { FormServiceInterface } from '@/services/formService';
import getLogger from '@/utils/logger';
import { toast } from '@/hooks/use-toast';
import { fixedUniversalSaveProgress } from './fix-universal-bulk-save';

const logger = getLogger('UniversalDemoAutoFill');

/**
 * Type guard to check if a form service has the getDemoData method
 */
export function hasGetDemoData(service: FormServiceInterface): service is FormServiceInterface & { 
  getDemoData: (taskId?: number) => Promise<Record<string, any>> 
} {
  return typeof (service as any).getDemoData === 'function';
}

/**
 * Configuration options for universal demo auto-fill
 */
export interface UniversalDemoAutoFillOptions {
  /** Task ID for the form */
  taskId?: number;
  
  /** Type of the task/form (kyb, ky3p, open_banking) */
  taskType: string;
  
  /** Form object from the form service */
  form: any;
  
  /** Function to reset the form with new data */
  resetForm: (data: Record<string, any>) => void;
  
  /** Function to update a single field */
  updateField: (fieldKey: string, value: any) => Promise<void>;
  
  /** Function to refresh the form status */
  refreshStatus: () => Promise<void>;
  
  /** Function to save the form progress */
  saveProgress: () => Promise<void>;
  
  /** Optional callback for progress updates */
  onProgress?: (progress: number) => void;
  
  /** Form service that implements the FormServiceInterface */
  formService: FormServiceInterface | null;
  
  /** Function to trigger a UI rerender */
  setForceRerender: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Universal demo auto-fill handler
 * 
 * This function provides a standardized approach to auto-filling forms
 * that works across different form types (KYB, KY3P, and Open Banking).
 * 
 * @param options Configuration options for the demo auto-fill
 * @returns Promise that resolves when the auto-fill process is complete
 */
export async function handleUniversalDemoAutoFill(
  options: UniversalDemoAutoFillOptions
): Promise<void> {
  const {
    taskId,
    taskType,
    form,
    resetForm,
    updateField,
    refreshStatus,
    saveProgress,
    onProgress,
    formService,
    setForceRerender
  } = options;

  logger.info(`Starting universal demo auto-fill for task type: ${taskType}`, { taskId });
  
  try {
    if (!formService) {
      throw new Error('Form service not available');
    }
    
    // Check if the form service supports the getDemoData method
    if (!hasGetDemoData(formService)) {
      throw new Error(`Form service for ${taskType} does not support demo auto-fill`);
    }
    
    // Get the demo data from the form service
    const demoData = await formService.getDemoData(taskId);
    
    if (!demoData || Object.keys(demoData).length === 0) {
      throw new Error(`No demo data available for ${taskType}`);
    }
    
    const fieldCount = Object.keys(demoData).length;
    logger.info(`Retrieved ${fieldCount} demo data fields for ${taskType}`);
    
    // Clear the form service cache if supported
    if (typeof formService.clearCache === 'function') {
      formService.clearCache();
    }
    
    // Reset the form with the new demo data
    resetForm(demoData);
    
    // Ensure the form service data is updated
    formService.loadFormData(demoData);
    
    // Update progress if callback provided
    if (onProgress) {
      // Calculate approximate progress
      const progress = formService.calculateProgress();
      onProgress(progress);
    }
    
    // Try using fixed implementation to save progress directly
    if (taskId) {
      logger.info(`Attempting to save progress using fixed implementation for ${taskType} task ${taskId}`);
      try {
        const success = await fixedUniversalSaveProgress(taskId, taskType, demoData);
        if (success) {
          logger.info(`Successfully saved demo data with fixed implementation for ${taskType} task ${taskId}`);
        } else {
          // Fallback to standard saveProgress
          logger.info(`Fixed implementation was not successful, falling back to standard saveProgress`);
          await saveProgress();
        }
      } catch (saveError) {
        logger.warn(`Error using fixed implementation, falling back to standard saveProgress:`, saveError);
        await saveProgress();
      }
    } else {
      // No task ID, use standard saveProgress
      await saveProgress();
    }
    
    // Refresh the form status
    await refreshStatus();
    
    // Force a UI rerender
    setForceRerender(prev => !prev);
    
    // Show success toast notification
    toast({
      title: 'Demo data loaded successfully',
      description: `Filled ${fieldCount} fields with demo data`,
      variant: 'default',
    });
    
    logger.info(`Demo auto-fill completed successfully for ${taskType}`);
  } catch (error) {
    logger.error(`Error in universal demo auto-fill:`, error);
    
    // Show error toast notification
    toast({
      title: 'Demo data loading failed',
      description: error instanceof Error ? error.message : 'Unknown error',
      variant: 'destructive',
    });
    
    // Force a UI rerender anyway to ensure we're in a clean state
    setForceRerender(prev => !prev);
    
    // Rethrow the error for the caller to handle
    throw error;
  }
}

/**
 * Get appropriate form service for a task type
 * 
 * This is a helper function to ensure we use the correct standardized
 * form service for each task type.
 * 
 * @param taskType Type of the task (kyb, ky3p, open_banking)
 * @param taskId ID of the task
 * @param serviceRegistry Object containing the available form services
 * @returns The appropriate form service for the task type
 */
export function getFormServiceForTaskType(
  taskType: string,
  taskId: number | undefined,
  serviceRegistry: Record<string, any>
): FormServiceInterface | null {
  // Normalize the task type
  const normalizedType = taskType.toLowerCase().replace(/-/g, '_');
  
  // Map task types to service names
  const serviceMap: Record<string, string> = {
    'kyb': 'standardizedKybFormService',
    'ky3p': 'standardizedKy3pFormService',
    'open_banking': 'standardizedOpenBankingFormService',
  };
  
  const serviceName = serviceMap[normalizedType];
  
  if (!serviceName || !serviceRegistry[serviceName]) {
    logger.error(`No standardized form service found for task type: ${taskType}`);
    return null;
  }
  
  // Create a new instance of the service with the task ID
  const ServiceClass = serviceRegistry[serviceName];
  return new ServiceClass(taskId);
}