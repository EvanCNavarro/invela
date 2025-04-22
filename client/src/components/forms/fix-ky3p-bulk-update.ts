/**
 * KY3P Bulk Update Fix
 * 
 * This module provides a fixed implementation of the KY3P bulk update functionality
 * that works consistently with the existing KYB implementation.
 */

import getLogger from '@/utils/logger';

const logger = getLogger('KY3P-BulkUpdate', {
  levels: { debug: true, info: true, warn: true, error: true }
});

/**
 * Perform a bulk update for KY3P responses
 * 
 * This function implements the bulk update operation for KY3P by directly
 * using the KYB endpoint which is known to work properly.
 * 
 * @param taskId The task ID
 * @param responseData The response data (key-value pairs)
 * @returns true if successful, false otherwise
 */
export async function bulkUpdateKy3pResponses(
  taskId: number,
  responseData: Record<string, any>
): Promise<boolean> {
  if (!taskId) {
    logger.error('[KY3P Bulk Update] No task ID provided');
    return false;
  }
  
  try {
    logger.info(`[KY3P Bulk Update] Performing bulk update for task ${taskId} with ${Object.keys(responseData).length} fields`);
    
    // Use the KYB bulk-update endpoint directly - this is what WORKS
    const response = await fetch(`/api/kyb/bulk-update/${taskId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        responses: responseData
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[KY3P Bulk Update] Failed: ${response.status} ${errorText}`);
      return false;
    }
    
    // Update progress to 100%
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        progress: 100
      })
    });
    
    // Broadcast update via server API
    await fetch('/api/broadcast/task-update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        taskId,
        type: 'task_updated',
        timestamp: new Date().toISOString()
      })
    });
    
    logger.info('[KY3P Bulk Update] Successfully completed bulk update');
    return true;
  } catch (error) {
    logger.error('[KY3P Bulk Update] Error during bulk update:', error);
    return false;
  }
}