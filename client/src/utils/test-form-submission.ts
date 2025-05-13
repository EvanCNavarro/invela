/**
 * Test Form Submission Helper
 * 
 * This utility provides functions to test the form submission WebSocket events
 * without going through the actual form submission process.
 * 
 * Use this for debugging form submission events and UI components that
 * respond to these events.
 */

import { toast } from '@/hooks/use-toast';

/**
 * Test a form submission success event
 * 
 * @param taskId The task ID to use in the test (optional, defaults to 690)
 * @param formType The form type to use (optional, defaults to 'kyb')
 */
export async function testFormSubmissionSuccess(taskId = 690, formType = 'kyb') {
  try {
    const response = await fetch('/api/test/websocket/broadcast-form-success', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId,
        formType,
        fileId: 9999, // Test file ID
        fileName: 'Test_Form_Submission.pdf',
        unlockedTabs: ['file-vault', 'dashboard']
      }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      toast({
        title: 'Success',
        description: `Test form submission success event sent for ${formType} task ${taskId}`,
        variant: 'success',
      });
    } else {
      toast({
        title: 'Error',
        description: data.error || 'Failed to send test event',
        variant: 'destructive',
      });
    }
    
    return data;
  } catch (error) {
    console.error('Error sending test form submission:', error);
    toast({
      title: 'Error',
      description: 'Failed to send test form submission event',
      variant: 'destructive',
    });
    return { success: false, error };
  }
}

/**
 * Test a form submission error event
 * 
 * @param taskId The task ID to use in the test (optional, defaults to 690)
 * @param formType The form type to use (optional, defaults to 'kyb')
 * @param errorMessage The error message to include (optional)
 */
export async function testFormSubmissionError(taskId = 690, formType = 'kyb', errorMessage?: string) {
  try {
    const response = await fetch('/api/test/websocket/broadcast-form-error', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId,
        formType,
        error: errorMessage || 'Test form submission error'
      }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      toast({
        title: 'Success',
        description: `Test form submission error event sent for ${formType} task ${taskId}`,
        variant: 'success',
      });
    } else {
      toast({
        title: 'Error',
        description: data.error || 'Failed to send test event',
        variant: 'destructive',
      });
    }
    
    return data;
  } catch (error) {
    console.error('Error sending test form submission error:', error);
    toast({
      title: 'Error',
      description: 'Failed to send test form submission error event',
      variant: 'destructive',
    });
    return { success: false, error };
  }
}

/**
 * Test a form submission in-progress event
 * 
 * @param taskId The task ID to use in the test (optional, defaults to 690)
 * @param formType The form type to use (optional, defaults to 'kyb')
 * @param progress The progress value to include (optional, defaults to 50)
 */
export async function testFormSubmissionInProgress(taskId = 690, formType = 'kyb', progress = 50) {
  try {
    const response = await fetch('/api/test/websocket/broadcast-form-in-progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId,
        formType,
        progress
      }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      toast({
        title: 'Success',
        description: `Test form submission in-progress (${progress}%) event sent for ${formType} task ${taskId}`,
        variant: 'success',
      });
    } else {
      toast({
        title: 'Error',
        description: data.error || 'Failed to send test event',
        variant: 'destructive',
      });
    }
    
    return data;
  } catch (error) {
    console.error('Error sending test form submission in-progress:', error);
    toast({
      title: 'Error',
      description: 'Failed to send test form submission in-progress event',
      variant: 'destructive',
    });
    return { success: false, error };
  }
}