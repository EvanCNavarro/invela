/**
 * Test Form Submission Routes
 * 
 * This module provides test endpoints for simulating form submissions
 * and testing the WebSocket notification system.
 */

import { Router, Request, Response } from 'express';
import { broadcastFormSubmission } from '../services/websocket';

/**
 * Create and return the router for test form submission endpoints
 */
export function createTestFormSubmissionRouter(): Router {
  const router = Router();
  
  /**
   * GET /api/test/form-submission/broadcast
   * 
   * Broadcast a simulated form submission event for testing
   * 
   * Query params:
   * - taskId: ID of the task
   * - formType: Type of form (kyb, ky3p, open_banking, etc.)
   * - companyId: ID of the company
   * - status: Status of the submission (success, error, in_progress)
   */
  router.get('/form-submission/broadcast', (req: Request, res: Response) => {
    const taskId = parseInt(req.query.taskId as string) || 0;
    const formType = req.query.formType as string || 'unknown';
    const companyId = parseInt(req.query.companyId as string) || 0;
    const status = req.query.status as 'success' | 'error' | 'in_progress' || 'success';
    
    console.log(`[TestFormSubmission] Broadcasting ${status} event for task ${taskId} (${formType})`);
    
    // Create payload based on status
    let payload: Record<string, any> = {
      submissionDate: new Date().toISOString()
    };
    
    if (status === 'success') {
      payload = {
        ...payload,
        unlockedTabs: ['file_vault', 'risk_assessment'],
        fileName: `${formType.toUpperCase()}_Submission_${taskId}_${Date.now()}.csv`,
        fileId: Math.floor(Math.random() * 10000) + 1
      };
    } else if (status === 'error') {
      payload = {
        ...payload,
        error: 'Simulated submission error for testing'
      };
    }
    
    // Broadcast the event
    broadcastFormSubmission(
      taskId,
      formType,
      status,
      companyId,
      payload
    );
    
    // Return success response
    res.json({
      success: true,
      message: `Form submission ${status} event broadcast for task ${taskId}`,
      taskId,
      formType,
      status,
      companyId,
      payload
    });
  });
  
  /**
   * POST /api/test/form-submission/simulate
   * 
   * Simulate a complete form submission including database updates
   */
  router.post('/form-submission/simulate', (req: Request, res: Response) => {
    const { taskId, formType, companyId } = req.body;
    
    if (!taskId || !formType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: taskId and formType'
      });
    }
    
    console.log(`[TestFormSubmission] Simulating complete form submission for task ${taskId} (${formType})`);
    
    // First send in-progress notification
    broadcastFormSubmission(
      taskId,
      formType,
      'in_progress',
      companyId || 0,
      { submissionDate: new Date().toISOString() }
    );
    
    // Simulate processing delay
    setTimeout(() => {
      // Then send success notification
      broadcastFormSubmission(
        taskId,
        formType,
        'success',
        companyId || 0,
        {
          submissionDate: new Date().toISOString(),
          unlockedTabs: ['file_vault', 'risk_assessment', 'dashboard'],
          fileName: `${formType.toUpperCase()}_Submission_${taskId}_${Date.now()}.csv`,
          fileId: Math.floor(Math.random() * 10000) + 1
        }
      );
      
      console.log(`[TestFormSubmission] Completed simulated submission for task ${taskId}`);
    }, 2000);
    
    // Return success response immediately
    res.json({
      success: true,
      message: `Form submission simulation started for task ${taskId}`,
      taskId,
      formType,
      status: 'in_progress'
    });
  });
  
  return router;
}