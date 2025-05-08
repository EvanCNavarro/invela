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

(function runDemo() {
  // Configuration
  const taskId = 762; // The task ID to clear
  const formType = 'kyb'; // The form type (kyb, ky3p, open_banking, etc.)
  const preserveProgress = false; // Whether to preserve progress or reset to 0%
  
  // Utility functions
  function log(message, data = null) {
    const timestamp = new Date().toISOString();
    const prefix = `%c[${timestamp}] [FormClearDemo]`;
    
    if (data !== null) {
      console.log(prefix, 'color: #4CAF50;', message, data);
    } else {
      console.log(prefix, 'color: #4CAF50;', message);
    }
  }
  
  function logError(message, error = null) {
    const timestamp = new Date().toISOString();
    const prefix = `%c[${timestamp}] [FormClearDemo] ERROR:`;
    
    if (error !== null) {
      console.error(prefix, 'color: #F44336;', message, error);
    } else {
      console.error(prefix, 'color: #F44336;', message);
    }
  }

  // Main function to broadcast form clear
  async function broadcastFormClear() {
    try {
      log(`Starting form clear broadcast for task ${taskId} (${formType})`);
      
      const operationId = `demo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      
      // 1. First make direct API call to clear the form
      const clearUrl = `/api/${formType}/clear/${taskId}${preserveProgress ? '?preserveProgress=true' : ''}`;
      
      log(`Calling API to clear fields: ${clearUrl}`);
      
      const response = await fetch(clearUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify({ 
          preserveProgress,
          resetUI: true,
          clearSections: true,
          timestamp: Date.now(),
          operationId
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${await response.text()}`);
      }
      
      const result = await response.json();
      log(`Clear API response:`, result);
      
      // 2. Now trigger WebSocket broadcast
      log(`Broadcasting clear fields event via WebSocket`);
      
      const broadcastResponse = await fetch(`/api/tasks/${taskId}/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify({
          type: 'clear_fields',
          payload: {
            taskId,
            formType,
            preserveProgress,
            resetUI: true,
            clearSections: true,
            timestamp: new Date().toISOString(),
            metadata: {
              operationId,
              source: 'browser_demo',
              initiatedAt: new Date().toISOString()
            }
          }
        })
      });
      
      if (!broadcastResponse.ok) {
        throw new Error(`Broadcast failed: ${broadcastResponse.status} ${await broadcastResponse.text()}`);
      }
      
      const broadcastResult = await broadcastResponse.json();
      log(`Broadcast response:`, broadcastResult);
      
      // 3. Add a message for demonstration purposes
      if (broadcastResult.success) {
        log(`✅ SUCCESS! WebSocket broadcast sent to ${broadcastResult.clientCount || 'all'} connected clients`);
        log(`📱 If you have other browsers/tabs open to this form, they should also clear`);
        log(`🔄 You may need to refresh this page to see the cleared state if automatic update doesn't work`);
        
        // Store the operation in window._lastClearOperation to prevent redundant operations
        window._lastClearOperation = {
          taskId,
          timestamp: Date.now(),
          formType,
          blockExpiration: Date.now() + 60000, // 60 seconds
          operationId
        };
        
        // Also store in localStorage for persistence across refreshes
        try {
          localStorage.setItem('lastClearOperation', JSON.stringify({
            taskId,
            timestamp: Date.now(),
            formType,
            blockExpiration: Date.now() + 60000,
            operationId
          }));
        } catch (e) {
          // Non-critical error
          logError('Error storing operation info in localStorage', e);
        }
      } else {
        logError('Broadcast appeared successful but returned success: false');
      }
    } catch (error) {
      logError('Error in broadcasting form clear', error);
    }
  }

  // Check if we're on a form page before proceeding
  const currentPathname = window.location.pathname;
  if (!currentPathname.includes('/tasks/') && !currentPathname.includes('/forms/')) {
    logError('This script should be run from a form page.');
    return;
  }
  
  // Explanation of what's happening
  log('=== Form Clear WebSocket Demo ===');
  log(`This script will clear the form for task ${taskId} (${formType})`);
  log(`preserveProgress = ${preserveProgress}`);
  log('');
  log('The clear operation will be broadcast to all connected clients');
  log('This demonstrates the WebSocket-based form clearing solution');
  log('');
  
  // Start the demo
  broadcastFormClear();
})();