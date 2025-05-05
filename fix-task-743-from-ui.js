/**
 * Fix for KY3P Task 743 Progress Reset Issue - UI Version
 * 
 * This script is designed to be run from the browser console to forcibly
 * update task 743 progress and prevent it from resetting to 0% during
 * task center reconciliation.
 * 
 * Usage: Copy and paste this script into your browser's developer console
 * while logged into the application, and the fix will be applied immediately.
 */

// ANSI color codes for formatted console output
const style = {
  reset: 'color: inherit; font-weight: normal;',
  title: 'color: #3b82f6; font-weight: bold; font-size: 16px;',
  subtitle: 'color: #10b981; font-weight: bold;',
  success: 'color: #10b981; font-weight: bold;',
  info: 'color: #3b82f6;',
  warning: 'color: #f59e0b; font-weight: bold;',
  error: 'color: #ef4444; font-weight: bold;',
  code: 'color: #6366f1; background: #f1f5f9; padding: 2px 4px; border-radius: 2px;',
  highlight: 'background: #fef3c7; padding: 2px 4px; border-radius: 2px;'
};

// Helper function for styled logging
const log = {
  title: (msg) => console.log(`%c${msg}`, style.title),
  subtitle: (msg) => console.log(`%c${msg}`, style.subtitle),
  success: (msg) => console.log(`%c✅ ${msg}`, style.success),
  info: (msg) => console.log(`%c${msg}`, style.info),
  warning: (msg) => console.log(`%c⚠️ ${msg}`, style.warning),
  error: (msg) => console.log(`%c❌ ${msg}`, style.error),
  code: (msg) => console.log(`%c${msg}`, style.code),
  highlight: (msg) => console.log(`%c${msg}`, style.highlight),
  divider: () => console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
};

// Default taskId to fix 
const DEFAULT_TASK_ID = 743;

/**
 * Main fix function that can be run directly from the browser console
 */
async function fixKy3pTaskProgress(taskId = DEFAULT_TASK_ID) {
  log.title('🛠️ KY3P Task Progress Fix Tool');
  log.divider();
  log.info(`Starting fix for task ${taskId}...`);
  
  try {
    // First, get the current task state
    log.info('Fetching task details...');
    
    const taskResponse = await fetch(`/api/tasks/${taskId}`);
    
    if (!taskResponse.ok) {
      log.error(`Could not retrieve task ${taskId}. HTTP status ${taskResponse.status}`);
      return;
    }
    
    const task = await taskResponse.json();
    
    log.success(`Retrieved task: ${task.title}`);
    log.info(`Current progress: ${task.progress}%`);
    log.info(`Current status: ${task.status}`);
    
    // Ensure metadata has required fields
    const metadata = {
      ...task.metadata || {},
      locked: false,
      prerequisite_completed: true,
      prerequisite_completed_at: new Date().toISOString(),
      previousProgress: task.progress,
      previousStatus: task.status,
      lastProgressUpdate: new Date().toISOString()
    };
    
    // Create the update payload
    const updatePayload = {
      ...task,
      metadata
    };
    
    // Update the task via API
    log.info('Updating task with fixed metadata...');
    
    const updateResponse = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatePayload)
    });
    
    if (!updateResponse.ok) {
      log.error(`Failed to update task. HTTP status ${updateResponse.status}`);
      return;
    }
    
    const updatedTask = await updateResponse.json();
    
    log.success('Task updated successfully!');
    log.info(`Updated progress: ${updatedTask.progress}%`);
    log.info(`Updated status: ${updatedTask.status}`);
    
    // Now we need to force the client-side cache to refresh
    log.info('Refreshing client-side task cache...');
    
    // This assumes you're using TanStack Query with queryKey ['/api/tasks']
    // We need to get access to the queryClient to invalidate the cache
    if (window.__NUXT__ && window.__NUXT__.state && window.__NUXT__.state.queryClient) {
      window.__NUXT__.state.queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      log.success('Client cache invalidated successfully!');
    } else if (window.__NEXT_DATA__ && window.queryClient) {
      window.queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      log.success('Client cache invalidated successfully!');
    } else if (window.queryClient) {
      window.queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      log.success('Client cache invalidated successfully!');
    } else {
      log.warning('Could not access queryClient. Please refresh the page manually.');
    }
    
    log.divider();
    log.success('Fix applied successfully! 🎉');
    log.info('The task should now maintain its progress during reconciliation.');
    log.info('You may need to refresh the page to see the changes.');
    
    return updatedTask;
  } catch (error) {
    log.divider();
    log.error(`Error applying fix: ${error.message}`);
    console.error(error);
  }
}

// Run the fix when this script is pasted into the console
fixKy3pTaskProgress();
