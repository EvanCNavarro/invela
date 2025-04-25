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
  // STEP 1: Parameter Validation
  logger.info(`[DEMO AUTOFILL] STEP 1: Validating parameters`, {
    taskId,
    taskType,
    formServicePresent: !!formService,
    formServiceType: formService ? formService.constructor.name : 'none',
    resetDataMethodExists: formService ? typeof formService.resetData === 'function' : false,
    updateFieldMethodExists: formService ? typeof formService.updateField === 'function' : false
  });
  
  if (!taskId || !formService) {
    logger.error(`[DEMO AUTOFILL] Parameter validation failed - missing taskId or formService`);
    toast({
      title: 'Demo Auto-Fill Error',
      description: 'Could not auto-fill the form. Missing task ID or form service.',
      variant: 'destructive',
    });
    return;
  }

  try {
    // STEP 2: Prepare API Request
    logger.info(`[DEMO AUTOFILL] STEP 2: Starting demo auto-fill for task ${taskId}, type ${taskType}`);
    
    // Try universal endpoint first
    const universalEndpoint = `/api/demo-autofill/${taskId}`;
    
    logger.info(`[DEMO AUTOFILL] Using unified endpoint: ${universalEndpoint}`);
    
    // Show loading toast
    toast({
      title: 'Demo Auto-Fill',
      description: 'Filling form with sample data...',
      variant: 'default',
    });

    // STEP 3: Make API Request
    logger.info(`[DEMO AUTOFILL] STEP 3: Sending API request to demo-autofill endpoint`);
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
      
      logger.info(`[DEMO AUTOFILL] API response received:`, {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });
    } catch (error) {
      // If universal endpoint fails, fall back to legacy endpoints
      logger.error(`[DEMO AUTOFILL] Universal endpoint failed with error:`, error);
      return await useLegacyEndpoint(taskId, taskType);
    }

    if (!response.ok) {
      logger.warn(`[DEMO AUTOFILL] Universal endpoint returned ${response.status}, trying legacy endpoint`);
      return await useLegacyEndpoint(taskId, taskType);
    }

    // STEP 4: Process API Response
    logger.info(`[DEMO AUTOFILL] STEP 4: Processing API response`);
    const result = await response.json();
    logger.info(`[DEMO AUTOFILL] Response JSON:`, result);
    
    if (result.success) {
      logger.info(`[DEMO AUTOFILL] Universal auto-fill completed for ${taskType} with ${result.count || 'unknown'} responses`);
      
      // STEP 5: Reset Form Data
      logger.info(`[DEMO AUTOFILL] STEP 5: Resetting form data`);
      if (formService && typeof formService.resetData === 'function') {
        logger.info(`[DEMO AUTOFILL] Calling formService.resetData() for ${taskType}`);
        try {
          // First update the form service data
          await formService.resetData();
          logger.info(`[DEMO AUTOFILL] resetData() completed successfully`);
          
          // Then get the updated data to reset the form
          logger.info(`[DEMO AUTOFILL] Getting fresh form data`);
          const refreshedData = formService.getFormData();
          logger.info(`[DEMO AUTOFILL] Retrieved form data with ${Object.keys(refreshedData).length} fields`);
          if (Object.keys(refreshedData).length > 0) {
            logger.info(`[DEMO AUTOFILL] Sample fields:`, 
              Object.entries(refreshedData).slice(0, 3).map(([key, value]) => ({ key, value }))
            );
          }
          
          // Finally reset the form with the new data
          logger.info(`[DEMO AUTOFILL] Resetting form with refreshed data`);
          resetForm(refreshedData);
          
          // Log successful data refresh
          logger.info(`[DEMO AUTOFILL] Successfully refreshed form data after demo auto-fill`);
        } catch (resetError) {
          logger.error(`[DEMO AUTOFILL] Error during form reset:`, resetError);
        }
      } else {
        logger.error(`[DEMO AUTOFILL] Cannot reset form - formService.resetData is not a function`);
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
      // STEP 1: Determine appropriate legacy endpoint
      logger.info(`[LEGACY AUTOFILL] STEP 1: Determining legacy endpoint for type: ${taskType}`);
      let endpoint = '';
      
      // Determine appropriate legacy endpoint based on task type
      if (taskType === 'kyb' || taskType === 'company_kyb') {
        endpoint = `/api/kyb/demo-autofill/${taskId}`;
        logger.info(`[LEGACY AUTOFILL] Using KYB endpoint: ${endpoint}`);
      } else if (taskType === 'ky3p' || taskType === 'sp_ky3p_assessment' || taskType === 'security' || taskType === 'security_assessment') {
        endpoint = `/api/ky3p/demo-autofill/${taskId}`;
        logger.info(`[LEGACY AUTOFILL] Using KY3P endpoint: ${endpoint}`);
      } else if (taskType === 'open_banking' || taskType === 'open_banking_survey') {
        endpoint = `/api/open-banking/demo-autofill/${taskId}`;
        logger.info(`[LEGACY AUTOFILL] Using Open Banking endpoint: ${endpoint}`);
      } else {
        logger.error(`[LEGACY AUTOFILL] Unsupported form type: ${taskType}`);
        throw new Error(`Unsupported form type: ${taskType}`);
      }
      
      // STEP 2: Make API Request
      logger.info(`[LEGACY AUTOFILL] STEP 2: Sending request to legacy endpoint: ${endpoint}`);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      logger.info(`[LEGACY AUTOFILL] Legacy endpoint response:`, {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });
      
      if (!response.ok) {
        logger.error(`[LEGACY AUTOFILL] Legacy endpoint failed with status ${response.status}`);
        throw new Error(`Legacy endpoint failed with status ${response.status}`);
      }
      
      // STEP 3: Process API Response
      logger.info(`[LEGACY AUTOFILL] STEP 3: Processing legacy endpoint response`);
      const result = await response.json();
      logger.info(`[LEGACY AUTOFILL] Legacy endpoint response data:`, result);
      
      if (result.success) {
        logger.info(`[LEGACY AUTOFILL] Legacy auto-fill completed for ${taskType}`);
        
        // STEP 4: Reset Form Data
        logger.info(`[LEGACY AUTOFILL] STEP 4: Resetting form data`);
        if (formService && typeof formService.resetData === 'function') {
          logger.info(`[LEGACY AUTOFILL] Calling formService.resetData() for ${taskType} using legacy endpoint`);
          try {
            // First update the form service data
            await formService.resetData();
            logger.info(`[LEGACY AUTOFILL] resetData() completed successfully`);
            
            // Then get the updated data to reset the form
            logger.info(`[LEGACY AUTOFILL] Getting fresh form data`);
            const refreshedData = formService.getFormData();
            logger.info(`[LEGACY AUTOFILL] Retrieved form data with ${Object.keys(refreshedData).length} fields`);
            if (Object.keys(refreshedData).length > 0) {
              logger.info(`[LEGACY AUTOFILL] Sample fields:`, 
                Object.entries(refreshedData).slice(0, 3).map(([key, value]) => ({ key, value }))
              );
            }
            
            // Finally reset the form with the new data
            logger.info(`[LEGACY AUTOFILL] Resetting form with refreshed data`);
            resetForm(refreshedData);
            
            // Log successful data refresh
            logger.info(`[LEGACY AUTOFILL] Successfully refreshed form data after legacy demo auto-fill`);
          } catch (resetError) {
            logger.error(`[LEGACY AUTOFILL] Error during form reset:`, resetError);
          }
        } else {
          logger.error(`[LEGACY AUTOFILL] Cannot reset form - formService.resetData is not a function`);
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