import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

/**
 * Simplified demo auto-fill implementation 
 * for use in the UniversalForm component
 */
export const createDemoAutoFillHandler = ({
  taskId,
  taskType,
  form,
  resetForm,
  updateField,
  refreshStatus,
  saveProgress,
  onProgress,
  formService
}) => {
  // State for demo fill loading indicator
  const [demoFillLoading, setDemoFillLoading] = useState(false);

  // Main demo auto-fill function
  const handleDemoAutoFill = useCallback(async () => {
    if (!taskId) {
      toast({
        variant: "destructive",
        title: "Auto-Fill Failed",
        description: "No task ID available for auto-fill",
      });
      return false;
    }
    
    setDemoFillLoading(true);
    
    try {
      console.log(`[UniversalForm] Starting demo auto-fill for task ${taskId}`);
      
      // Show loading toast
      toast({
        title: "Auto-Fill In Progress",
        description: "Loading demo data...",
        duration: 3000,
      });
      
      // Special handling for KY3P forms using completely standalone approach
      if (taskType === 'sp_ky3p_assessment') {
        try {
          console.log(`[UniversalForm] Using standalone direct API solution for KY3P task ${taskId}`);
          
          // Call the standalone endpoint
          const response = await fetch(`/api/ky3p/apply-demo-data/${taskId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            if (response.status === 403) {
              toast({
                variant: "destructive", 
                title: "Auto-Fill Restricted",
                description: "Auto-fill is only available for demo companies."
              });
              setDemoFillLoading(false);
              return false;
            }
            
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to apply demo data');
          }
          
          const result = await response.json();
          
          if (!result.success) {
            throw new Error(result.message || 'Failed to apply demo data');
          }
          
          // Reset the form first to clear existing fields
          if (resetForm) {
            resetForm();
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          // Update form UI with the values from the response
          const demoData = result.data || {};
          for (const [key, value] of Object.entries(demoData)) {
            if (value !== null && value !== undefined) {
              form.setValue(key, value, {
                shouldValidate: true,
                shouldDirty: true,
                shouldTouch: true
              });
            }
          }
          
          // Invalidate queries to refresh UI
          const { queryClient } = await import('@/lib/queryClient');
          queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
          queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
          queryClient.invalidateQueries({ queryKey: ['/api/ky3p/progress'] });
          
          // Show success toast
          toast({
            title: "Auto-Fill Complete",
            description: `Applied demo data to ${result.successCount} fields`,
            duration: 3000,
          });
          
          // Refresh status
          if (refreshStatus) {
            refreshStatus();
          }
          
          // Update progress indicator
          if (onProgress) {
            onProgress(100);
          }
          
          setDemoFillLoading(false);
          return true;
        } catch (error) {
          console.error(`[UniversalForm] KY3P standalone demo fill failed:`, error);
          toast({
            variant: "destructive",
            title: "Auto-Fill Failed",
            description: error instanceof Error ? error.message : "Failed to auto-fill form",
          });
          setDemoFillLoading(false);
          return false;
        }
      }
      
      // For non-KY3P forms, use the original approach
      try {
        let demoData = {};
        let endpoint;
        
        if (taskType === 'open_banking' || taskType === 'open_banking_survey') {
          endpoint = `/api/open-banking/demo-autofill/${taskId}`;
        } else {
          endpoint = `/api/kyb/demo-autofill/${taskId}`;
        }
        
        console.log(`[UniversalForm] Using form-specific demo auto-fill endpoint: ${endpoint}`);
        const demoDataResponse = await fetch(endpoint);
        
        if (!demoDataResponse.ok) {
          if (demoDataResponse.status === 403) {
            toast({
              variant: "destructive",
              title: "Auto-Fill Restricted",
              description: "Auto-fill is only available for demo companies.",
            });
            setDemoFillLoading(false);
            return false;
          } else {
            toast({
              variant: "destructive",
              title: "Auto-Fill Failed",
              description: "Could not load demo data from server.",
            });
            setDemoFillLoading(false);
            return false;
          }
        }
        
        demoData = await demoDataResponse.json();
        
        console.log(`[UniversalForm] Retrieved ${Object.keys(demoData).length} demo fields for auto-fill`);
        
        // Combine demo data with existing form data for a more complete set
        const currentValues = form.getValues();
        const completeData = {
          ...currentValues,
          ...demoData,
        };
        
        // Reset the form first to clear any existing fields
        if (resetForm) {
          resetForm();
        }
        
        // Add a small delay to allow the form to reset
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Different handling based on form type
        if (taskType === 'kyb' || taskType === 'company_kyb') {
          // For KYB forms, use the proven batched approach
          console.log(`[UniversalForm] Using enhanced individual field updates for ${taskType}`);
          
          let fieldsUpdated = 0;
          const fieldEntries = Object.entries(completeData).filter(
            ([_, fieldValue]) => fieldValue !== null && fieldValue !== undefined && fieldValue !== ''
          );
          
          // First, update all form values in the UI
          for (const [fieldName, fieldValue] of fieldEntries) {
            form.setValue(fieldName, fieldValue, {
              shouldValidate: true,
              shouldDirty: true,
              shouldTouch: true
            });
          }
          
          // Wait for form values to be updated in UI
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Apply server-side updates in batches of 5 with longer delays
          // This approach reduces the chance of race conditions
          const batchSize = 5;
          for (let i = 0; i < fieldEntries.length; i += batchSize) {
            const batch = fieldEntries.slice(i, i + batchSize);
            
            // Process each batch in parallel for speed, but with controlled timing
            await Promise.all(batch.map(async ([fieldName, fieldValue]) => {
              if (typeof updateField === 'function') {
                await updateField(fieldName, fieldValue);
                fieldsUpdated++;
              }
            }));
            
            // Add a substantial delay between batches
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          
          // Add final delay for form reconciliation
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        // For Open Banking forms, use the form service's bulkUpdate method
        else if (taskType === 'open_banking' || taskType === 'open_banking_survey') {
          console.log(`[UniversalForm] Using form service bulkUpdate for ${taskType}`);
          
          // Filter out empty values to get valid responses for bulk update
          const validResponses = {};
          let fieldCount = 0;
          
          for (const [fieldKey, fieldValue] of Object.entries(completeData)) {
            if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
              // Add to valid responses
              validResponses[fieldKey] = fieldValue;
              fieldCount++;
              
              // Update the UI form state
              form.setValue(fieldKey, fieldValue, {
                shouldValidate: true,
                shouldDirty: true,
                shouldTouch: true
              });
            }
          }
          
          if (fieldCount === 0) {
            console.warn(`[UniversalForm] No valid responses found for auto-fill`);
            toast({
              variant: "warning",
              title: "No Data Available",
              description: "No valid demo data was found for this form type.",
            });
            setDemoFillLoading(false);
            return false;
          }
          
          try {
            if ((taskType === 'open_banking' || taskType === 'open_banking_survey') && formService && 'bulkUpdate' in formService) {
              console.log(`[UniversalForm] Using Open Banking form service's bulkUpdate method`);
              
              const success = await formService.bulkUpdate(validResponses, taskId);
              
              if (!success) {
                throw new Error('The Open Banking form service bulkUpdate method failed');
              }
              
              console.log(`[UniversalForm] Open Banking form service bulk update successful`);
            }
            else {
              // Fallback to direct API call as a last resort
              console.warn(`[UniversalForm] No bulkUpdate method found in form service`);
              
              throw new Error('Form service does not support bulkUpdate method. Please check implementation.');
            }
            
            // Force query refresh
            const { queryClient } = await import('@/lib/queryClient');
            queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
            queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
          } catch (innerError) {
            console.error('[UniversalForm] Error during bulk update:', innerError);
            
            toast({
              variant: "destructive",
              title: "Auto-Fill Failed",
              description: "Could not update form with demo data. Please try again or contact support.",
            });
            
            setDemoFillLoading(false);
            return false;
          }
        } else {
          // No other form types to handle
          console.warn(`[UniversalForm] Unsupported form type: ${taskType}`);
          toast({
            variant: "warning",
            title: "Auto-Fill Unavailable",
            description: `No auto-fill implementation is available for ${taskType} forms.`,
          });
          setDemoFillLoading(false);
          return false;
        }
        
        // Refresh form status to update progress indicators
        if (refreshStatus) {
          await refreshStatus();
        }
        
        // Show success toast
        toast({
          title: "Auto-Fill Complete",
          description: `Successfully filled ${Object.keys(demoData).length} fields with demo data`,
          duration: 3000,
        });
        
        // Update progress indicator if callback provided
        if (onProgress) {
          onProgress(100);
        }
        
        // Final save to ensure all changes are persisted
        if (saveProgress) {
          await saveProgress();
        }
        
        setDemoFillLoading(false);
        return true;
      } catch (err) {
        console.error('[UniversalForm] Error in demo auto-fill:', err);
        
        toast({
          variant: "destructive",
          title: "Auto-Fill Failed",
          description: err instanceof Error ? err.message : "There was an error loading demo data",
        });
        setDemoFillLoading(false);
        return false;
      }
    } catch (error) {
      console.error('[UniversalForm] Unhandled error in demo auto-fill:', error);
      
      toast({
        variant: "destructive",
        title: "Auto-Fill Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred during auto-fill",
      });
      
      setDemoFillLoading(false);
      return false;
    }
  }, [taskId, taskType, form, resetForm, updateField, refreshStatus, saveProgress, onProgress, formService]);

  return { demoFillLoading, handleDemoAutoFill };
};

export default createDemoAutoFillHandler;