import { toast } from "@/hooks/use-toast";
// Use console.log directly to avoid logger issues
const log = console;

/**
 * Function to handle demo auto-fill across different form types
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
}: {
  taskId: number;
  taskType: string;
  form: any;
  resetForm: (data: Record<string, any>) => void;
  updateField?: (fieldKey: string, value: any) => Promise<void>;
  refreshStatus?: () => void;
  saveProgress?: () => Promise<void>;
  onProgress?: (progress: number) => void;
  formService?: any;
  setForceRerender?: (value: ((prev: boolean) => boolean)) => void;
}) {
  if (!taskId) {
    toast({
      variant: "destructive",
      title: "Auto-Fill Failed",
      description: "No task ID available for auto-fill",
    });
    return false;
  }
  
  try {
    log.info(`[UniversalForm] Starting demo auto-fill for task ${taskId}`);
    
    // Show loading toast
    toast({
      title: "Auto-Fill In Progress",
      description: "Loading demo data...",
      duration: 3000,
    });
    
    // Check what type of form this is for endpoint selection and logging
    const isKy3pTask = taskType === 'ky3p' || taskType === 'sp_ky3p_assessment';
    const isOpenBankingTask = taskType === 'open_banking' || taskType === 'open_banking_survey';
    const isKybTask = taskType === 'kyb' || taskType === 'company_kyb';
    
    // Universal endpoint for all form types
    const endpoint = `/api/demo-autofill/${taskId}`;
    
    try {
      log.info(`[UniversalForm] Using unified demo auto-fill endpoint: ${endpoint}`);
      
      // Call the server-side auto-fill which populates the database directly
      const autofillResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          formType: isKy3pTask ? 'ky3p' : isOpenBankingTask ? 'open_banking' : 'kyb'
        })
      });
      
      if (!autofillResponse.ok) {
        if (autofillResponse.status === 403) {
          toast({
            variant: "destructive",
            title: "Auto-Fill Restricted",
            description: "Auto-fill is only available for demo companies.",
          });
          return false;
        } else if (autofillResponse.status === 404) {
          // Universal endpoint not found, try form-specific endpoints as fallback
          log.warn(`[UniversalForm] Universal endpoint not found, trying form-specific endpoints`);
          
          // Use legacy form-specific endpoints
          if (isKy3pTask) {
            return await handleLegacyFormAutoFill('ky3p', taskId);
          } else if (isOpenBankingTask) {
            return await handleLegacyFormAutoFill('open_banking', taskId);
          } else if (isKybTask) {
            return await handleLegacyFormAutoFill('kyb', taskId);
          } else {
            toast({
              variant: "destructive",
              title: "Auto-Fill Failed",
              description: `No auto-fill implementation is available for ${taskType} forms.`,
            });
            return false;
          }
        } else {
          throw new Error(`Server returned ${autofillResponse.status}: ${autofillResponse.statusText}`);
        }
      }
      
      // If we're here, the universal endpoint worked successfully
      const result = await autofillResponse.json();
      const formTypeDisplay = isKy3pTask ? 'KY3P' : (isOpenBankingTask ? 'Open Banking' : 'KYB');
      
      log.info(`[UniversalForm] Universal auto-fill completed for ${formTypeDisplay} with ${result.responsesInserted || 0} responses`);
      
      // Perform form refresh
      await refreshFormAfterAutoFill(formTypeDisplay, result.responsesInserted || 0);
      return true;
      
    } catch (error) {
      log.error('[UniversalForm] Error during universal auto-fill:', error);
      
      toast({
        variant: "destructive",
        title: "Auto-Fill Failed",
        description: error instanceof Error ? error.message : "Failed to auto-fill form. Please try again.",
      });
      
      return false;
    }
  } catch (err) {
    log.error('[UniversalForm] Auto-fill error:', err);
    toast({
      variant: "destructive",
      title: "Auto-Fill Failed",
      description: err instanceof Error ? err.message : "There was an error loading demo data",
    });
    return false;
  }
  
  // Helper function to refresh form after auto-fill
  async function refreshFormAfterAutoFill(formTypeDisplay: string, responsesInserted: number = 0) {
    // Force query invalidation to refresh data from server
    const { queryClient } = await import('@/lib/queryClient');
    queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
    queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    
    // Form-specific query invalidation
    if (taskType === 'kyb' || taskType === 'company_kyb') {
      queryClient.invalidateQueries({ queryKey: [`/api/kyb/progress/${taskId}`] });
    } else if (taskType === 'ky3p' || taskType === 'sp_ky3p_assessment') {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/ky3p-responses`] });
      queryClient.invalidateQueries({ queryKey: [`/api/ky3p/progress/${taskId}`] });
    } else if (taskType === 'open_banking' || taskType === 'open_banking_survey') {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/open-banking-responses`] });
      queryClient.invalidateQueries({ queryKey: [`/api/open-banking/progress/${taskId}`] });
    }
    
    // Wait longer for queries to be invalidated
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // COMPLETELY RESET THE FORM to force full refresh from server
    if (formService) {
      log.info('[UniversalForm] Forcing form service to reload data from server');
      // Clear any cached data in the form service
      try {
        // Safely attempt to call clearCache if it exists
        const anyFormService = formService as any;
        if (typeof anyFormService.clearCache === 'function') {
          anyFormService.clearCache();
        }
        
        // VERY IMPORTANT: Call loadResponses explicitly if it exists
        if (typeof anyFormService.loadResponses === 'function') {
          log.info('[UniversalForm] Explicitly calling loadResponses to reload form data');
          await anyFormService.loadResponses();
        }
      } catch (e) {
        log.warn('[UniversalForm] Error during form service cache/data refresh:', e);
      }
      
      // Reset form with empty data to force full refresh
      if (resetForm) {
        log.info('[UniversalForm] Resetting form with empty data to force full refresh');
        resetForm({});
      }
      
      // Force form to refetch all data if method exists
      try {
        const anyFormService = formService as any;
        if (typeof anyFormService.loadFormStructure === 'function') {
          log.info('[UniversalForm] Calling formService.loadFormStructure()');
          await anyFormService.loadFormStructure();
        }
        
        // Reload all form data from the server if method exists
        if (typeof anyFormService.loadFormData === 'function') {
          log.info('[UniversalForm] Calling formService.loadFormData()');
          await anyFormService.loadFormData();
        }
        
        // Explicitly reload fields if getFields method exists
        if (typeof anyFormService.getFields === 'function') {
          log.info('[UniversalForm] Explicitly reloading fields with formService.getFields()');
          const updatedFields = await anyFormService.getFields();
          log.info(`[UniversalForm] Reloaded ${updatedFields.length} fields`);
        }
      } catch (e) {
        log.warn('[UniversalForm] Error reloading form data:', e);
      }
    }
    
    // Refresh all section statuses
    if (refreshStatus) {
      refreshStatus();
    }
    
    // Force a React component re-render by toggling force rerender state
    if (setForceRerender) {
      setForceRerender(prev => !prev);
    }
    
    // Show success message
    toast({
      title: "Auto-Fill Complete",
      description: `Successfully filled all ${formTypeDisplay} fields with demo data (${responsesInserted} responses)`,
      variant: "success",
    });
    
    // Save progress
    if (saveProgress) {
      await saveProgress();
    }
    
    // Update progress
    if (onProgress) {
      onProgress(100);
    }
  }
  
  // Legacy fallback for form-specific endpoints
  async function handleLegacyFormAutoFill(formType: 'kyb' | 'ky3p' | 'open_banking', taskId: number): Promise<boolean> {
    try {
      let endpoint = '';
      let formTypeDisplay = '';
      
      // Determine the appropriate endpoint and display name
      if (formType === 'kyb') {
        endpoint = `/api/kyb/demo-autofill/${taskId}`;
        formTypeDisplay = 'KYB';
      } else if (formType === 'ky3p') {
        endpoint = `/api/ky3p/demo-autofill/${taskId}`;
        formTypeDisplay = 'KY3P';
      } else if (formType === 'open_banking') {
        endpoint = `/api/open-banking/demo-autofill/${taskId}`;
        formTypeDisplay = 'Open Banking';
      } else {
        throw new Error(`Unknown form type: ${formType}`);
      }
      
      log.info(`[UniversalForm] Using legacy ${formTypeDisplay} auto-fill endpoint: ${endpoint}`);
      
      // Attempt to call the legacy endpoint
      const response = await fetch(endpoint, { method: 'POST' });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      log.info(`[UniversalForm] Legacy ${formTypeDisplay} auto-fill completed with ${result.responsesInserted || 0} responses`);
      
      // Refresh the form with the new data
      await refreshFormAfterAutoFill(formTypeDisplay, result.responsesInserted || 0);
      return true;
    } catch (error) {
      log.error(`[UniversalForm] Error during legacy ${formType} auto-fill:`, error);
      toast({
        variant: "destructive",
        title: "Auto-Fill Failed",
        description: error instanceof Error ? error.message : "Failed to auto-fill form. Please try again.",
      });
      return false;
    }
  }
}