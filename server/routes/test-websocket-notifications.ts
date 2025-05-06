/**
 * Test WebSocket Notifications Router
 * 
 * This router provides endpoints to test the WebSocket form submission notifications
 * without having to go through the full form submission process.
 */

import { Router } from 'express';
import { broadcastFormSubmission, broadcastTaskUpdate } from '../utils/unified-websocket';

const router = Router();

/**
 * Test form submission success notification
 */
router.post('/broadcast-form-submission', (req, res) => {
  const { taskId, formType, companyId } = req.body;
  
  // Set defaults if not provided
  const testTaskId = taskId || 620;
  const testFormType = formType || 'kyb';
  const testCompanyId = companyId || 272;
  
  try {
    // Broadcast a form submission event
    const result = broadcastFormSubmission(
      testFormType,
      testTaskId,
      testCompanyId,
      {
        fileName: 'Test_Form_Submission.pdf',
        fileId: 9999,
        submissionDate: new Date().toISOString(),
        completedActions: [
          {
            type: 'form_submission',
            description: 'Form submitted successfully',
            icon: 'check-circle'
          },
          {
            type: 'file_generation',
            description: 'PDF file generated',
            fileId: 9999,
            icon: 'file-text'
          }
        ]
      }
    );
    
    // Also broadcast a task update to ensure both types of events are received
    broadcastTaskUpdate(
      testTaskId,
      100,
      'submitted',
      {
        formType: testFormType,
        submissionComplete: true,
        fileId: 9999,
        fileName: 'Test_Form_Submission.pdf',
        submissionDate: new Date().toISOString()
      }
    );
    
    return res.json({
      success: true,
      message: 'Form submission notification broadcasted',
      result,
      taskId: testTaskId,
      formType: testFormType,
      companyId: testCompanyId
    });
  } catch (error) {
    console.error('Error broadcasting form submission notification:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to broadcast form submission notification'
    });
  }
});

/**
 * Test form submission error notification
 */
router.post('/broadcast-form-error', (req, res) => {
  const { taskId, formType, companyId } = req.body;
  
  // Set defaults if not provided
  const testTaskId = taskId || 620;
  const testFormType = formType || 'kyb';
  const testCompanyId = companyId || 272;
  
  try {
    // Broadcast a task update with error status
    const result = broadcastTaskUpdate(
      testTaskId,
      0,
      'error',
      {
        formType: testFormType,
        error: 'Test form submission error',
        submissionDate: new Date().toISOString()
      }
    );
    
    return res.json({
      success: true,
      message: 'Form error notification broadcasted',
      result,
      taskId: testTaskId,
      formType: testFormType,
      companyId: testCompanyId
    });
  } catch (error) {
    console.error('Error broadcasting form error notification:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to broadcast form error notification'
    });
  }
});

export default router;