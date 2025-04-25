import { FormServiceInterface } from '@/services/formService';
import getLogger from '@/utils/logger';
import { toast } from '@/hooks/use-toast';

const logger = getLogger('handleDemoAutoFill');

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
 * This function uses the universal demo auto-fill endpoint first,
 * and if that fails, falls back to the legacy endpoints for specific form types.
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
  if (!taskId || !formService) {
    toast({
      title: 'Demo Auto-Fill Error',
      description: 'Could not auto-fill the form. Missing task ID or form service.',
      variant: 'destructive',
    });
    return;
  }

  try {
    logger.info(`Starting demo auto-fill for task ${taskId}`);
    
    // Try universal endpoint first
    const universalEndpoint = `/api/demo-autofill/${taskId}`;
    
    logger.info(`Using unified demo auto-fill endpoint: ${universalEndpoint}`);
    
    // Show loading toast
    toast({
      title: 'Demo Auto-Fill',
      description: 'Filling form with sample data...',
      variant: 'default',
    });

    let response;
    try {
      response = await fetch(universalEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskType
        }),
      });
    } catch (error) {
      // If universal endpoint fails, fall back to legacy endpoints
      logger.warn(`Universal endpoint failed, trying legacy endpoint for ${taskType}`);
      return await useLegacyEndpoint(taskId, taskType);
    }

    if (!response.ok) {
      logger.warn(`Universal endpoint returned ${response.status}, trying legacy endpoint`);
      return await useLegacyEndpoint(taskId, taskType);
    }

    const result = await response.json();
    
    if (result.success) {
      logger.info(`Universal auto-fill completed for ${taskType} with ${result.count || 'unknown'} responses`);
      
      // Refresh form data
      if (formService) {
        // First update the form service data
        await formService.resetData();
        
        // Then get the updated data to reset the form
        const refreshedData = await formService.getFormData();
        
        // Finally reset the form with the new data
        resetForm(refreshedData);
        
        // Log successful data refresh
        logger.info('Successfully refreshed form data after demo auto-fill');
      }
      
      // Force a re-render to update the UI
      setForceRerender((prev: boolean) => !prev);
      
      // Update progress if needed
      if (onProgress) {
        await refreshStatus();
      }
      
      // Show success message
      toast({
        title: 'Demo Auto-Fill Complete',
        description: `Successfully filled ${result.count || 'all'} form fields with sample data.`,
        variant: 'success',
      });
      
      // Save progress
      await saveProgress();
      
    } else {
      logger.error('Demo auto-fill failed:', result.message);
      toast({
        title: 'Demo Auto-Fill Failed',
        description: result.message || 'Failed to auto-fill the form. Please try again.',
        variant: 'destructive',
      });
    }
  } catch (error) {
    logger.error('Error during demo auto-fill:', error);
    toast({
      title: 'Auto-Fill Error',
      description: error instanceof Error ? error.message : 'An unexpected error occurred',
      variant: 'destructive',
    });
  }
  
  // Function to use legacy type-specific endpoints if universal endpoint fails
  async function useLegacyEndpoint(taskId: number, taskType: string): Promise<void> {
    try {
      let endpoint = '';
      
      // Determine appropriate legacy endpoint based on task type
      if (taskType === 'kyb' || taskType === 'company_kyb') {
        endpoint = `/api/kyb/demo-autofill/${taskId}`;
      } else if (taskType === 'ky3p' || taskType === 'sp_ky3p_assessment' || taskType === 'security' || taskType === 'security_assessment') {
        endpoint = `/api/ky3p/demo-autofill/${taskId}`;
      } else if (taskType === 'open_banking' || taskType === 'open_banking_survey') {
        endpoint = `/api/open-banking/demo-autofill/${taskId}`;
      } else {
        throw new Error(`Unsupported form type: ${taskType}`);
      }
      
      logger.info(`Using legacy endpoint: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Legacy endpoint failed with status ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        logger.info(`Legacy auto-fill completed for ${taskType}`);
        
        // Refresh form data
        if (formService) {
          // First update the form service data
          await formService.resetData();
          
          // Then get the updated data to reset the form
          const refreshedData = await formService.getFormData();
          
          // Finally reset the form with the new data
          resetForm(refreshedData);
          
          // Log successful data refresh
          logger.info('Successfully refreshed form data after legacy demo auto-fill');
        }
        
        // Force a re-render to update the UI
        setForceRerender((prev: boolean) => !prev);
        
        // Update progress if needed
        if (onProgress) {
          await refreshStatus();
        }
        
        // Show success message
        toast({
          title: 'Demo Auto-Fill Complete',
          description: `Successfully filled form fields with sample data.`,
          variant: 'success',
        });
        
        // Save progress
        await saveProgress();
        
      } else {
        throw new Error(result.message || 'Failed to auto-fill the form');
      }
    } catch (error) {
      logger.error('Legacy endpoint error:', error);
      toast({
        title: 'Demo Auto-Fill Failed',
        description: error instanceof Error ? error.message : 'Failed to auto-fill the form. Please try again.',
        variant: 'destructive',
      });
    }
  }
}