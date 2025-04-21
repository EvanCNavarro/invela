const fs = require('fs');

// Read the original file
const originalFile = fs.readFileSync('client/src/components/forms/UniversalForm.tsx', 'utf8');

// Locate the function and its surroundings
const functionRegex = /\/\/ Handle demo auto-fill functionality[\s\S]*?\}, \[toast, taskId, taskType, form[\s\S]*?logger\]\);/g;
const functionMatch = originalFile.match(functionRegex);

if (!functionMatch) {
  console.error('Could not find the handleDemoAutoFill function');
  process.exit(1);
}

// Create a fixed function 
const fixedFunction = `  // Handle demo auto-fill functionality
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
      logger.info(\`[UniversalForm] Starting demo auto-fill for task \${taskId}\`);
      
      // Show loading toast
      toast({
        title: "Auto-Fill In Progress",
        description: "Loading demo data...",
        duration: 3000,
      });
      
      // Make API call to get demo data based on form type
      let endpoint;
      if (taskType === 'sp_ky3p_assessment') {
        endpoint = \`/api/ky3p/demo-autofill/\${taskId}\`;
      } else if (taskType === 'open_banking' || taskType === 'open_banking_survey') {
        endpoint = \`/api/open-banking/demo-autofill/\${taskId}\`;
      } else {
        endpoint = \`/api/kyb/demo-autofill/\${taskId}\`;
      }
      
      logger.info(\`[UniversalForm] Using demo auto-fill endpoint: \${endpoint} for task type: \${taskType}\`);
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(\`Server returned \${response.status}: \${response.statusText}\`);
      }
      
      const demoData = await response.json();
      
      // Log the demo data received from the server
      console.log('[UniversalForm] Demo data received from server:', demoData);
      console.log('[UniversalForm] Demo data keys:', Object.keys(demoData));
      console.log('[UniversalForm] Demo data sample values:', 
        Object.entries(demoData).slice(0, 3).map(([k, v]) => \`\${k}: \${v}\`));
        
      // Check if we actually received any data
      if (Object.keys(demoData).length === 0) {
        throw new Error('Server returned empty demo data. Please try again later.');
      }
      
      // Create a data object with all fields 
      const completeData: Record<string, any> = {};
      
      // First ensure all fields have a value, even if empty
      fields.forEach(field => {
        completeData[field.key] = '';
      });
      
      // Then apply any demo data that's available
      Object.entries(demoData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          completeData[key] = value;
        }
      });
      
      // Clear previous values to avoid conflicts
      form.reset({});
      
      // Wait for state updates to process
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Add a manual re-render component flag
      setForceRerender(prev => !prev);
      
      // For KY3P, Open Banking, and other form types, use the bulk update approach
      if (taskType === 'sp_ky3p_assessment' || taskType === 'open_banking' || taskType === 'open_banking_survey') {
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
          logger.warn(\`[UniversalForm] No valid responses found for auto-fill\`);
          throw new Error("No valid demo data available for auto-fill");
        }
        
        // Construct proper endpoint based on form type
        const endpoint = 
          taskType === 'sp_ky3p_assessment' 
            ? \`/api/tasks/\${taskId}/ky3p-responses/bulk\` 
            : \`/api/tasks/\${taskId}/\${taskType}-responses/bulk\`;
        
        // Use standardized format for all form types
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
          throw new Error(\`Bulk update failed: \${response.status} - \${errorText}\`);
        }
        
        const result = await response.json();
        
        // Import queryClient directly to invalidate task data queries
        const { queryClient } = await import('@/lib/queryClient');
        queryClient.invalidateQueries({ queryKey: [\`/api/tasks/\${taskId}\`] });
        queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      } else {
        // Update form service for KYB or other traditional forms
        if (formService) {
          await formService.bulkUpdate(completeData);
        }
      }
      
      // Save regular progress
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
  }, [toast, taskId, taskType, form, resetForm, updateField, refreshStatus, saveProgress, onProgress, logger]);`;

// Replace the function in the file
const updatedFile = originalFile.replace(functionMatch[0], fixedFunction);

// Write the fixed file
fs.writeFileSync('client/src/components/forms/UniversalForm.tsx', updatedFile);

console.log('Created fixed file with corrected structure');
