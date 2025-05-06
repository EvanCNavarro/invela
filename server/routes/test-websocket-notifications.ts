/**
 * Test WebSocket Notifications Router
 * 
 * This router provides endpoints to test the WebSocket form submission notifications
 * without having to go through the full form submission process.
 */

import { Router } from 'express';
import { broadcastFormSubmission, broadcastTaskUpdate } from '../utils/unified-websocket';
import { sendFormSubmissionSuccess, sendFormSubmissionError, sendFormSubmissionInProgress } from '../utils/form-submission-notifications';

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
  const { taskId, formType, companyId, error } = req.body;
  
  // Set defaults if not provided
  const testTaskId = taskId || 620;
  const testFormType = formType || 'kyb';
  const testCompanyId = companyId || 272;
  const errorMessage = error || 'Test form submission error';
  
  try {
    // Use the standardized form error notification
    const result = sendFormSubmissionError({
      taskId: testTaskId,
      formType: testFormType,
      companyId: testCompanyId,
      error: errorMessage,
      message: errorMessage,
      progress: 0
    });
    
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

/**
 * Test form in-progress notification
 */
router.post('/broadcast-form-in-progress', (req, res) => {
  const { taskId, formType, companyId, progress } = req.body;
  
  // Set defaults if not provided
  const testTaskId = taskId || 620;
  const testFormType = formType || 'kyb';
  const testCompanyId = companyId || 272;
  const progressValue = progress || 50;
  
  try {
    // Use the standardized form in-progress notification
    const result = sendFormSubmissionInProgress({
      taskId: testTaskId,
      formType: testFormType,
      companyId: testCompanyId,
      progress: progressValue,
      message: `Form submission in progress (${progressValue}%)`,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
    
    return res.json({
      success: true,
      message: 'Form in-progress notification broadcasted',
      result,
      taskId: testTaskId,
      formType: testFormType,
      companyId: testCompanyId,
      progress: progressValue
    });
  } catch (error) {
    console.error('Error broadcasting form in-progress notification:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to broadcast form in-progress notification'
    });
  }
});

/**
 * Test form success notification using the new standardized system
 */
router.post('/broadcast-form-success', (req, res) => {
  const { taskId, formType, companyId, fileId, fileName, unlockedTabs } = req.body;
  
  // Set defaults if not provided
  const testTaskId = taskId || 620;
  const testFormType = formType || 'kyb';
  const testCompanyId = companyId || 272;
  const testFileId = fileId || 9999;
  const testFileName = fileName || 'Test_Form_Submission.pdf';
  const testUnlockedTabs = unlockedTabs || ['file-vault', 'dashboard'];
  
  try {
    // Use the standardized form success notification
    const result = sendFormSubmissionSuccess({
      taskId: testTaskId,
      formType: testFormType,
      companyId: testCompanyId,
      fileId: testFileId,
      fileName: testFileName,
      submissionDate: new Date().toISOString(),
      unlockedTabs: testUnlockedTabs,
      metadata: {
        submissionComplete: true,
        timestamp: new Date().toISOString()
      }
    });
    
    return res.json({
      success: true,
      message: 'Form success notification broadcasted',
      result,
      taskId: testTaskId,
      formType: testFormType,
      companyId: testCompanyId,
      fileId: testFileId,
      fileName: testFileName,
      unlockedTabs: testUnlockedTabs
    });
  } catch (error) {
    console.error('Error broadcasting form success notification:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to broadcast form success notification'
    });
  }
});

export default router;