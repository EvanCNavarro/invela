/**
 * Demo Auto-Fill Fix API Route
 * 
 * This provides an improved API endpoint for fixing the demo auto-fill functionality
 */

import { Router } from 'express';
import * as db from '@db';
import { eq } from 'drizzle-orm';
import { tasks } from '@db/schema';
import { enhancedDemoAutoFill, getFormTypeFromTaskType } from '../services/fix-demo-autofill';

// Create router
const router = Router();

/**
 * Fixed endpoint for improved demo auto-fill across all form types
 */
router.post('/fix-demo-autofill/:taskId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    const { taskType } = req.body;
    
    if (isNaN(taskId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid task ID' 
      });
    }
    
    // Get the task from the database to verify it exists and belongs to the user
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!task) {
      return res.status(404).json({ 
        success: false, 
        message: 'Task not found' 
      });
    }
    
    // Use provided task type or get it from the task
    const effectiveTaskType = taskType || task.task_type;
    
    // Get the form type based on the task type
    const formType = getFormTypeFromTaskType(effectiveTaskType);
    
    if (!formType) {
      return res.status(400).json({ 
        success: false, 
        message: `Unsupported form type: ${effectiveTaskType}` 
      });
    }
    
    // Get user ID from session if available, otherwise use task's user_id
    const userId = req.user?.id || (task.user_id as number);
    
    console.log(`[Fix Demo Autofill] Generating demo data for task ${taskId}, type ${formType}`);
    
    // Use the enhanced demo auto-fill service
    const { success, formData, fieldCount, message } = await enhancedDemoAutoFill(taskId, formType, userId);
    
    if (!success) {
      return res.status(500).json({ 
        success: false, 
        message: message || 'Failed to generate demo data' 
      });
    }
    
    console.log(`[Fix Demo Autofill] Successfully generated ${fieldCount} demo fields for task ${taskId}`);
    
    // Return success response with form data for client-side optimization
    return res.json({
      success: true,
      message: `Successfully generated ${fieldCount} demo fields`,
      fieldCount,
      formData  // Include the form data in the response for faster client-side updating
    });
    
  } catch (error) {
    console.error('Error in fix-demo-autofill endpoint:', error);
    return res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
});

export default router;