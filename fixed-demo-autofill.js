/**
 * Fixed implementation of KY3P Demo Auto-Fill 
 * 
 * This implementation uses a completely standalone approach that bypasses the
 * form service entirely for KY3P forms, while preserving the existing approach
 * for other form types.
 */

// 1. Create the endpoint in server/routes/ky3p.ts:
router.post('/api/ky3p/apply-demo-data/:taskId', requireAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    
    if (!taskId || isNaN(parseInt(taskId, 10))) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid task ID format' 
      });
    }
    
    const numericTaskId = parseInt(taskId, 10);
    
    // Get the task to verify access and get company info
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, numericTaskId))
      .limit(1);
      
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    // Security check: verify user has access to this task
    if (req.user.company_id !== task.company_id) {
      logger.error('Security violation: User attempted to access task from another company', {
        userId: req.user.id,
        userCompanyId: req.user.company_id,
        taskId,
        taskCompanyId: task.company_id
      });
      
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this task'
      });
    }
    
    // Get company information
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, task.company_id))
      .limit(1);
      
    // Ensure company is a demo company
    if (!company || company.is_demo !== true) {
      return res.status(403).json({
        success: false,
        message: 'Auto-fill is only available for demo companies'
      });
    }
    
    // Get all KY3P fields
    const fields = await db
      .select()
      .from(ky3pFields);
      
    const demoData = {};
    let successCount = 0;
    let errorCount = 0;
    
    // Process each field
    for (const field of fields) {
      if (!field.demo_autofill) continue;
      
      try {
        // Process demo data value, replacing any company name references
        let demoValue = field.demo_autofill;
        
        // Replace company name placeholder if needed
        if (typeof demoValue === 'string' && demoValue.includes('{{COMPANY_NAME}}') && company) {
          demoValue = demoValue.replace('{{COMPANY_NAME}}', company.name);
        }
        
        // Add to demo data object for UI display
        demoData[field.field_key] = demoValue;
        
        // Check if response already exists
        const [existingResponse] = await db
          .select()
          .from(ky3pResponses)
          .where(
            and(
              eq(ky3pResponses.task_id, numericTaskId),
              eq(ky3pResponses.field_id, field.id)
            )
          )
          .limit(1);
          
        // Insert or update the response
        if (existingResponse) {
          // Update existing response
          await db
            .update(ky3pResponses)
            .set({
              response_value: demoValue,
              status: 'COMPLETE',
              updated_at: new Date()
            })
            .where(eq(ky3pResponses.id, existingResponse.id));
        } else {
          // Insert new response
          await db
            .insert(ky3pResponses)
            .values({
              task_id: numericTaskId,
              field_id: field.id,
              response_value: demoValue,
              status: 'COMPLETE',
              created_at: new Date(),
              updated_at: new Date()
            });
        }
        
        successCount++;
      } catch (error) {
        logger.error(`[KY3P API] Error applying demo data for field ${field.field_key}:`, error);
        errorCount++;
      }
    }
    
    // Calculate progress and update task status
    const progress = Math.min(100, Math.round((successCount / fields.length) * 100));
    
    // Update task progress and status
    await db
      .update(tasks)
      .set({
        progress,
        status: progress >= 100 ? 'complete' : 'in_progress',
        updated_at: new Date()
      })
      .where(eq(tasks.id, numericTaskId));
      
    // Get updated task
    const [updatedTask] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, numericTaskId))
      .limit(1);
    
    // Send success response
    res.json({
      success: true,
      message: 'Demo data applied successfully',
      successCount,
      errorCount,
      progress,
      status: updatedTask.status,
      data: demoData
    });
    
    // Try to broadcast the update via WebSocket
    try {
      const { WebSocket } = await import('ws');
      const wsClient = new WebSocket('ws://localhost:5000/ws');
      
      wsClient.on('open', () => {
        const broadcastMessage = {
          type: 'task_update',
          payload: {
            taskId: numericTaskId,
            companyId: task.company_id,
            progress,
            status: updatedTask.status,
            timestamp: new Date().toISOString()
          }
        };
        
        wsClient.send(JSON.stringify(broadcastMessage));
        wsClient.close();
        logger.info(`[KY3P API] Broadcast sent for task ${taskId} update`);
      });
      
      wsClient.on('error', (err) => {
        logger.error(`[KY3P API] WebSocket broadcast error:`, err);
      });
    } catch (wsError) {
      logger.error(`[KY3P API] Failed to broadcast task update:`, wsError);
    }
  } catch (error) {
    logger.error('[KY3P API] Error in apply-demo-data endpoint:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while applying demo data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 2. Modified handleDemoAutoFill function in UniversalForm.tsx
// This is a completely fresh implementation for just KY3P form demo auto-fill
const handleKY3PAutoFill = async () => {
  try {
    // Call the direct API endpoint
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
        return false;
      }
      
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to apply demo data');
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to apply demo data');
    }
    
    // Reset form to clear existing values
    if (resetForm) {
      resetForm();
    }
    
    // Wait for form to reset
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Update UI with the values from the response
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
    
    // Refresh queries
    const queryClient = useQueryClient();
    queryClient.invalidateQueries([`/api/tasks/${taskId}`]);
    queryClient.invalidateQueries(['/api/tasks']);
    queryClient.invalidateQueries(['/api/ky3p/progress']);
    
    // Success toast
    toast({
      title: "Auto-Fill Complete",
      description: `Applied demo data to ${result.successCount} fields`,
      duration: 3000,
    });
    
    // Refresh status
    if (refreshStatus) {
      refreshStatus();
    }
    
    // Update progress to 100%
    if (onProgress) {
      onProgress(100);
    }
    
    return true;
  } catch (error) {
    console.error('[UniversalForm] Error in KY3P demo auto-fill:', error);
    toast({
      variant: "destructive",
      title: "Auto-Fill Failed",
      description: error instanceof Error ? error.message : "Failed to auto-fill form"
    });
    return false;
  }
};