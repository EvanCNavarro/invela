/**
 * Test WebSocket Routes
 * 
 * This module provides test endpoints for WebSocket functionality.
 * These routes are for testing purposes only and should not be used in production.
 */

import { Request, Response, Router } from 'express';
import { broadcast } from '../services/websocket';

/**
 * Create a router for WebSocket test endpoints
 */
export function createTestWebSocketRoutes(): Router {
  const router = Router();
  
  /**
   * POST /api/test/websocket/broadcast-form-submission
   * 
   * Broadcast a test form submission event via WebSocket
   */
  router.post('/broadcast-form-submission', async (req: Request, res: Response) => {
    try {
      const { taskId, formType, companyId } = req.body;
      
      if (!taskId || !formType || !companyId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: taskId, formType, or companyId'
        });
      }
      
      console.log(`[TestWebSocket] Broadcasting test form submission event: taskId=${taskId}, formType=${formType}, companyId=${companyId}`);
      
      // Simulate file generation for the test event
      const fileName = `${formType}-test-submission-${taskId}.csv`;
      const fileId = Math.floor(Math.random() * 10000) + 1;
      
      // Broadcast the test event
      broadcast('form_submitted', {
        taskId,
        formType,
        status: 'success',
        companyId,
        submissionDate: new Date().toISOString(),
        unlockedTabs: ['file-vault', 'dashboard'],
        fileName,
        fileId
      });
      
      // Return success response
      res.json({
        success: true,
        message: 'Test form submission event broadcast successfully',
        taskId,
        formType,
        companyId
      });
    } catch (error) {
      console.error('[TestWebSocket] Error broadcasting test event:', error);
      res.status(500).json({
        success: false,
        message: 'Error broadcasting test event',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  /**
   * POST /api/test/websocket/broadcast-form-error
   * 
   * Broadcast a test form submission error event via WebSocket
   */
  router.post('/broadcast-form-error', async (req: Request, res: Response) => {
    try {
      const { taskId, formType, companyId, errorMessage } = req.body;
      
      if (!taskId || !formType || !companyId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: taskId, formType, or companyId'
        });
      }
      
      console.log(`[TestWebSocket] Broadcasting test form error event: taskId=${taskId}, formType=${formType}, companyId=${companyId}`);
      
      // Broadcast the test error event
      broadcast('form_submitted', {
        taskId,
        formType,
        status: 'error',
        companyId,
        error: errorMessage || 'Test error message'
      });
      
      // Return success response
      res.json({
        success: true,
        message: 'Test form error event broadcast successfully',
        taskId,
        formType,
        companyId
      });
    } catch (error) {
      console.error('[TestWebSocket] Error broadcasting test error event:', error);
      res.status(500).json({
        success: false,
        message: 'Error broadcasting test error event',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  /**
   * POST /api/test/websocket/broadcast-in-progress
   * 
   * Broadcast a test form submission in-progress event via WebSocket
   */
  router.post('/broadcast-in-progress', async (req: Request, res: Response) => {
    try {
      const { taskId, formType, companyId } = req.body;
      
      if (!taskId || !formType || !companyId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: taskId, formType, or companyId'
        });
      }
      
      console.log(`[TestWebSocket] Broadcasting test in-progress event: taskId=${taskId}, formType=${formType}, companyId=${companyId}`);
      
      // Broadcast the test in-progress event
      broadcast('form_submitted', {
        taskId,
        formType,
        status: 'in_progress',
        companyId
      });
      
      // Return success response
      res.json({
        success: true,
        message: 'Test in-progress event broadcast successfully',
        taskId,
        formType,
        companyId
      });
    } catch (error) {
      console.error('[TestWebSocket] Error broadcasting test in-progress event:', error);
      res.status(500).json({
        success: false,
        message: 'Error broadcasting test in-progress event',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  /**
   * POST /api/test/websocket/custom-message
   * 
   * Broadcast a custom WebSocket message
   */
  router.post('/custom-message', async (req: Request, res: Response) => {
    try {
      const { type, payload } = req.body;
      
      if (!type) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: type'
        });
      }
      
      console.log(`[TestWebSocket] Broadcasting custom message type: ${type}`, payload);
      
      // Broadcast the custom message
      broadcast(type, payload || {});
      
      // Return success response
      res.json({
        success: true,
        message: `Custom message "${type}" broadcast successfully`,
        type,
        payload
      });
    } catch (error) {
      console.error('[TestWebSocket] Error broadcasting custom message:', error);
      res.status(500).json({
        success: false,
        message: 'Error broadcasting custom message',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  return router;
}