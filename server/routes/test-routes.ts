/**
 * Test Routes
 * 
 * This file contains routes used for testing and development purposes only.
 * These routes should not be exposed in production.
 */

import { Request, Response, Router } from 'express';
import { broadcastFormSubmission } from '../services/websocket';

/**
 * Create and return the router for test routes
 */
export function createTestRouter(): Router {
  const router = Router();
  
  /**
   * GET /api/test/form-submission/broadcast
   * 
   * Test endpoint to manually broadcast form submission events
   */
  router.get('/form-submission/broadcast', (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.query.taskId as string) || 690; // Default to KY3P task
      const formType = req.query.formType as string || 'ky3p'; // Default to KY3P form
      const companyId = parseInt(req.query.companyId as string) || 255; // Default company
      const status = (req.query.status as 'success' | 'error' | 'in_progress') || 'success';
      
      console.log(`[Test] Broadcasting form submission ${status} event...`, {
        taskId, formType, companyId, status
      });
      
      // Add appropriate data based on status
      const data: any = {
        submissionDate: new Date().toISOString()
      };
      
      if (status === 'success') {
        data.unlockedTabs = ['file_vault', 'risk_assessment'];
        data.fileName = `${formType.toUpperCase()}_Submission_${taskId}.csv`;
        data.fileId = 1234;
      } 
      else if (status === 'error') {
        data.error = 'This is a test error message';
      }
      
      // Broadcast the event
      broadcastFormSubmission(taskId, formType, status, companyId, data);
      
      res.json({
        success: true,
        message: `Form submission ${status} event broadcast sent`,
        details: {
          taskId,
          formType,
          status,
          companyId,
          data
        }
      });
    } catch (error) {
      console.error('[Test] Error broadcasting form submission event:', error);
      res.status(500).json({
        success: false,
        message: 'Error broadcasting form submission event',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}