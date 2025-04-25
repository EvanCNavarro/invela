import { FormServiceInterface } from '@/services/formService';
import getLogger from '@/utils/logger';
import { toast } from '@/hooks/use-toast';
import { applyFormData } from './updateDemoFormUtils';

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
    
    // Try fixed demo auto-fill endpoint first
    const fixedEndpoint = `/api/fix-demo-autofill/${taskId}`;
    
    logger.info(`Using fixed demo auto-fill endpoint: ${fixedEndpoint}`);
    console.log(`Attempting to call fixed demo auto-fill endpoint: ${fixedEndpoint} with taskType: ${taskType}`);
    
    // Fall back to universal endpoint if fixed endpoint fails
    const universalEndpoint = `/api/demo-autofill/${taskId}`;
    
    // Show loading toast
    toast({
      title: 'Demo Auto-Fill',
      description: 'Filling form with sample data...',
      variant: 'default',
    });

    let response;
    try {
      // First try the fixed endpoint
      response = await fetch(fixedEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskType
        }),
      });
    } catch (error) {
      // If fixed endpoint fails, try universal endpoint
      logger.warn(`Fixed endpoint failed, trying universal endpoint: ${error instanceof Error ? error.message : String(error)}`);
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
      } catch (universalError) {
        // If universal endpoint also fails, fall back to legacy endpoints
        logger.warn(`Universal endpoint failed, trying legacy endpoint: ${universalError instanceof Error ? universalError.message : String(universalError)}`);
        return await useLegacyEndpoint(taskId, taskType);
      }
    }

    if (!response.ok) {
      logger.warn(`Endpoint returned ${response.status}, trying next fallback endpoint`);
      return await useLegacyEndpoint(taskId, taskType);
    }

    const result = await response.json();
    
    if (result.success) {
      logger.info(`Universal auto-fill completed for ${taskType} with ${result.fieldCount || 'unknown'} fields`);
      
      // Check if the server directly included the form data in the response
      if (result.formData && typeof result.formData === 'object' && Object.keys(result.formData).length > 0) {
        logger.info(`Using form data directly from demo-autofill response (${Object.keys(result.formData).length} fields)`);
        
        // Apply each field individually to ensure form field registration
        for (const [fieldKey, value] of Object.entries(result.formData)) {
          try {
            if (value !== null && value !== undefined) {
              await updateField(fieldKey, value);
              console.log(`Updated field ${fieldKey} with value:`, value);
            }
          } catch (fieldError) {
            console.warn(`Failed to update field ${fieldKey}:`, fieldError);
          }
        }
        
        // Then do a complete reset with all values
        resetForm(result.formData);
        
        // Add extra delay to allow UI to fully render
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        // Fall back to getting the data through separate requests
        logger.info('Form data not included in response, fetching separately...');
        
        // Add a small delay to allow the server to process updates
        await new Promise(resolve => setTimeout(resolve, 300));
        
        try {
          // Make a direct call to the backend to get the actual form data
          logger.info(`Fetching data directly from task endpoint for ${taskId}`);
          const taskResponse = await fetch(`/api/tasks.json/${taskId}`);
          
          if (taskResponse.ok) {
            const taskData = await taskResponse.json();
            logger.info(`Got fresh task data with ${taskData.savedFormData ? Object.keys(taskData.savedFormData).length : 0} fields`);
            
            // Use the saved form data if available
            if (taskData.savedFormData && Object.keys(taskData.savedFormData).length > 0) {
              logger.info('Applying saved form data from task response');
              resetForm(taskData.savedFormData);
            } else if (formService) {
              // Fall back to the form service if needed
              logger.info('Falling back to form service to get data');
              const refreshedData = await formService.getFormData();
              resetForm(refreshedData);
            }
          } else {
            throw new Error(`Failed to get task data: ${taskResponse.status}`);
          }
        } catch (refreshError) {
          logger.warn(`Error refreshing form data: ${refreshError instanceof Error ? refreshError.message : String(refreshError)}`);
          
          // Still try to use the form service if available
          if (formService) {
            try {
              const refreshedData = await formService.getFormData();
              resetForm(refreshedData);
            } catch (fsError) {
              logger.error(`Form service error: ${fsError instanceof Error ? fsError.message : String(fsError)}`);
            }
          }
        }
      }
      
      // Force a re-render to update the UI
      setForceRerender((prev: boolean) => !prev);
      
      // Update progress if needed
      if (onProgress) {
        try {
          await refreshStatus();
        } catch (statusError) {
          logger.warn(`Failed to refresh status: ${statusError instanceof Error ? statusError.message : String(statusError)}`);
        }
      }
      
      // Show success message
      toast({
        title: 'Demo Auto-Fill Complete',
        description: `Successfully filled ${result.fieldCount || 'all'} form fields with sample data.`,
        variant: 'success',
      });
      
      // Save progress
      try {
        await saveProgress();
      } catch (saveError) {
        logger.warn(`Failed to save progress: ${saveError instanceof Error ? saveError.message : String(saveError)}`);
      }
      
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
        
        // Add a small delay to allow the server to process updates
        await new Promise(resolve => setTimeout(resolve, 300));
        
        try {
          // Make a direct call to the backend to get the actual form data
          logger.info(`Fetching data directly from task endpoint for ${taskId}`);
          const taskResponse = await fetch(`/api/tasks.json/${taskId}`);
          
          if (taskResponse.ok) {
            const taskData = await taskResponse.json();
            logger.info(`Got fresh task data with ${taskData.savedFormData ? Object.keys(taskData.savedFormData).length : 0} fields`);
            
            // Use the saved form data if available
            if (taskData.savedFormData && Object.keys(taskData.savedFormData).length > 0) {
              logger.info('Applying saved form data from task response');
              resetForm(taskData.savedFormData);
            } else if (formService) {
              // Fall back to the form service if needed
              logger.info('Falling back to form service to get data');
              const refreshedData = await formService.getFormData();
              resetForm(refreshedData);
            }
          } else {
            throw new Error(`Failed to get task data: ${taskResponse.status}`);
          }
        } catch (refreshError) {
          logger.warn(`Error refreshing form data (legacy endpoint): ${refreshError instanceof Error ? refreshError.message : String(refreshError)}`);
          
          // Still try to use the form service if available
          if (formService) {
            try {
              const refreshedData = await formService.getFormData();
              resetForm(refreshedData);
            } catch (fsError) {
              logger.error(`Form service error: ${fsError instanceof Error ? fsError.message : String(fsError)}`);
            }
          }
        }
        
        // Force a re-render to update the UI
        setForceRerender((prev: boolean) => !prev);
        
        // Update progress if needed
        if (onProgress) {
          try {
            await refreshStatus();
          } catch (statusError) {
            logger.warn(`Failed to refresh status (legacy): ${statusError instanceof Error ? statusError.message : String(statusError)}`);
          }
        }
        
        // Show success message
        toast({
          title: 'Demo Auto-Fill Complete',
          description: `Successfully filled form fields with sample data.`,
          variant: 'success',
        });
        
        // Save progress
        try {
          await saveProgress();
        } catch (saveError) {
          logger.warn(`Failed to save progress (legacy): ${saveError instanceof Error ? saveError.message : String(saveError)}`);
        }
        
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