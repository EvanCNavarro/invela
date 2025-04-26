/**
 * Enhanced Demo Auto-Fill Handler
 * 
 * This module provides a standardized approach to demo auto-fill functionality
 * that works across different form types (KYB, KY3P, and Open Banking).
 */

import type { FormServiceInterface } from '@/services/formService';
import getLogger from '@/utils/logger';

const logger = getLogger('DemoAutoFill');

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
  setForceRerender
}: DemoAutoFillOptions): Promise<void> {
  if (!formService) {
    logger.error('No form service provided for demo auto-fill');
    return;
  }

  if (!taskId) {
    logger.error('No task ID provided for demo auto-fill');
    return;
  }

  logger.info(`Starting demo auto-fill for ${taskType} task ${taskId}`);
  
  try {
    // For KY3P forms, use our standardized bulk update approach
    if (taskType === 'ky3p') {
      try {
        // Import the standardized bulk update utility
        const { standardizedBulkUpdate } = await import('./standardized-ky3p-update');
        
        // Fetch the demo data 
        logger.info(`Fetching KY3P demo data from service for task ${taskId}`);
        const demoData = await formService.getDemoData(taskId);
        
        // Use the standardized bulk update to send all the data at once
        logger.info(`Using standardized bulk update for KY3P demo data with ${Object.keys(demoData).length} fields`);
        const success = await standardizedBulkUpdate(taskId, demoData);
        
        if (success) {
          logger.info('KY3P demo data successfully applied');
          
          // Reset the form with the demo data
          resetForm(demoData);
          
          // Force a re-render to show the updated form
          setForceRerender(prev => !prev);
          
          // Refresh the status to update progress
          await refreshStatus();
          
          return;
        } else {
          logger.error('Failed to apply KY3P demo data using standardized bulk update');
        }
      } catch (error) {
        logger.error('Error using standardized KY3P update:', error);
      }
    }
    
    // Generic approach for all form types as fallback
    logger.info(`Using generic approach for ${taskType} demo auto-fill`);
    
    try {
      // Get the demo data from the form service
      const demoData = await formService.getDemoData(taskId);
      
      if (!demoData || Object.keys(demoData).length === 0) {
        logger.error('No demo data returned from service');
        return;
      }
      
      logger.info(`Retrieved ${Object.keys(demoData).length} demo fields for ${taskType}`);
      
      // Reset form with demo data
      resetForm(demoData);
      
      // Call save progress to persist to server
      await saveProgress();
      
      // For non-KY3P forms, we might need to do individual field updates
      // This is a fallback approach
      if (taskType !== 'ky3p') {
        const totalFields = Object.keys(demoData).length;
        let processedFields = 0;
        
        // Process fields in batches to avoid overwhelming the server
        const fieldEntries = Object.entries(demoData);
        const batchSize = 10;
        
        for (let i = 0; i < fieldEntries.length; i += batchSize) {
          const batch = fieldEntries.slice(i, i + batchSize);
          
          // Process batch in parallel
          await Promise.all(
            batch.map(async ([key, value]) => {
              try {
                await updateField(key, value);
                processedFields++;
                
                // Report progress
                if (onProgress) {
                  onProgress(Math.round((processedFields / totalFields) * 100));
                }
              } catch (fieldError) {
                logger.error(`Error updating field ${key}:`, fieldError);
              }
            })
          );
          
          // Small delay between batches
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      // Force a re-render to show the updated form
      setForceRerender(prev => !prev);
      
      // Refresh the status to update progress
      await refreshStatus();
      
    } catch (error) {
      logger.error(`Error in demo auto-fill for ${taskType}:`, error);
    }
  } catch (error) {
    logger.error('Unexpected error in handleDemoAutoFill:', error);
  }
}