/**
 * Form Clear WebSocket Demo
 * 
 * This script demonstrates how to use the WebSocket server to trigger form clearing
 * across all connected clients. It can be run directly from the browser console
 * to test the cross-client synchronization.
 * 
 * Usage:
 * 1. Run this script in the browser console while viewing a form
 * 2. Observe that the form is cleared in this browser tab
 * 3. If you have other tabs/devices open to the same form, they should also clear
 */

(async function() {
  // Get the current task ID and form type from the URL or page context
  function getTaskContext() {
    // Try to get from URL first (most reliable)
    const urlParams = new URLSearchParams(window.location.search);
    const taskId = urlParams.get('taskId') || urlParams.get('id');
    
    // If we can't get from URL, check the document for task info
    if (!taskId) {
      // Try to find task ID in the page context (this is application specific)
      const taskIdElement = document.querySelector('[data-task-id]');
      if (taskIdElement) {
        return {
          taskId: taskIdElement.getAttribute('data-task-id'),
          formType: taskIdElement.getAttribute('data-form-type') || guessFormType()
        };
      }
      
      // Last resort - ask the user
      const manualTaskId = prompt("Enter the task ID:");
      if (manualTaskId) {
        return {
          taskId: manualTaskId,
          formType: guessFormType() || prompt("Enter the form type (kyb, ky3p, open_banking, card):")
        };
      }
      
      throw new Error("Could not determine task ID");
    }
    
    return {
      taskId: parseInt(taskId),
      formType: guessFormType()
    };
  }
  
  // Try to guess the form type from the URL
  function guessFormType() {
    const path = window.location.pathname.toLowerCase();
    
    if (path.includes('kyb')) return 'kyb';
    if (path.includes('ky3p')) return 'ky3p';
    if (path.includes('open-banking') || path.includes('openbanking')) return 'open_banking';
    if (path.includes('card')) return 'card';
    
    // Default to KYB as the most common form type
    return 'kyb';
  }
  
  function log(message, data = null) {
    const styles = "padding: 2px 5px; border-radius: 3px; color: white; background: #2196F3; font-weight: bold;";
    if (data) {
      console.log(`%c[FormClearDemo] ${message}`, styles, data);
    } else {
      console.log(`%c[FormClearDemo] ${message}`, styles);
    }
  }
  
  function logError(message, error = null) {
    const styles = "padding: 2px 5px; border-radius: 3px; color: white; background: #F44336; font-weight: bold;";
    if (error) {
      console.error(`%c[FormClearDemo] ${message}`, styles, error);
    } else {
      console.error(`%c[FormClearDemo] ${message}`, styles);
    }
  }
  
  async function broadcastFormClear() {
    try {
      // Get the task context 
      const { taskId, formType } = getTaskContext();
      
      if (!taskId || !formType) {
        logError("Missing task ID or form type");
        return;
      }
      
      log(`Broadcasting clear_fields for task ${taskId} (${formType})`);
      
      // Use our task broadcast endpoint to send the clear_fields event
      const response = await fetch(`/api/tasks/${taskId}/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'clear_fields',
          payload: {
            formType: formType,
            preserveProgress: false,
            resetUI: true,
            clearSections: true,
            metadata: {
              source: 'browser-demo',
              timestamp: new Date().toISOString(),
              operationId: `demo_${Date.now()}`
            }
          }
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to broadcast clear_fields: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const result = await response.json();
      log("Successfully broadcast clear_fields event", result);
      
      return result;
    } catch (error) {
      logError("Error broadcasting form clear", error);
      throw error;
    }
  }
  
  // Execute the broadcast
  try {
    const result = await broadcastFormClear();
    log("Form clear broadcast complete", result);
  } catch (error) {
    logError("Form clear broadcast failed", error);
  }
})();