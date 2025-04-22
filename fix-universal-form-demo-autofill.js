/**
 * Fixed implementation of handleDemoAutoFill for UniversalForm.tsx
 * 
 * This implementation resolves the syntax errors causing the application
 * to fail to load.
 */

// This is the complete fixed version
const handleDemoAutoFill = useCallback(async () => {
  if (!taskId) {
    toast({
      variant: "destructive",
      title: "Auto-Fill Failed",
      description: "No task ID available for auto-fill",
    });
    return false;
  }
  
  // Set loading state
  setDemoFillLoading(true);
  
  try {
    logger.info(`[UniversalForm] Starting demo auto-fill for task ${taskId}`);
    
    // Show loading toast
    toast({
      title: "Auto-Fill In Progress",
      description: "Loading demo data...",
      duration: 3000,
    });
    
    // Special handling for KY3P forms using completely standalone approach
    if (taskType === 'sp_ky3p_assessment') {
      try {
        logger.info(`[UniversalForm] Using standalone direct API solution for KY3P task ${taskId}`);
        
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
        
        logger.info(`[UniversalForm] KY3P direct API response:`, {
          success: result.success,
          fieldsProcessed: result.successCount,
          progress: result.progress
        });
        
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
        logger.error(`[UniversalForm] KY3P standalone demo fill failed:`, error);
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
    let demoData = {};
    let endpoint;
    
    if (taskType === 'open_banking' || taskType === 'open_banking_survey') {
      endpoint = `/api/open-banking/demo-autofill/${taskId}`;
    } else {
      endpoint = `/api/kyb/demo-autofill/${taskId}`;
    }
    
    logger.info(`[UniversalForm] Using form-specific demo auto-fill endpoint: ${endpoint} for task type: ${taskType}`);
    
    try {
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
    } catch (error) {
      logger.error(`[UniversalForm] Error fetching demo data:`, error);
      toast({
        variant: "destructive",
        title: "Auto-Fill Failed",
        description: "Failed to fetch demo data from server.",
      });
      setDemoFillLoading(false);
      return false;
    }
    
    logger.info(`[UniversalForm] Retrieved ${Object.keys(demoData).length} demo fields for auto-fill`);
    
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
    if (taskType === 'sp_ky3p_assessment') {
      // This should never happen as KY3P forms are handled above
      logger.warn(`[UniversalForm] WARNING: Unexpected code path for KY3P form. This should not happen.`);
      toast({
        variant: "warning",
        title: "Unexpected Behavior",
        description: "The form is using an unexpected processing path. Please contact support.",
      });
      setDemoFillLoading(false);
      return false;
    }
    else if (taskType === 'kyb' || taskType === 'company_kyb') {
      // For KYB forms, use the proven batched approach
      logger.info(`[UniversalForm] Using enhanced individual field updates for ${taskType}`);
      
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
        logger.info(`[UniversalForm] Processed batch ${i/batchSize + 1} of ${Math.ceil(fieldEntries.length/batchSize)}`);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // Add final delay for form reconciliation
      logger.info(`[UniversalForm] All batches complete. Updated ${fieldsUpdated} fields. Waiting for final reconciliation.`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    // For Open Banking forms, use the form service's bulkUpdate method
    else if (taskType === 'open_banking' || taskType === 'open_banking_survey') {
      logger.info(`[UniversalForm] Using form service bulkUpdate for ${taskType}`);
      
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
        logger.warn(`[UniversalForm] No valid responses found for auto-fill`);
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
          logger.info(`[UniversalForm] Using Open Banking form service's bulkUpdate method for task ${taskId} with ${fieldCount} fields`);
          
          const success = await formService.bulkUpdate(validResponses, taskId);
          
          if (!success) {
            throw new Error('The Open Banking form service bulkUpdate method failed');
          }
          
          logger.info(`[UniversalForm] Open Banking form service bulk update successful`);
        }
        else {
          // Fallback to direct API call as a last resort
          logger.warn(`[UniversalForm] No bulkUpdate method found in form service, using direct API call instead`);
          
          throw new Error('Form service does not support bulkUpdate method. Please check implementation.');
        }
        
        // Force query refresh
        const { queryClient } = await import('@/lib/queryClient');
        queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
        queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      } catch (error) {
        logger.error('[UniversalForm] Error during bulk update:', error);
        
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
      logger.warn(`[UniversalForm] Unsupported form type: ${taskType}. No auto-fill implementation available.`);
      toast({
        variant: "warning",
        title: "Auto-Fill Unavailable",
        description: `No auto-fill implementation is available for ${taskType} forms.`,
      });
      setDemoFillLoading(false);
      return false;
    }
    
    // Save progress
    if (saveProgress) {
      await saveProgress();
    }
    
    // Show success message
    toast({
      title: "Auto-Fill Complete",
      description: "Demo data has been loaded successfully.",
      variant: "success",
    });
    
    // Refresh status and set progress to 100%
    if (refreshStatus) {
      refreshStatus();
    }
    if (onProgress) {
      onProgress(100);
    }
    
    setDemoFillLoading(false);
    return true;
  } catch (err) {
    logger.error('[UniversalForm] Auto-fill error:', err);
    toast({
      variant: "destructive",
      title: "Auto-Fill Failed",
      description: err instanceof Error ? err.message : "There was an error loading demo data",
    });
    setDemoFillLoading(false);
    return false;
  }
}, [taskId, taskType, form, resetForm, updateField, refreshStatus, saveProgress, onProgress, formService, toast, logger]);