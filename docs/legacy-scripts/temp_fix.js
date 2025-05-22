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
      
      // Show loading toast
      toast({
        title: "Auto-Fill In Progress",
        description: "Loading demo data...",
        duration: 3000,
      });
      
      // Make API call to get demo data based on form type
      let endpoint;
      if (taskType === 'sp_ky3p_assessment') {
        endpoint = `/api/ky3p/demo-autofill/${taskId}`;
      } else if (taskType === 'open_banking' || taskType === 'open_banking_survey') {
        endpoint = `/api/open-banking/demo-autofill/${taskId}`;
      } else {
        endpoint = `/api/kyb/demo-autofill/${taskId}`;
      }
      
      logger.info(`[UniversalForm] Using demo auto-fill endpoint: ${endpoint} for task type: ${taskType}`);
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const demoData = await response.json();
      
      // Log the demo data received from the server
      console.log('[UniversalForm] Demo data received from server:', demoData);
      console.log('[UniversalForm] Demo data keys:', Object.keys(demoData));
      console.log('[UniversalForm] Demo data sample values:', 
        Object.entries(demoData).slice(0, 3).map(([k, v]) => `${k}: ${v}`));
        
      // Check if we actually received any data
      if (Object.keys(demoData).length === 0) {
        throw new Error('Server returned empty demo data. Please try again later.');
      }
      
      // Create a data object with all fields 
      const completeData: Record<string, any> = {};
      
      // First ensure all fields have a value, even if empty
      fields.forEach(field => {
        completeData[field.key] = '';
        console.log(`[UniversalForm] Setting base field ${field.key} to empty string`);
      });
      
      // Then apply any demo data that's available
      Object.entries(demoData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          completeData[key] = value;
          console.log(`[UniversalForm] Setting field ${key} to demo value: ${value}`);
        }
      });
      
      // Log the complete data object before resetting
      console.log('[UniversalForm] Complete data object before form reset:', 
        Object.keys(completeData).length, 'fields');
      
      try {
        // First forcefully clear all previous values to avoid any conflicts
        console.log('[UniversalForm] Forcefully clearing previous form values...');
        form.reset({});
        
        // Wait for state updates to process
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Add a manual re-render component flag
        setForceRerender(prev => !prev);
        
        // First update the form service directly
        if (formService) {
          console.log('[UniversalForm] Setting values directly on form service...');
          
          // Update all the fields in bulk
          const fieldsUpdated = await formService.bulkUpdate(completeData);
          console.log(`[UniversalForm] Bulk updated ${fieldsUpdated} fields in form service`);
        }
        
        // Now update the React Hook Form state
        // Ensure we have fields array before proceeding
        if (!fields || fields.length === 0) {
          console.warn('[UniversalForm] No fields available for form state update');
        } else {
          console.log(`[UniversalForm] Updating React form state for ${fields.length} fields...`);
          
          // Group fields by section for better logging and debugging
          const sectionFields: Record<string, string[]> = {
            'Company Profile': Object.keys(completeData).filter(key => {
              const field = fields.find(f => f.key === key);
              return field && field.section === 'section-1';
            }),
            'Governance & Leadership': Object.keys(completeData).filter(key => {
              const field = fields.find(f => f.key === key);
              return field && field.section === 'section-2';
            }),
            'Financial Profile': Object.keys(completeData).filter(key => {
              const field = fields.find(f => f.key === key);
              return field && (field.section === 'section-3' || field.section === 'section-4');
            }),
            'Operations & Compliance': Object.keys(completeData).filter(key => {
              const field = fields.find(f => f.key === key);
              return field && field.section === 'section-3';
            })
          };
          
          console.log('[UniversalForm] Section field counts:', {
            'Company Profile': sectionFields['Company Profile'].length,
            'Governance & Leadership': sectionFields['Governance & Leadership'].length,
            'Financial Profile': sectionFields['Financial Profile'].length,
            'Operations & Compliance': sectionFields['Operations & Compliance'].length
          });
          
          // Final field checking - find any missing field and set it directly
          // This is our last fallback to ensure 100% completion
          fields.forEach(field => {
            const { key, section } = field;
            const currentValue = form.getValues(key);
            
            if (!currentValue && completeData[key]) {
              // Found a missing field, set it again
              console.log(`[UniversalForm] Final pass - fixing missing field ${key} in section ${section}`);
              form.setValue(key, completeData[key], {
                shouldValidate: true,
                shouldDirty: true,
                shouldTouch: true
              });
              
              // Update backend if needed
              if (typeof updateField === 'function') {
                updateField(key, completeData[key]);
              }
            }
          });
          
          // One last force re-render after fixing any missing fields
          setForceRerender(prev => !prev);
        }
      } catch (resetError) {
        console.error('[UniversalForm] Error during form reset or field updates:', resetError);
        throw resetError;
      }
      
      // For KY3P, Open Banking, and other form types, use the bulk update approach
      if (taskType === 'sp_ky3p_assessment' || taskType === 'open_banking' || taskType === 'open_banking_survey') {
        try {
          logger.info(`[UniversalForm] Auto-filling ${taskType} form for task ${taskId} using standard bulk update approach`);
          
          // Filter out empty or undefined values and get only non-empty field values
          const validResponses: Record<string, any> = {};
          let fieldCount = 0;
          
          for (const [fieldKey, fieldValue] of Object.entries(completeData)) {
            if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
              // Add to valid responses
              validResponses[fieldKey] = fieldValue;
              fieldCount++;
              
              // Update the UI form state immediately
              form.setValue(fieldKey, fieldValue, {
                shouldValidate: true,
                shouldDirty: true,
                shouldTouch: true
              });
            }
          }
          
          // Proceed only if we have valid responses
          if (fieldCount === 0) {
            logger.warn(`[UniversalForm] No valid responses found for auto-fill`);
            throw new Error("No valid demo data available for auto-fill");
          }
          
          logger.info(`[UniversalForm] Making bulk update API call with ${fieldCount} fields`);
          
          // Construct proper endpoint based on form type
          const endpoint = 
            taskType === 'sp_ky3p_assessment' 
              ? `/api/tasks/${taskId}/ky3p-responses/bulk` 
              : `/api/tasks/${taskId}/${taskType}-responses/bulk`;
          
          // Make standardized bulk update with proper format { responses: data }
          // This follows exactly what the KYB form does successfully
          logger.debug(`[UniversalForm] Sending request to ${endpoint}`);
          logger.debug(`[UniversalForm] Request payload:`, { 
            responseCount: Object.keys(validResponses).length,
            sampleKeys: Object.keys(validResponses).slice(0, 3)
          });
          
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
          
          // Verify result
          if (!result.success) {
            logger.warn(`[UniversalForm] Bulk update returned success: false`);
            throw new Error("Server reported unsuccessful bulk update");
          }
          
          logger.info(`[UniversalForm] Updated ${result.updated || 0} field responses successfully`);
          
          // Import queryClient directly to invalidate task data queries
          const { queryClient } = await import('@/lib/queryClient');
          queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
          queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
        } catch (saveError) {
          logger.error(`[UniversalForm] Error finalizing form data:`, saveError);
          throw saveError;
        }
      }
      
      // Save regular progress to server for other form types
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
