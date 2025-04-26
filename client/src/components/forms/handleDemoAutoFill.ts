/**
 * Enhanced Demo Auto-Fill Handler
 * 
 * This module provides a standardized approach to demo auto-fill functionality
 * that works across different form types (KYB, KY3P, and Open Banking).
 */

import type { FormServiceInterface } from '@/services/formService';
import getLogger from '@/utils/logger';
import { toast } from '@/hooks/use-toast';

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
    toast({
      title: 'Demo Auto-Fill Error',
      description: 'Form service not available',
      variant: 'destructive'
    });
    return;
  }

  if (!taskId) {
    logger.error('No task ID provided for demo auto-fill');
    toast({
      title: 'Demo Auto-Fill Error',
      description: 'Task ID not provided',
      variant: 'destructive'
    });
    return;
  }

  logger.info(`Starting demo auto-fill for ${taskType} task ${taskId}`);
  
  // Show loading toast
  toast({
    title: 'Demo Auto-Fill',
    description: 'Loading demo data...',
    variant: 'default'
  });
  
  try {
    // For KY3P forms, use our standardized bulk update approach
    if (taskType === 'ky3p' || taskType === 'security_assessment') {
      try {
        // Import the standardized bulk update utility
        const { standardizedBulkUpdate } = await import('./standardized-ky3p-update');
        
        // Fetch the demo data 
        logger.info(`Fetching KY3P demo data from service for task ${taskId}`);
        
        // Check if the form service supports demo data
        if (!hasGetDemoData(formService)) {
          logger.error('FormService does not implement getDemoData method');
          toast({
            title: 'Demo Auto-Fill Error',
            description: 'This form service does not support demo data',
            variant: 'destructive'
          });
          return;
        }
        
        // Now TypeScript knows formService has getDemoData
        const demoData = await formService.getDemoData(taskId);
        
        if (!demoData || Object.keys(demoData).length === 0) {
          logger.error('No KY3P demo data returned from service');
          toast({
            title: 'Demo Auto-Fill Error',
            description: 'No demo data available for this form',
            variant: 'destructive'
          });
          return;
        }
        
        // Use the standardized bulk update to send all the data at once
        logger.info(`Using standardized bulk update for KY3P demo data with ${Object.keys(demoData).length} fields`);
        
        // Show progress toast
        toast({
          title: 'Demo Auto-Fill',
          description: `Populating ${Object.keys(demoData).length} fields...`,
          variant: 'default'
        });
        
        const success = await standardizedBulkUpdate(taskId, demoData);
        
        if (success) {
          logger.info('KY3P demo data successfully applied');
          
          // Reset the form with the demo data
          resetForm(demoData);
          
          // Force a re-render to show the updated form
          setForceRerender(prev => !prev);
          
          // Refresh the status to update progress
          await refreshStatus();
          
          // Show success toast
          toast({
            title: 'Demo Auto-Fill Complete',
            description: `Successfully filled ${Object.keys(demoData).length} fields with demo data`,
            variant: 'success'
          });
          
          return;
        } else {
          logger.error('Failed to apply KY3P demo data using standardized bulk update');
          // Continue to generic approach as fallback
        }
      } catch (error) {
        logger.error('Error using standardized KY3P update:', error);
        // Continue to generic approach as fallback
      }
    }
    
    // Generic approach for all form types as fallback
    logger.info(`Using generic approach for ${taskType} demo auto-fill`);
    
    try {
      // Check if the form service supports demo data
      if (!hasGetDemoData(formService)) {
        logger.error('FormService does not implement getDemoData method');
        toast({
          title: 'Demo Auto-Fill Error',
          description: 'This form service does not support demo data',
          variant: 'destructive'
        });
        return;
      }
      
      // Get the demo data from the form service
      const demoData = await formService.getDemoData(taskId);
      
      if (!demoData || Object.keys(demoData).length === 0) {
        logger.error('No demo data returned from service');
        toast({
          title: 'Demo Auto-Fill Error',
          description: 'No demo data available for this form',
          variant: 'destructive'
        });
        return;
      }
      
      const fieldCount = Object.keys(demoData).length;
      logger.info(`Retrieved ${fieldCount} demo fields for ${taskType}`);
      
      // Show progress toast
      toast({
        title: 'Demo Auto-Fill',
        description: `Populating ${fieldCount} fields...`,
        variant: 'default'
      });
      
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
      toast({
        title: 'Demo Auto-Fill Complete',
        description: `Successfully filled ${fieldCount} fields with demo data`,
        variant: 'success'
      });
      
    } catch (error) {
      logger.error(`Error in demo auto-fill for ${taskType}:`, error);
      toast({
        title: 'Demo Auto-Fill Error',
        description: error instanceof Error ? error.message : 'Failed to apply demo data',
        variant: 'destructive'
      });
    }
  } catch (error) {
    logger.error('Unexpected error in handleDemoAutoFill:', error);
    toast({
      title: 'Demo Auto-Fill Error',
      description: 'An unexpected error occurred',
      variant: 'destructive'
    });
  }
}