// Handle demo auto-fill functionality
const handleDemoAutoFill = useCallback(async () => {
  if (!taskId) {
    toast({
      variant: "destructive",
      title: "Auto-Fill Failed",
      description: "No task ID available for auto-fill",
    });
    return false;
  }
  
  try {
    logger.info(`[UniversalForm] Starting demo auto-fill for task ${taskId}`);
    
    // Get demo data from server
    const demoDataResponse = await fetch(`/api/tasks/${taskId}/${taskType}-demo`);
    
    if (!demoDataResponse.ok) {
      if (demoDataResponse.status === 403) {
        toast({
          variant: "destructive",
          title: "Auto-Fill Restricted",
          description: "Auto-fill is only available for demo companies.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Auto-Fill Failed",
          description: "Could not load demo data from server.",
        });
      }
      return false;
    }
    
    const demoData = await demoDataResponse.json();
    logger.info(`[UniversalForm] Retrieved ${Object.keys(demoData).length} demo fields from server`);
    
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
    
    // For KY3P and Open Banking forms, use the bulk update approach
    if (taskType === 'sp_ky3p_assessment' || taskType === 'open_banking' || taskType === 'open_banking_survey') {
      logger.info(`[UniversalForm] Using bulk update API for ${taskType}`);
      
      // Filter out empty values to get valid responses for bulk update
      const validResponses: Record<string, any> = {};
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
        return false;
      }
      
      // Construct proper endpoint based on form type
      const endpoint = 
        taskType === 'sp_ky3p_assessment' 
          ? `/api/tasks/${taskId}/ky3p-responses/bulk` 
          : `/api/tasks/${taskId}/${taskType}-responses/bulk`;
      
      logger.info(`[UniversalForm] Sending bulk update to ${endpoint} with ${fieldCount} fields`);
      
      // Send the bulk update request
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            responses: validResponses
          }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          logger.error(`[UniversalForm] Bulk update failed: ${response.status}`, errorText);
          throw new Error(`Bulk update failed: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        logger.info(`[UniversalForm] Bulk update successful:`, result);
        
        // Force query refresh
        const { queryClient } = await import('@/lib/queryClient');
        queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
        queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      } catch (error) {
        logger.error('[UniversalForm] Error during bulk update:', error);
        throw error;
      }
    } else {
      // For other form types, use individual field updates
      logger.info(`[UniversalForm] Using individual field updates for ${taskType}`);
      
      let fieldsUpdated = 0;
      
      for (const fieldName in completeData) {
        const fieldValue = completeData[fieldName];
        
        if (fieldValue !== null && fieldValue !== undefined && fieldValue !== '') {
          form.setValue(fieldName, fieldValue, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true
          });
          
          if (typeof updateField === 'function') {
            await updateField(fieldName, fieldValue);
            fieldsUpdated++;
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
      }
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
    refreshStatus();
    if (onProgress) {
      onProgress(100);
    }
    
    return true;
  } catch (err) {
    logger.error('[UniversalForm] Auto-fill error:', err);
    toast({
      variant: "destructive",
      title: "Auto-Fill Failed",
      description: err instanceof Error ? err.message : "There was an error loading demo data",
    });
    return false;
  }
}, [toast, taskId, taskType, form, resetForm, updateField, refreshStatus, saveProgress, onProgress, logger]);