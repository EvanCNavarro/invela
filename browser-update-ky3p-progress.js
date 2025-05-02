/**
 * Browser-based KY3P Progress Update
 * 
 * This script can be pasted into the browser console to update the progress of
 * a KY3P task directly via the API. It provides an alternative method to update
 * task progress that doesn't rely on server-side reconciliation.
 * 
 * Usage: Copy and paste this code into your browser console when on the task page.
 */

(async function() {
  // The task ID we want to update
  const TASK_ID = 694;
  
  console.log(`[Browser Update] Starting KY3P task progress update for task ${TASK_ID}`);
  
  try {
    // Step 1: Get current task information
    console.log(`[Browser Update] Fetching current task information...`);
    const taskResponse = await fetch(`/api/tasks/${TASK_ID}`);
    
    if (!taskResponse.ok) {
      throw new Error(`Failed to fetch task: ${taskResponse.status} ${taskResponse.statusText}`);
    }
    
    const task = await taskResponse.json();
    console.log(`[Browser Update] Current task state:`, {
      id: task.id,
      progress: task.progress,
      status: task.status,
      task_type: task.task_type
    });
    
    // Step 2: Send update request
    console.log(`[Browser Update] Sending direct progress update...`);
    const updateResponse = await fetch(`/api/tasks/${TASK_ID}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        progress: 100,
        status: 'ready_for_submission',
        force: true,
        source: 'browser-update'
      })
    });
    
    if (!updateResponse.ok) {
      throw new Error(`Update request failed: ${updateResponse.status} ${updateResponse.statusText}`);
    }
    
    const updateResult = await updateResponse.json();
    console.log(`[Browser Update] Progress update result:`, updateResult);
    
    // Step 3: Verify the update was successful
    console.log(`[Browser Update] Verifying task update...`);
    const verifyResponse = await fetch(`/api/tasks/${TASK_ID}`);
    
    if (!verifyResponse.ok) {
      throw new Error(`Failed to verify task: ${verifyResponse.status} ${verifyResponse.statusText}`);
    }
    
    const updatedTask = await verifyResponse.json();
    console.log(`[Browser Update] Updated task state:`, {
      id: updatedTask.id,
      progress: updatedTask.progress,
      status: updatedTask.status,
      update_successful: updatedTask.progress === 100
    });
    
    // Step 4: Notify user
    if (updatedTask.progress === 100) {
      console.log(`%c[Browser Update] SUCCESS! Task progress updated to 100%`, 'color: green; font-weight: bold');
    } else {
      console.log(`%c[Browser Update] WARNING: Progress update may have failed - current value: ${updatedTask.progress}%`, 'color: orange; font-weight: bold');
    }
    
    // Step 5: Trigger page refresh if needed
    console.log(`[Browser Update] Refreshing the UI...`);
    if (typeof window.refreshTasks === 'function') {
      window.refreshTasks();
      console.log(`[Browser Update] Tasks refreshed via API`);
    } else {
      console.log(`[Browser Update] Recommend manual page refresh for changes to appear`);
    }
    
  } catch (error) {
    console.error(`[Browser Update] Error updating task progress:`, error);
  }
})();
