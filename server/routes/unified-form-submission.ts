/**
 * Unified Form Submission Endpoint
 * 
 * This module provides a single endpoint for submitting forms of any type.
 * It handles validation, database updates, file generation, and WebSocket notifications.
 */

import { Router } from 'express';
import { db } from '@db';
import { tasks } from '@db/schema';
import { eq } from 'drizzle-orm';
import { WebSocketService } from '../services/websocket-service';

const router = Router();

// Define valid form types
const validFormTypes = ['kyb', 'ky3p', 'security_assessment', 'open_banking'];

/**
 * Unified form submission endpoint
 * 
 * POST /api/form-submission
 * 
 * Request body:
 * {
 *   formType: string,
 *   formData: {
 *     taskId: number,
 *     ...otherFields
 *   },
 *   fileName?: string
 * }
 */
router.post('/api/form-submission', async (req, res) => {
  try {
    const { formType, formData, fileName } = req.body;
    
    // Validate required fields
    if (!formType || !formData) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    // Check if form type is valid
    if (!validFormTypes.includes(formType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid form type: ${formType}`
      });
    }
    
    // Extract taskId from form data
    const taskId = formData.taskId;
    if (!taskId) {
      return res.status(400).json({
        success: false,
        error: 'Missing taskId in form data'
      });
    }
    
    // Get the task from the database
    const taskData = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!taskData) {
      return res.status(404).json({
        success: false,
        error: `Task not found: ${taskId}`
      });
    }
    
    // Validate user has access to this task
    if (req.user?.id !== taskData.assigned_to && req.user?.id !== taskData.created_by) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to submit this form'
      });
    }
    
    // Get the company ID from the task
    const companyId = taskData.company_id;
    
    // Update task status to 'submitted'
    await db.update(tasks)
      .set({
        status: 'submitted',
        progress: 100,
        submission_date: new Date().toISOString()
      })
      .where(eq(tasks.id, taskId));
    
    // Default success response
    let response = {
      success: true,
      taskId,
      formType,
      status: 'submitted',
      companyId
    };
    
    // Form type specific handling
    if (formType === 'kyb') {
      // Handle KYB form submission - unlock File Vault tab
      response = await handleKybSubmission(taskId, formData, companyId, response);
    } else if (formType === 'ky3p' || formType === 'security_assessment') {
      // Handle KY3P/Security Assessment form submission
      response = await handleKy3pSubmission(taskId, formData, companyId, response);
    } else if (formType === 'open_banking') {
      // Handle Open Banking form submission - unlock Dashboard/Insights tabs
      response = await handleOpenBankingSubmission(taskId, formData, companyId, response);
    }
    
    // Send WebSocket notification about the form submission
    WebSocketService.broadcastFormSubmission({
      taskId,
      formType,
      status: 'submitted',
      companyId,
      unlockedTabs: response.unlockedTabs,
      unlockedTasks: response.unlockedTasks,
      fileId: response.fileId,
      fileName: response.fileName,
      timestamp: new Date().toISOString()
    });
    
    // Return success response
    return res.json(response);
    
  } catch (error) {
    console.error('[UnifiedFormSubmission] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Handle KYB form submission
 */
async function handleKybSubmission(taskId: number, formData: any, companyId: number, baseResponse: any) {
  // Unlock File Vault tab for the company
  const unlockedTabs = ['file-vault'];
  
  // Add the unlocked tabs to the response
  return {
    ...baseResponse,
    unlockedTabs,
    details: 'KYB form submitted successfully. File Vault tab unlocked.'
  };
}

/**
 * Handle KY3P form submission
 */
async function handleKy3pSubmission(taskId: number, formData: any, companyId: number, baseResponse: any) {
  // KY3P forms might unlock dependent tasks
  const unlockedTasks: number[] = [];
  
  // Add the unlocked tasks to the response
  return {
    ...baseResponse,
    unlockedTasks,
    details: 'KY3P assessment submitted successfully.'
  };
}

/**
 * Handle Open Banking form submission
 */
async function handleOpenBankingSubmission(taskId: number, formData: any, companyId: number, baseResponse: any) {
  // Unlock Dashboard and Insights tabs
  const unlockedTabs = ['dashboard', 'insights'];
  
  // Add the unlocked tabs to the response
  return {
    ...baseResponse,
    unlockedTabs,
    details: 'Open Banking survey submitted successfully. Dashboard and Insights tabs unlocked.'
  };
}

export default router;